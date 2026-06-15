#!/usr/bin/env node
import { setTimeout as delay } from 'node:timers/promises';

const DEFAULT_CONTENT_URLS = [
  'http://localhost:3000/thien/api/content',
  'https://daily-magic.d.energie.check24.de/thien/api/content',
];
const DEFAULT_WS_URLS = [
  'ws://localhost:3000/thien/ws',
  'wss://daily-magic.d.energie.check24.de/thien/ws',
];

const args = new Set(process.argv.slice(2));
const actionReminders = args.has('--send-action-reminders') || process.env.DAILY_MAGIC_WATCHDOG_ACTION_REMINDERS === '1';
const dryRun = args.has('--dry-run') || (!args.has('--send-reminders') && !actionReminders);
const once = args.has('--once');
const jsonOutput = args.has('--json');

const config = {
  contentUrls: envList('DAILY_MAGIC_CONTENT_URLS', DEFAULT_CONTENT_URLS),
  wsUrls: envList('DAILY_MAGIC_WS_URLS', DEFAULT_WS_URLS),
  pollMs: envInt('DAILY_MAGIC_WATCHDOG_POLL_MS', 30_000),
  heartbeatGraceMs: envInt('DAILY_MAGIC_WATCHDOG_HEARTBEAT_GRACE_MS', 90_000),
  statusGraceMs: envInt('DAILY_MAGIC_WATCHDOG_STATUS_GRACE_MS', 120_000),
  actionStaleMs: envInt('DAILY_MAGIC_WATCHDOG_ACTION_STALE_MS', 300_000),
  reminderCooldownMs: envInt('DAILY_MAGIC_WATCHDOG_REMINDER_COOLDOWN_MS', 600_000),
  agentId: process.env.DAILY_MAGIC_WATCHDOG_AGENT_ID || 'daily-magic-report-watchdog',
  actorName: process.env.DAILY_MAGIC_WATCHDOG_ACTOR_NAME || 'Daily Magic Report Watchdog',
};

const state = {
  agents: new Map(),
  threads: new Map(),
  sentReminders: new Map(),
  wsReady: false,
};

main().catch((error) => {
  console.error(`[watchdog] ${error.stack || error.message}`);
  process.exitCode = 1;
});

async function main() {
  const snapshot = await fetchContent();
  ingestSnapshot(snapshot);

  if (once) {
    const findings = evaluate();
    await maybeSendReminders(findings);
    printFindings(findings);
    return;
  }

  connectWebSocketLoop();

  while (true) {
    await sendHeartbeat();
    const findings = evaluate();
    await maybeSendReminders(findings);
    printFindings(findings);
    await delay(config.pollMs);
    try {
      ingestSnapshot(await fetchContent());
    } catch (error) {
      warn(`content refresh failed: ${error.message}`);
    }
  }
}

