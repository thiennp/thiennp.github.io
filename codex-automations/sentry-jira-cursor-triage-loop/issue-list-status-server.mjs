#!/usr/bin/env node
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_ARTIFACT_DIR = path.join(__dirname, 'artifacts');
const DEFAULT_STATUS = path.join(DEFAULT_ARTIFACT_DIR, 'current-sentry-issue-status.json');
const DEFAULT_HTML = path.join(DEFAULT_ARTIFACT_DIR, 'current-sentry-issue-list.html');
const DEFAULT_RUN_LOG_DIR = path.join(DEFAULT_ARTIFACT_DIR, 'issue-runs');
const ISSUE_LIST_GENERATOR = path.join(__dirname, 'generate-issue-list-html.mjs');
const SAFE_DELEGATE = path.join(__dirname, 'safe-delegate-cli.mjs');
const CLAUDE_TIMEOUT_MS = 120_000;
const ALLOWED_REPO_ROOTS = [
  '/Users/thien.nguyen/enrg-energymodule',
  '/Users/thien.nguyen/enrg-web-frontend',
  '/Users/thien.nguyen/enrg-energycenter-rev',
  '/Users/thien.nguyen/enrg-tarifvergleich',
  __dirname,
];

const usage = () => {
  console.log(`Usage: issue-list-status-server.mjs <command> [options]

Commands:
  serve [--port 8797] [--host 127.0.0.1] [--dir artifacts]
      Serve the generated issue app and expose /api/status.
  set --issue-id ID --status STATUS [--message TEXT] [--action ACTION] [--event-title TEXT] [--event-actor TEXT] [--status-file PATH]
      Update the sidecar status JSON without starting a server.
  get [--status-file PATH]
      Print the current status JSON.

Statuses: not-started, selected, working, blocked, done`);
};

const args = process.argv.slice(2);
const command = args.shift();
if (!command || command === '--help' || command === '-h') {
  usage();
  process.exit(command ? 0 : 2);
}

const takeOption = (name, fallback) => {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  const value = args[index + 1];
  if (value === undefined) throw new Error(`${name} requires a value`);
  args.splice(index, 2);
  return value;
};

const normalizeStatus = (value) => {
  const status = value || 'not-started';
  if (!['not-started', 'selected', 'working', 'blocked', 'done'].includes(status)) {
    throw new Error(`Unsupported status: ${status}`);
  }
  return status;
};

const readJson = (file) => {
  if (!fs.existsSync(file)) {
    return { generatedAt: new Date().toISOString(), issues: {} };
  }
  try {
    const raw = fs.readFileSync(file, 'utf8').trim();
    return raw ? JSON.parse(raw) : { generatedAt: new Date().toISOString(), issues: {} };
  } catch {
    return { generatedAt: new Date().toISOString(), recoveredFromInvalidStatusFileAt: new Date().toISOString(), issues: {} };
  }
};

const writeJsonAtomic = (file, data) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, file);
};

const safeIssueFileName = (issueId) => String(issueId).replace(/[^A-Za-z0-9_.-]+/g, '-');

const runLogPathFor = (statusFile, issueId) => {
  const dir = path.join(path.dirname(statusFile), 'issue-runs');
  return path.join(dir, `${safeIssueFileName(issueId)}.json`);
};

const readRunLog = (statusFile, issueId) => {
  const file = runLogPathFor(statusFile, issueId);
  const existing = readJson(file);
  return {
    issueId,
    createdAt: existing.createdAt || new Date().toISOString(),
    updatedAt: existing.updatedAt || null,
    status: existing.status || 'not-started',
    blocked: existing.blocked || null,
    lastAction: existing.lastAction || null,
    events: Array.isArray(existing.events) ? existing.events : [],
    artifacts: existing.artifacts || {},
  };
};

