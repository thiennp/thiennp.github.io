import fs from 'node:fs';
import path from 'node:path';
import { redactSecrets } from './redact';
import { resolveModelFields } from './resolveModelFields';
import { broadcast } from './realtime';
import { MAX_RECENT_EVENTS } from './constants';
import {
  AutomationRecord,
  AutomationState,
  CurrentReport,
  DashboardSnapshot,
  ReportEvent,
  ReportItem,
  ReportRun,
  ReportStore,
  Status,
  WorkStatus,
  WsMessage
} from './types';

export { MAX_RECENT_EVENTS };

const defaultDataDir = path.join(process.cwd(), 'data');
const dataDir = process.env.AUTOMATION_REPORT_DATA_DIR || defaultDataDir;
const storePath = path.join(dataDir, 'automation-report.json');

let queue: Promise<unknown> = Promise.resolve();

function emptyStore(): ReportStore {
  return { version: 0, automations: {} };
}

function emptyReport(): CurrentReport {
  return {
    title: 'Report',
    message: 'No external report connected.',
    status: 'pending',
    source: 'automation-report',
    updatedAt: now(),
    issueCount: 0,
    issues: []
  };
}

function emptyWorkStatus(): WorkStatus {
  return {
    status: 'pending',
    title: '',
    message: '',
    source: 'automation-report',
    updatedAt: now()
  };
}

function cleanText(value: unknown, maxLength = 240) {
  if (value === null || value === undefined) {
    return undefined;
  }
  const text = String(value).replace(/\s+/g, ' ').trim();
  if (!text) {
    return undefined;
  }
  return text.slice(0, maxLength);
}

function normalizeWorkStatus(input: Record<string, unknown>): WorkStatus {
  const pre = cleanText(input.pre || input.preKey || input.jiraKey, 24);
  const normalizedPre = pre && /^PRE-\d+$/i.test(pre) ? pre.toUpperCase() : pre;
  const modelFields = resolveModelFields(input);
  return redactSecrets({
    status: cleanText(input.status, 32) || 'info',
    step: cleanText(input.step || input.stepNumber, 32),
    phase: cleanText(input.phase || input.stage || input.currentPhase, 80),
    title: cleanText(input.title || input.stepTitle, 160) || 'Work update',
    message: cleanText(input.message || input.text || input.body, 600) || 'Status updated.',
    pre: normalizedPre,
    repo: cleanText(input.repo || input.repository, 80),
    pr: cleanText(input.pr || input.prNumber || input.pullRequest, 32),
    url: cleanText(input.url || input.evidenceUrl, 600),
    source: cleanText(input.source, 120) || 'automation-report',
    automationId: cleanText(input.automationId, 120),
    runId: cleanText(input.runId, 120),
    appName: cleanText(input.appName || input.app || input.agentName || input.agent, 120),
    agentName: cleanText(input.agentName || input.appName || input.app || input.agent, 120),
    agentRole: cleanText(input.agentRole, 120),
    ...modelFields,
    nextStep: cleanText(input.nextStep, 80),
    updatedAt: cleanText(input.updatedAt, 80) || now()
  }) as WorkStatus;
}

function ensureDataDir() {
  fs.mkdirSync(dataDir, { recursive: true });
}

function readStoreUnsafe(): ReportStore {
  ensureDataDir();
  if (!fs.existsSync(storePath)) {
    const store = emptyStore();
    fs.writeFileSync(storePath, JSON.stringify(store, null, 2));
    return store;
  }
  const raw = fs.readFileSync(storePath, 'utf8');
  if (!raw.trim()) {
    return emptyStore();
  }
  return JSON.parse(raw) as ReportStore;
}