function envList(name, fallback) {
  return String(process.env[name] || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
    .concat(process.env[name] ? [] : fallback);
}

function envInt(name, fallback) {
  const value = Number.parseInt(process.env[name] || '', 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

async function fetchContent() {
  let lastError;
  for (const url of config.contentUrls) {
    try {
      const response = await fetch(url, { headers: { accept: 'application/json' } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error('No Daily Magic content URLs configured.');
}

function connectWebSocketLoop() {
  void (async () => {
    while (true) {
      try {
        await connectWebSocket();
      } catch (error) {
        state.wsReady = false;
        warn(`websocket disconnected: ${error.message}`);
        await delay(5000);
      }
    }
  })();
}

async function connectWebSocket() {
  let lastError;
  for (const url of config.wsUrls) {
    try {
      await new Promise((resolve, reject) => {
        const socket = new WebSocket(url);
        const timer = setTimeout(() => reject(new Error(`timeout connecting to ${url}`)), 5000);
        let opened = false;
        socket.addEventListener('open', () => {
          opened = true;
          clearTimeout(timer);
          state.wsReady = true;
          log(`listening on ${url}`);
        });
        socket.addEventListener('message', (event) => ingestEvent(parseJson(event.data)));
        socket.addEventListener('error', () => {
          const error = new Error(opened ? `connection error on ${url}` : `could not connect to ${url}`);
          if (opened) resolve();
          else reject(error);
        });
        socket.addEventListener('close', () => {
          state.wsReady = false;
          if (opened) resolve();
          else reject(new Error(`closed ${url}`));
        });
      });
      return;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error('No Daily Magic WebSocket URLs configured.');
}

function parseJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function ingestSnapshot(snapshot) {
  const threads = snapshot?.content?.actionThreads || snapshot?.actionThreads || [];
  for (const thread of threads) {
    if (!thread?.threadId) continue;
    state.threads.set(thread.threadId, normalizeThread(thread));
    const latest = latestAction(thread);
    if (latest) ingestAction(latest, thread);
  }

  for (const heartbeat of snapshot?.content?.agentHeartbeats || snapshot?.agentHeartbeats || []) {
    ingestHeartbeat(heartbeat);
  }
}

function ingestEvent(event) {
  if (!event || typeof event !== 'object') return;
  const payload = event.payload || {};
  if (event.type === 'agent.heartbeat') ingestHeartbeat(payload);
  if (event.type === 'work-status.update') ingestStatus(payload);
  if (event.type === 'agent.action') ingestAction(payload);
  if (event.type === 'agent.claimed' || event.type === 'agent.claim') ingestClaim(payload);
}

function normalizeThread(thread) {
  return {
    threadId: thread.threadId,
    category: thread.category,
    ownerName: thread.owner?.name || thread.ownerName || '',
    status: thread.status || '',
    summary: thread.summary || '',
    updatedAt: timeValue(thread.updatedAt || thread.createdAt),
    latestActionId: latestAction(thread)?.actionId || thread.rootActionId || '',
  };
}

function latestAction(thread) {
  const actions = Array.isArray(thread.actions) ? thread.actions : [];
  return actions
    .filter((action) => action?.actionId)
    .sort((a, b) => timeValue(b.createdAt) - timeValue(a.createdAt))[0] || null;
}

function ingestHeartbeat(payload) {
  const id = actorId(payload.actor || payload);
  if (!id) return;
  const agent = ensureAgent(id, payload.actor || payload);
  agent.lastHeartbeatAt = Date.now();
}

function ingestStatus(payload) {
  const id = payload.runId || payload.actor?.agentId || payload.actor?.name || payload.appName;
  if (!id) return;
  const agent = ensureAgent(id, payload.actor || { name: payload.title, appName: payload.appName, agentId: payload.runId });
  agent.lastStatusAt = Date.now();
  agent.lastStatus = payload;
  rememberThreadFromPayload(payload);
}

function ingestAction(payload, thread = {}) {
  const id = actorId(payload.actor);
  if (id) {
    const agent = ensureAgent(id, payload.actor);
    agent.lastActionAt = timeValue(payload.createdAt) || Date.now();
    agent.lastAction = payload;
  }
  rememberThreadFromPayload({ ...thread, ...payload });
}

function ingestClaim(payload) {
  const id = actorId(payload.actor);
  if (!id) return;
  const agent = ensureAgent(id, payload.actor);
  agent.lastClaimAt = timeValue(payload.createdAt) || Date.now();
  agent.lastClaim = payload;
}

function rememberThreadFromPayload(payload) {
  if (!payload.threadId) return;
  const current = state.threads.get(payload.threadId) || {};
  state.threads.set(payload.threadId, {
    threadId: payload.threadId,
    category: payload.category || current.category || '',
    ownerName: payload.owner?.name || payload.ownerName || current.ownerName || '',
    status: payload.status || current.status || '',
    summary: payload.summary || current.summary || '',
    updatedAt: timeValue(payload.updatedAt || payload.createdAt) || current.updatedAt || Date.now(),
    latestActionId: payload.actionId || current.latestActionId || '',
  });
}

function ensureAgent(id, actor = {}) {
  if (!state.agents.has(id)) {
    state.agents.set(id, {
      id,
      actorName: actor.name || id,
      appName: actor.appName || '',
      agentId: actor.agentId || id,
    });
  }
  return state.agents.get(id);
}

function actorId(actor = {}) {
  return actor.agentId || actor.name || '';
}

function evaluate() {
  const now = Date.now();
  const findings = [];

  for (const agent of state.agents.values()) {
    if (agent.agentId === config.agentId || agent.id === config.agentId) continue;
    const ref = agent.lastStatus || agent.lastAction || agent.lastClaim || {};
    const thread = ref.threadId ? state.threads.get(ref.threadId) : null;
    const threadUpdatedAt = thread?.updatedAt || agent.lastActionAt || agent.lastClaimAt || 0;
    const latestLiveSignal = Math.max(agent.lastHeartbeatAt || 0, agent.lastStatusAt || 0);
    const actionIsRunning = ref.status === 'running' || thread?.status === 'running';
    const claimIsFresh = agent.lastClaim?.status === 'working' && now - (agent.lastClaimAt || 0) < config.actionStaleMs;
    const active = actionIsRunning || claimIsFresh || now - latestLiveSignal < config.actionStaleMs;
    if (!active) continue;
    if (thread && isTerminalStatus(thread.status) && !actionIsRunning && !claimIsFresh) continue;

    if ((!agent.lastHeartbeatAt || now - agent.lastHeartbeatAt > config.heartbeatGraceMs)
      && (!threadUpdatedAt || now - threadUpdatedAt > config.heartbeatGraceMs)) {
      findings.push(finding('missing-heartbeat', agent, thread, `No heartbeat seen for ${age(now, agent.lastHeartbeatAt)}.`));
    }
    if ((!agent.lastStatusAt || now - agent.lastStatusAt > config.statusGraceMs)
      && thread
      && (!threadUpdatedAt || now - threadUpdatedAt > config.statusGraceMs)) {
      findings.push(finding('missing-work-status', agent, thread, `No work-status update seen for ${age(now, agent.lastStatusAt)}.`));
    }
    if (agent.lastStatus && missingRequiredStatusFields(agent.lastStatus).length) {
      findings.push(finding('incomplete-work-status', agent, thread, `Status is missing: ${missingRequiredStatusFields(agent.lastStatus).join(', ')}.`));
    }
  }

  for (const thread of state.threads.values()) {
    if (!['running', 'working', 'pending'].includes(String(thread.status).toLowerCase())) continue;
    if (now - thread.updatedAt > config.actionStaleMs) {
      findings.push({
        type: 'stale-thread',
        severity: 'warning',
        thread,
        message: `Thread has had no visible update for ${age(now, thread.updatedAt)}.`,
      });
    }
  }

  return dedupeFindings(findings);
}

function finding(type, agent, thread, message) {
  return {
    type,
    severity: type === 'incomplete-work-status' ? 'warning' : 'nudge',
    agent: publicAgent(agent),
    thread,
    message,
  };
}

function publicAgent(agent) {
  return {
    id: agent.id,
    actorName: agent.actorName,
    appName: agent.appName,
    agentId: agent.agentId,
  };
}

function missingRequiredStatusFields(status) {
  const missing = [];
  if (!status.threadId) missing.push('threadId');
  if (!status.actionId) missing.push('actionId');
  if (!status.owner?.name) missing.push('owner.name');
  return missing;
}

function isTerminalStatus(status) {
  return ['success', 'done', 'blocked', 'failed', 'error', 'cancelled', 'canceled']
    .includes(String(status || '').toLowerCase());
}

function dedupeFindings(findings) {
  const seen = new Set();
  return findings.filter((item) => {
    const key = `${item.type}:${item.agent?.id || ''}:${item.thread?.threadId || ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function maybeSendReminders(findings) {
  if (dryRun) return;
  for (const item of findings) {
    if (!item.thread?.threadId || !item.thread?.ownerName) continue;
    const key = `${item.type}:${item.agent?.id || item.thread.threadId}`;
    const lastSentAt = state.sentReminders.get(key) || 0;
    if (Date.now() - lastSentAt < config.reminderCooldownMs) continue;
    if (actionReminders) {
      await sendActionReminder(item);
    } else {
      await sendStatusReminder(item);
    }
    state.sentReminders.set(key, Date.now());
  }
}

async function sendStatusReminder(item) {
  const thread = item.thread;
  const message = {
    type: 'work-status.update',
    payload: {
      status: 'warning',
      phase: 'watchdog',
      title: 'Daily Magic reporting reminder',
      message: reminderText(item),
      category: thread.category,
      threadId: thread.threadId,
      actionId: thread.latestActionId,
      owner: { name: thread.ownerName },
      appName: config.actorName,
      runId: config.agentId,
    },
  };

  let lastError;
  for (const url of config.wsUrls) {
    try {
      await sendWebSocket(url, message);
      log(`sent reminder for ${item.type} to ${thread.threadId}`);
      return;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error('No Daily Magic WebSocket URLs configured.');
}

async function sendActionReminder(item) {
  const thread = item.thread;
  const actionId = thread.latestActionId;
  if (!actionId) throw new Error(`Cannot append reminder to ${thread.threadId}: missing latest action id.`);

  const claim = {
    type: 'agent.claim',
    payload: {
      threadId: thread.threadId,
      actionId,
      summary: `Claim ${item.type} reminder`,
      actor: watchdogActor(),
      owner: { name: thread.ownerName },
    },
  };
  const action = {
    type: 'agent.action',
    payload: {
      category: thread.category,
      subcategory: reminderSubcategory(thread.category),
      status: 'warning',
      threadId: thread.threadId,
      parentActionId: actionId,
      summary: 'Daily Magic reporting reminder',
      message: reminderText(item),
      actor: watchdogActor(),
      owner: { name: thread.ownerName },
      target: {},
      handoff: {
        result: 'Reporting gap detected.',
        state: item.message,
        next: 'Send the required Daily Magic reporting update, then continue the original work.',
        evidence: [item.type, thread.threadId, actionId],
      },
    },
  };

  let lastError;
  for (const url of config.wsUrls) {
    try {
      await sendWebSocket(url, claim);
      await sendWebSocket(url, action);
      log(`sent action reminder for ${item.type} to ${thread.threadId}`);
      return;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error('No Daily Magic WebSocket URLs configured.');
}

async function sendHeartbeat() {
  const message = {
    type: 'agent.heartbeat',
    payload: {
      actor: watchdogActor(),
      createdAt: new Date().toISOString(),
    },
  };

  for (const url of config.wsUrls) {
    try {
      await sendWebSocket(url, message, 250);
      return;
    } catch {}
  }
}

async function sendWebSocket(url, message, settleMs = 700) {
  await new Promise((resolve, reject) => {
    const socket = new WebSocket(url);
    const timer = setTimeout(() => reject(new Error(`timeout connecting to ${url}`)), 5000);
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        socket.close();
      } catch {}
      resolve();
    };
    socket.addEventListener('open', () => {
      socket.send(JSON.stringify(message));
      setTimeout(finish, settleMs);
    });
    socket.addEventListener('message', (event) => {
      const response = parseJson(event.data);
      if (response?.type === 'agent.instruction.update_required') {
        reject(new Error(response.payload?.message || 'Daily Magic rejected the message'));
      }
      if (response?.type === 'agent.claim.denied') {
        reject(new Error(response.payload?.message || 'Daily Magic denied the claim'));
      }
    });
    socket.addEventListener('error', () => reject(new Error(`could not send to ${url}`)));
  });
}

function reminderText(item) {
  const who = item.agent?.actorName || item.agent?.agentId || 'A running agent';
  return `${who}: ${item.message} Please send a Daily Magic work-status.update with owner.name, threadId, and actionId before continuing.`;
}

function reminderSubcategory(category) {
  const byCategory = {
    BITBUCKET: 'Comment',
    JIRA: 'Comment',
    SENTRY: 'Inspect event',
    SLACK: 'Message',
  };
  return byCategory[category] || 'Comment';
}

function watchdogActor() {
  return {
    name: config.actorName,
    appName: 'Codex',
    agentId: config.agentId,
  };
}

function printFindings(findings) {
  if (jsonOutput) {
    console.log(JSON.stringify({ ok: true, dryRun, findings }, null, 2));
    return;
  }
  if (!findings.length) {
    log(`ok: no reporting gaps found (${dryRun ? 'dry-run' : 'live reminders enabled'})`);
    return;
  }
  for (const item of findings) {
    const thread = item.thread?.threadId ? ` thread=${item.thread.threadId}` : '';
    const agent = item.agent?.actorName ? ` agent=${item.agent.actorName}` : '';
    log(`${item.severity}: ${item.type}${agent}${thread} - ${item.message}`);
  }
}

function timeValue(value) {
  if (!value) return 0;
  if (typeof value === 'number') return value;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function age(now, then) {
  if (!then) return 'forever';
  const seconds = Math.max(0, Math.round((now - then) / 1000));
  if (seconds < 90) return `${seconds}s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 90) return `${minutes}m`;
  return `${Math.round(minutes / 60)}h`;
}

function log(message) {
  console.error(`[watchdog] ${message}`);
}

function warn(message) {
  console.error(`[watchdog] warning: ${message}`);
}