const appendRunLogEvent = ({ statusFile, issueId, event, issueState, artifact }) => {
  if (!issueId || !event) return null;
  const file = runLogPathFor(statusFile, issueId);
  const log = readRunLog(statusFile, issueId);
  const normalizedEvent = {
    ...event,
    at: event.at || new Date().toISOString(),
  };
  log.events = mergeTimeline(log.events, [normalizedEvent]);
  log.updatedAt = new Date().toISOString();
  log.status = issueState?.status || event.status || log.status;
  log.lastAction = {
    actor: normalizedEvent.actor,
    phase: normalizedEvent.phase,
    status: normalizedEvent.status,
    title: normalizedEvent.title,
    message: normalizedEvent.message,
    at: normalizedEvent.at,
  };
  if (issueState?.status === 'blocked' || normalizedEvent.status === 'blocked') {
    log.blocked = {
      at: normalizedEvent.at,
      actor: normalizedEvent.actor,
      phase: normalizedEvent.phase,
      title: normalizedEvent.title,
      reason: normalizedEvent.message,
      requestedAction: issueState?.requestedAction || '',
      requestedJiraKey: issueState?.requestedJiraKey || '',
    };
  } else if (issueState?.status === 'done') {
    log.blocked = null;
  }
  if (artifact) {
    log.artifacts[artifact.name] = artifact.value;
  }
  writeJsonAtomic(file, log);
  return file;
};

const mergeTimeline = (...timelines) => {
  const byId = new Map();
  for (const timeline of timelines) {
    for (const event of Array.isArray(timeline) ? timeline : []) {
      const id = event.id || [event.at, event.actor, event.title, event.message].filter(Boolean).join('|');
      if (!id || byId.has(id)) continue;
      byId.set(id, { ...event, id });
    }
  }
  return [...byId.values()].sort((a, b) => {
    const aTime = Date.parse(a.at || a.updatedAt || '') || 0;
    const bTime = Date.parse(b.at || b.updatedAt || '') || 0;
    return aTime - bTime;
  });
};

const makeTimelineEvent = ({ actor = 'Codex', phase = 'status', status = 'info', title, message }) => {
  const at = new Date().toISOString();
  return {
    id: `${at}-${Math.random().toString(36).slice(2)}`,
    at,
    actor,
    phase,
    status,
    title: title || phase || status,
    message: message || '',
  };
};

const updateStatus = ({ statusFile, issueId, status, message, action, requestedJiraKey, timelineEvent }) => {
  if (!issueId) throw new Error('--issue-id is required');
  const data = readJson(statusFile);
  data.issues ||= {};
  const previous = data.issues[issueId] || { id: issueId };
  const event = timelineEvent || makeTimelineEvent({
    status: normalizeStatus(status),
    title: `Status changed to ${normalizeStatus(status)}`,
    message: message ?? previous.message ?? '',
  });
  const nextIssue = {
    ...previous,
    id: issueId,
    status: normalizeStatus(status),
    message: message ?? previous.message ?? '',
    requestedAction: action ?? previous.requestedAction ?? '',
    requestedJiraKey: requestedJiraKey ?? previous.requestedJiraKey ?? '',
    timeline: mergeTimeline(previous.timeline, [event]),
    updatedAt: new Date().toISOString(),
  };
  const logPath = appendRunLogEvent({ statusFile, issueId, event, issueState: nextIssue });
  data.issues[issueId] = {
    ...nextIssue,
    runLogPath: logPath || previous.runLogPath || '',
  };
  data.lastUpdated = data.issues[issueId].updatedAt;
  writeJsonAtomic(statusFile, data);
  return data;
};

const updateClaudeResult = ({ statusFile, issueId, result }) => {
  if (!issueId) throw new Error('issueId is required');
  const data = readJson(statusFile);
  data.issues ||= {};
  const previous = data.issues[issueId] || { id: issueId, status: 'not-started' };
  const message = result.warning || result.output || result.error || '';
  const event = makeTimelineEvent({
    actor: 'Claude',
    phase: 'analysis',
    status: result.status || 'finished',
    title: `Claude analysis ${result.status || 'finished'}`,
    message: message.slice(0, 1000),
  });
  const nextIssue = {
    ...previous,
    id: issueId,
    claude: result,
    timeline: mergeTimeline(previous.timeline, [event]),
    updatedAt: new Date().toISOString(),
  };
  const logPath = appendRunLogEvent({
    statusFile,
    issueId,
    event,
    issueState: nextIssue,
    artifact: { name: 'claude', value: result },
  });
  data.issues[issueId] = {
    ...nextIssue,
    runLogPath: logPath || previous.runLogPath || '',
  };
  data.lastUpdated = data.issues[issueId].updatedAt;
  writeJsonAtomic(statusFile, data);
  return data;
};