function writeStoreUnsafe(store: ReportStore) {
  ensureDataDir();
  const tempPath = `${storePath}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(store, null, 2));
  fs.renameSync(tempPath, storePath);
}

async function withStore<T>(mutator: (store: ReportStore) => T | Promise<T>) {
  const next = queue.then(async () => {
    const store = readStoreUnsafe();
    const result = await mutator(store);
    writeStoreUnsafe(store);
    return result;
  });
  queue = next.catch(() => undefined);
  return next;
}

function now() {
  return new Date().toISOString();
}

function ensureAutomation(store: ReportStore, automationId: string): AutomationRecord {
  const existing = store.automations[automationId];
  if (existing) {
    return existing;
  }
  const created: AutomationRecord = {
    automationId,
    state: {
      automationId,
      latestStatus: 'info',
      lastUpdatedAt: now(),
      activeItems: [],
      blockedItems: [],
      waitingPrs: [],
      doneItems: []
    },
    runs: {}
  };
  store.automations[automationId] = created;
  return created;
}

function ensureRun(automation: AutomationRecord, runId: string): ReportRun {
  const existing = automation.runs[runId];
  if (existing) {
    return existing;
  }
  const created: ReportRun = {
    runId,
    startedAt: now(),
    updatedAt: now(),
    status: 'info',
    events: [],
    items: {}
  };
  automation.runs[runId] = created;
  return created;
}

function changed(store: ReportStore, message: Omit<WsMessage, 'version' | 'createdAt'>) {
  store.version += 1;
  const wsMessage = {
    ...message,
    version: store.version,
    createdAt: now()
  };
  broadcast(wsMessage);
  return wsMessage;
}

function normalizeReport(input: unknown): CurrentReport {
  const base = emptyReport();
  if (!input || typeof input !== 'object') {
    return base;
  }
  const record = input as Record<string, unknown>;
  return redactSecrets({
    title: cleanText(record.title, 120) || base.title,
    message: cleanText(record.message, 240) || base.message,
    status: cleanText(record.status, 32) || base.status,
    source: cleanText(record.source, 80) || base.source,
    updatedAt: cleanText(record.updatedAt, 80) || now(),
    issueCount: 0,
    issues: []
  }) as CurrentReport;
}

export function getReport() {
  const store = readStoreUnsafe();
  return store.report || emptyReport();
}

export function getWorkStatus() {
  const store = readStoreUnsafe();
  return store.workStatus || emptyWorkStatus();
}

export async function replaceWorkStatus(input: Record<string, unknown>) {
  return withStore((store) => {
    const workStatus = normalizeWorkStatus(input);
    store.workStatus = workStatus;
    const event = changed(store, {
      type: 'work-status.updated',
      automationId: workStatus.automationId,
      runId: workStatus.runId,
      status: workStatus.status,
      payload: workStatus
    });
    return { workStatus, event };
  });
}

function pruneRecentEvents(store: ReportStore) {
  const entries: Array<{
    automationId: string;
    runId: string;
    eventId: string;
    createdAt: string;
  }> = [];

  for (const automation of Object.values(store.automations)) {
    for (const run of Object.values(automation.runs)) {
      for (const reportEvent of run.events) {
        entries.push({
          automationId: automation.automationId,
          runId: run.runId,
          eventId: reportEvent.id,
          createdAt: reportEvent.createdAt
        });
      }
    }
  }

  if (entries.length <= MAX_RECENT_EVENTS) {
    return;
  }

  const keepIds = new Set(
    entries
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .slice(0, MAX_RECENT_EVENTS)
      .map((entry) => entry.eventId)
  );

  for (const automation of Object.values(store.automations)) {
    for (const run of Object.values(automation.runs)) {
      run.events = run.events.filter((reportEvent) => keepIds.has(reportEvent.id));
    }
  }
}

export function getRecentEvents(limit = MAX_RECENT_EVENTS) {
  const store = readStoreUnsafe();
  const events: Array<ReportEvent & { automationId: string; runId: string }> = [];
  for (const automation of Object.values(store.automations)) {
    for (const run of Object.values(automation.runs)) {
      for (const reportEvent of run.events) {
        events.push({
          ...reportEvent,
          automationId: automation.automationId,
          runId: run.runId
        });
      }
    }
  }
  return events
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, limit);
}

export function getDashboardSnapshot(): DashboardSnapshot {
  return {
    workStatus: getWorkStatus(),
    automations: listAutomations(),
    recentEvents: getRecentEvents(MAX_RECENT_EVENTS),
    report: getReport()
  };
}

export async function clearDashboard() {
  return withStore((store) => {
    store.automations = {};
    store.workStatus = emptyWorkStatus();
    store.report = emptyReport();
    const event = changed(store, {
      type: 'dashboard.cleared',
      status: 'pending',
      payload: { clearedAt: now() }
    });
    return {
      snapshot: getDashboardSnapshot(),
      event
    };
  });
}

export async function importDashboardSnapshot(input: DashboardSnapshot) {
  return withStore((store) => {
    store.workStatus = normalizeWorkStatus(input.workStatus as Record<string, unknown>);
    store.report = normalizeReport(input.report);

    store.automations = {};
    for (const summary of input.automations || []) {
      const automation = ensureAutomation(store, summary.automationId);
      automation.state.latestStatus = summary.latestStatus || automation.state.latestStatus;
      automation.state.lastUpdatedAt = summary.latestUpdateTime || automation.state.lastUpdatedAt;
      if (summary.latestRunId) {
        automation.state.activeRunId = summary.latestRunId;
      }
    }

    const orderedEvents = [...(input.recentEvents || [])].sort((left, right) => {
      return left.createdAt.localeCompare(right.createdAt);
    });

    for (const event of orderedEvents) {
      const automation = ensureAutomation(store, event.automationId);
      const run = ensureRun(automation, event.runId);
      const alreadyStored = run.events.some((storedEvent) => storedEvent.id === event.id);
      if (!alreadyStored) {
        run.events.push(redactSecrets({
          id: event.id,
          title: event.title,
          status: event.status || 'info',
          message: event.message,
          nextStep: event.nextStep,
          appName: event.appName || event.agentName,
          agentName: event.agentName || event.appName,
          agentRole: event.agentRole,
          llm: event.llm,
          modelToken: event.modelToken,
          tokensUsed: event.tokensUsed,
          stepNumber: event.stepNumber,
          createdAt: event.createdAt
        }) as ReportEvent);
      }
      run.status = event.status || run.status;
      run.updatedAt = event.createdAt;
      automation.state.activeRunId = event.runId;
      automation.state.latestStatus = run.status;
      automation.state.lastUpdatedAt = event.createdAt;
    }

    pruneRecentEvents(store);

    const event = changed(store, {
      type: 'dashboard.synced',
      status: store.workStatus?.status,
      payload: { source: 'client-cache', updatedAt: now() }
    });

    return {
      snapshot: getDashboardSnapshot(),
      event
    };
  });
}

export function getStoreInfo() {
  ensureDataDir();
  let readable = false;
  let writable = false;
  try {
    readStoreUnsafe();
    readable = true;
    const probePath = path.join(dataDir, '.write-test');
    fs.writeFileSync(probePath, 'ok');
    fs.unlinkSync(probePath);
    writable = true;
  } catch {
    readable = false;
    writable = false;
  }
  return { dataDir, storePath, readable, writable, version: readStoreUnsafe().version };
}

export function getStoreSnapshot() {
  return readStoreUnsafe();
}

export function listAutomations() {
  const store = readStoreUnsafe();
  return Object.values(store.automations).map((automation) => {
    const runs = Object.values(automation.runs).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    const latestRun = runs[0];
    const blockedItems = Object.values(latestRun?.items || {}).filter((item) => item.status === 'blocked' || item.status === 'Block');
    return {
      automationId: automation.automationId,
      latestRunId: latestRun?.runId,
      latestStatus: automation.state.latestStatus || latestRun?.status || 'info',
      latestUpdateTime: automation.state.lastUpdatedAt || latestRun?.updatedAt,
      activeBlockerCount: blockedItems.length
    };
  });
}

export function getState(automationId: string) {
  const store = readStoreUnsafe();
  return ensureAutomation(store, automationId).state;
}

export async function replaceState(automationId: string, input: Record<string, unknown>) {
  return withStore((store) => {
    const automation = ensureAutomation(store, automationId);
    automation.state = redactSecrets({
      ...input,
      automationId,
      lastUpdatedAt: now()
    }) as AutomationState;
    const event = changed(store, {
      type: 'state.replaced',
      automationId,
      status: automation.state.latestStatus,
      payload: automation.state
    });
    return { state: automation.state, event };
  });
}

export async function patchState(automationId: string, input: Record<string, unknown>) {
  return withStore((store) => {
    const automation = ensureAutomation(store, automationId);
    automation.state = redactSecrets({
      ...automation.state,
      ...input,
      automationId,
      lastUpdatedAt: now()
    }) as AutomationState;
    const event = changed(store, {
      type: 'state.updated',
      automationId,
      status: automation.state.latestStatus,
      payload: automation.state
    });
    return { state: automation.state, event };
  });
}

export async function createRun(automationId: string, input: Partial<ReportRun>) {
  return withStore((store) => {
    const automation = ensureAutomation(store, automationId);
    const runId = String(input.runId || `${Date.now()}`);
    const existing = automation.runs[runId];
    const run: ReportRun = {
      ...existing,
      ...redactSecrets(input),
      runId,
      startedAt: input.startedAt || existing?.startedAt || now(),
      updatedAt: now(),
      status: (input.status || existing?.status || 'running') as Status,
      events: existing?.events || [],
      items: existing?.items || {}
    };
    automation.runs[runId] = run;
    automation.state.activeRunId = runId;
    automation.state.latestStatus = run.status;
    automation.state.lastUpdatedAt = now();
    const event = changed(store, {
      type: existing ? 'run.updated' : 'run.created',
      automationId,
      runId,
      status: run.status,
      payload: run
    });
    return { run, event };
  });
}

export function listRuns(automationId: string, limit = 50, offset = 0) {
  const store = readStoreUnsafe();
  const automation = ensureAutomation(store, automationId);
  const runs = Object.values(automation.runs)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(offset, offset + limit)
    .map(({ events, items, ...run }) => ({
      ...run,
      eventCount: events.length,
      itemCount: Object.keys(items).length,
      blockerCount: Object.values(items).filter((item) => item.status === 'blocked' || item.status === 'Block').length
    }));
  return { runs, limit, offset };
}

export function getRun(automationId: string, runId: string) {
  const store = readStoreUnsafe();
  return ensureAutomation(store, automationId).runs[runId];
}

export async function patchRun(automationId: string, runId: string, input: Partial<ReportRun>) {
  return withStore((store) => {
    const automation = ensureAutomation(store, automationId);
    const run = ensureRun(automation, runId);
    Object.assign(run, redactSecrets(input), { runId, updatedAt: now() });
    automation.state.latestStatus = run.status;
    automation.state.lastUpdatedAt = now();
    const event = changed(store, {
      type: 'run.updated',
      automationId,
      runId,
      status: run.status,
      payload: run
    });
    return { run, event };
  });
}

export async function appendEvent(automationId: string, runId: string, input: Partial<ReportEvent>) {
  return withStore((store) => {
    const automation = ensureAutomation(store, automationId);
    const run = ensureRun(automation, runId);
    const reportEvent: ReportEvent = redactSecrets({
      id: input.id || `${Date.now()}-${run.events.length + 1}`,
      title: input.title || 'Untitled event',
      status: input.status || 'info',
      message: input.message,
      evidence: input.evidence,
      nextStep: input.nextStep,
      agentName: input.agentName,
      agentRole: input.agentRole,
      stepNumber: input.stepNumber,
      createdAt: input.createdAt || now()
    }) as ReportEvent;
    run.events.push(reportEvent);
    pruneRecentEvents(store);
    run.status = reportEvent.status;
    run.updatedAt = now();
    automation.state.latestStatus = run.status;
    automation.state.lastUpdatedAt = now();
    const event = changed(store, {
      type: 'event.created',
      automationId,
      runId,
      status: reportEvent.status,
      payload: reportEvent
    });
    return { event: reportEvent, broadcast: event };
  });
}

export function listEvents(automationId: string, runId: string, order: 'asc' | 'desc' = 'asc') {
  const run = getRun(automationId, runId);
  if (!run) {
    return undefined;
  }
  const events = [...run.events].sort((a, b) => order === 'asc' ? a.createdAt.localeCompare(b.createdAt) : b.createdAt.localeCompare(a.createdAt));
  return { events };
}

export async function upsertItem(automationId: string, runId: string, itemId: string, input: Partial<ReportItem>, partial = false) {
  return withStore((store) => {
    const automation = ensureAutomation(store, automationId);
    const run = ensureRun(automation, runId);
    const existing = run.items[itemId];
    const item = redactSecrets({
      ...(partial ? existing || {} : {}),
      ...input,
      itemId,
      updatedAt: input.updatedAt || now()
    }) as ReportItem;
    run.items[itemId] = item;
    run.updatedAt = now();
    automation.state.lastUpdatedAt = now();
    const event = changed(store, {
      type: existing ? 'item.updated' : 'item.upserted',
      automationId,
      runId,
      itemId,
      status: item.status,
      payload: item
    });
    return { item, event };
  });
}

export function listItems(automationId: string, runId: string, filters: URLSearchParams) {
  const run = getRun(automationId, runId);
  if (!run) {
    return undefined;
  }
  let items = Object.values(run.items);
  for (const key of ['status', 'type', 'actionability', 'repo']) {
    const value = filters.get(key);
    if (value) {
      items = items.filter((item) => String(item[key] || '').toLowerCase() === value.toLowerCase());
    }
  }
  const q = filters.get('q');
  if (q) {
    const needle = q.toLowerCase();
    items = items.filter((item) => JSON.stringify(item).toLowerCase().includes(needle));
  }
  if (filters.get('currentOnly') === 'true') {
    items = items.filter((item) => !['done', 'DONE'].includes(String(item.status)));
  }
  return { items };
}

export { storePath };