const extractClaudeCwd = (prompt) => {
  const match = String(prompt).match(/^Repo path:\s*(.+)$/m);
  if (!match) return __dirname;
  const candidate = match[1].trim();
  if (!candidate || candidate.startsWith('(')) return __dirname;
  const resolved = path.resolve(candidate);
  const allowed = ALLOWED_REPO_ROOTS.some((root) => resolved === root || resolved.startsWith(`${root}${path.sep}`));
  if (!allowed || !fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) return __dirname;
  return resolved;
};

const classifyClaudeResult = ({ code, signal, stdout, stderr }) => {
  const timedOut = signal === 'SIGTERM';
  const output = stdout.trim();
  const error = stderr.trim();
  if (timedOut) return { status: 'timeout', output, error };
  if (code !== 0) return { status: 'error', output, error };
  if (/known noise|google'?s ios|chrome mobile ios|ios in-app browser|browser extension|external noise|crawler/i.test(`${output}\n${error}`)) {
    return {
      status: 'needs-validation',
      output,
      error,
      warning: 'Claude classified this as likely external/noise. Codex must validate Sentry evidence before skipping or delegating.',
    };
  }
  if (/don'?t have filesystem permission|permission to read|access denied|not allowed to read/i.test(`${output}\n${error}`)) {
    return {
      status: 'degraded',
      output,
      error,
      warning: 'Claude could not read the mapped repository. Continue with Codex local inspection and Cursor plan agreement.',
    };
  }
  return { status: 'success', output, error };
};

const runClaude = (prompt) => new Promise((resolve) => {
  const startedAt = new Date().toISOString();
  const cwd = extractClaudeCwd(prompt);
  const child = spawn(process.execPath, [
    SAFE_DELEGATE,
    '--',
    'claude',
    '--print',
    '--permission-mode',
    'dontAsk',
    '--allowedTools=Read,Glob,Grep,LS',
    `--add-dir=${cwd}`,
    prompt,
  ], {
    cwd,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stdout = '';
  let stderr = '';
  const timer = setTimeout(() => {
    child.kill('SIGTERM');
  }, CLAUDE_TIMEOUT_MS);
  child.stdout.on('data', (chunk) => {
    stdout += chunk;
  });
  child.stderr.on('data', (chunk) => {
    stderr += chunk;
  });
  child.on('error', (error) => {
    clearTimeout(timer);
    resolve({
      status: 'error',
      startedAt,
      finishedAt: new Date().toISOString(),
      error: error.message,
    });
  });
  child.on('close', (code, signal) => {
    clearTimeout(timer);
    const classified = classifyClaudeResult({ code, signal, stdout, stderr });
    resolve({
      ...classified,
      startedAt,
      finishedAt: new Date().toISOString(),
      cwd,
      exitCode: code,
      signal,
    });
  });
});

const runClaudeStream = ({ prompt, onEvent }) => new Promise((resolve) => {
  const startedAt = new Date().toISOString();
  const cwd = extractClaudeCwd(prompt);
  const child = spawn(process.execPath, [
    SAFE_DELEGATE,
    '--',
    'claude',
    '--print',
    '--permission-mode',
    'dontAsk',
    '--allowedTools=Read,Glob,Grep,LS',
    `--add-dir=${cwd}`,
    prompt,
  ], {
    cwd,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stdout = '';
  let stderr = '';
  const timer = setTimeout(() => {
    child.kill('SIGTERM');
  }, CLAUDE_TIMEOUT_MS);
  child.stdout.on('data', (chunk) => {
    const text = chunk.toString();
    stdout += text;
    onEvent?.({ type: 'stdout', text });
  });
  child.stderr.on('data', (chunk) => {
    const text = chunk.toString();
    stderr += text;
    onEvent?.({ type: 'stderr', text });
  });
  child.on('error', (error) => {
    clearTimeout(timer);
    onEvent?.({ type: 'error', text: error.message });
    resolve({
      status: 'error',
      startedAt,
      finishedAt: new Date().toISOString(),
      error: error.message,
      cwd,
    });
  });
  child.on('close', (code, signal) => {
    clearTimeout(timer);
    const classified = classifyClaudeResult({ code, signal, stdout, stderr });
    resolve({
      ...classified,
      startedAt,
      finishedAt: new Date().toISOString(),
      cwd,
      exitCode: code,
      signal,
    });
  });
});

const readBodyJson = (request) => new Promise((resolve, reject) => {
  let body = '';
  request.setEncoding('utf8');
  request.on('data', (chunk) => {
    body += chunk;
    if (body.length > 128 * 1024) {
      reject(new Error('Request body too large'));
      request.destroy();
    }
  });
  request.on('end', () => {
    try {
      resolve(body ? JSON.parse(body) : {});
    } catch (error) {
      reject(error);
    }
  });
  request.on('error', reject);
});

const sendJson = (response, statusCode, data) => {
  response.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type',
  });
  response.end(JSON.stringify(data, null, 2));
};

const sendSse = (response, event, data) => {
  response.write(`event: ${event}\n`);
  response.write(`data: ${JSON.stringify(data)}\n\n`);
};

const contentType = (file) => {
  if (file.endsWith('.html')) return 'text/html; charset=utf-8';
  if (file.endsWith('.js')) return 'text/javascript; charset=utf-8';
  if (file.endsWith('.json')) return 'application/json; charset=utf-8';
  if (file.endsWith('.css')) return 'text/css; charset=utf-8';
  return 'application/octet-stream';
};

const rebuildIssueList = ({ dir, statusFile }) => {
  const outPath = path.join(dir, path.basename(DEFAULT_HTML));
  const snapshotDir = path.join('/tmp', `sentry-triage-html-reload-${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')}`);
  const result = spawnSync(process.execPath, [
    ISSUE_LIST_GENERATOR,
    '--fresh',
    '--out',
    outPath,
    '--status-out',
    statusFile,
    '--snapshot-dir',
    snapshotDir,
  ], {
    cwd: __dirname,
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
    env: process.env,
  });
  if (result.status !== 0) {
    throw new Error((result.stderr || result.stdout || `Generator exited with ${result.status}`).trim());
  }
  let parsed = null;
  try {
    parsed = JSON.parse(result.stdout);
  } catch {
    parsed = { stdout: result.stdout.trim() };
  }
  return {
    ...parsed,
    html: outPath,
    statusFile,
    snapshotDir,
    rebuiltAt: new Date().toISOString(),
  };
};

if (command === 'set') {
  const statusFile = takeOption('--status-file', DEFAULT_STATUS);
  const issueId = takeOption('--issue-id', null);
  const status = takeOption('--status', null);
  const message = takeOption('--message', '');
  const action = takeOption('--action', null);
  const eventTitle = takeOption('--event-title', null);
  const eventActor = takeOption('--event-actor', 'Codex');
  const eventPhase = takeOption('--event-phase', 'status');
  const timelineEvent = eventTitle ? makeTimelineEvent({
    actor: eventActor,
    phase: eventPhase,
    status: status || 'info',
    title: eventTitle,
    message,
  }) : null;
  const data = updateStatus({ statusFile, issueId, status, message, action, timelineEvent });
  console.log(JSON.stringify({
    statusFile,
    issueId,
    status: data.issues[issueId].status,
    updatedAt: data.issues[issueId].updatedAt,
  }, null, 2));
} else if (command === 'get') {
  const statusFile = takeOption('--status-file', DEFAULT_STATUS);
  console.log(JSON.stringify(readJson(statusFile), null, 2));
} else if (command === 'serve') {
  const port = Number(takeOption('--port', '8797'));
  const host = takeOption('--host', '127.0.0.1');
  const dir = path.resolve(takeOption('--dir', DEFAULT_ARTIFACT_DIR));
  const statusFile = takeOption('--status-file', path.join(dir, path.basename(DEFAULT_STATUS)));

  const server = http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url, `http://${host}:${port}`);
      if (request.method === 'OPTIONS') {
        response.writeHead(204, {
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'GET,POST,OPTIONS',
          'access-control-allow-headers': 'content-type',
        });
        response.end();
        return;
      }
      if (url.pathname === '/api/status') {
        if (request.method === 'GET') {
          sendJson(response, 200, readJson(statusFile));
          return;
        }
        if (request.method === 'POST') {
          const body = await readBodyJson(request);
          const data = updateStatus({
            statusFile,
            issueId: body.issueId || body.id,
            status: body.status,
            message: body.message || '',
            action: body.action || body.requestedAction || '',
            requestedJiraKey: body.requestedJiraKey || '',
            timelineEvent: body.timelineEvent || (body.eventTitle ? makeTimelineEvent({
              actor: body.eventActor || 'Codex',
              phase: body.eventPhase || 'status',
              status: body.status || 'info',
              title: body.eventTitle,
              message: body.message || '',
            }) : null),
          });
          sendJson(response, 200, data);
          return;
        }
      }
      if (url.pathname === '/api/rebuild') {
        if (request.method !== 'POST') {
          sendJson(response, 405, { error: 'Method not allowed' });
          return;
        }
        const result = rebuildIssueList({ dir, statusFile });
        sendJson(response, 200, result);
        return;
      }
      if (url.pathname === '/api/run-log') {
        const issueId = url.searchParams.get('issueId');
        if (!issueId) throw new Error('issueId is required');
        sendJson(response, 200, readRunLog(statusFile, issueId));
        return;
      }
      if (url.pathname === '/api/claude-stream') {
        if (request.method !== 'POST') {
          sendJson(response, 405, { error: 'Method not allowed' });
          return;
        }
        const body = await readBodyJson(request);
        if (!body.issueId && !body.id) throw new Error('issueId is required');
        if (!body.prompt || typeof body.prompt !== 'string') throw new Error('prompt is required');
        const issueId = body.issueId || body.id;
        response.writeHead(200, {
          'content-type': 'text/event-stream; charset=utf-8',
          'cache-control': 'no-store',
          connection: 'keep-alive',
          'access-control-allow-origin': '*',
        });
        updateStatus({
          statusFile,
          issueId,
          status: 'working',
          message: 'Running Claude analysis',
        });
        sendSse(response, 'start', { issueId, message: 'Claude started' });
        const result = await runClaudeStream({
          prompt: body.prompt,
          onEvent: (event) => sendSse(response, event.type, { issueId, text: event.text }),
        });
        const data = updateClaudeResult({ statusFile, issueId, result });
        sendSse(response, 'done', { issueId, claude: result, status: data });
        response.end();
        return;
      }
      if (url.pathname === '/api/claude') {
        if (request.method !== 'POST') {
          sendJson(response, 405, { error: 'Method not allowed' });
          return;
        }
        const body = await readBodyJson(request);
        if (!body.issueId && !body.id) throw new Error('issueId is required');
        if (!body.prompt || typeof body.prompt !== 'string') throw new Error('prompt is required');
        const issueId = body.issueId || body.id;
        updateStatus({
          statusFile,
          issueId,
          status: 'working',
          message: 'Running Claude analysis',
        });
        const result = await runClaude(body.prompt);
        const data = updateClaudeResult({ statusFile, issueId, result });
        sendJson(response, 200, {
          issueId,
          claude: result,
          status: data,
        });
        return;
      }

      const requested = url.pathname === '/' ? path.basename(DEFAULT_HTML) : decodeURIComponent(url.pathname.slice(1));
      const file = path.resolve(dir, requested);
      if (!file.startsWith(`${dir}${path.sep}`) && file !== dir) {
        response.writeHead(403);
        response.end('Forbidden');
        return;
      }
      if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        response.writeHead(404);
        response.end('Not found');
        return;
      }
      response.writeHead(200, { 'content-type': contentType(file), 'cache-control': 'no-store' });
      fs.createReadStream(file).pipe(response);
    } catch (error) {
      sendJson(response, 500, { error: error.message });
    }
  });

  server.listen(port, host, () => {
    console.log(JSON.stringify({
      url: `http://${host}:${port}/`,
      statusApi: `http://${host}:${port}/api/status`,
      statusFile,
    }, null, 2));
  });
} else {
  throw new Error(`Unknown command: ${command}`);
}
