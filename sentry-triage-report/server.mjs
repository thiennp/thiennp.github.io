#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, renameSync, statSync, watch, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { basename, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.SENTRY_TRIAGE_REPORT_PORT || process.env.PORT || 8766);
const APP_PATH = join(ROOT, 'index.html');
const REPORT_DATA_PATH = join(ROOT, 'report-data.json');
const EVIDENCE_DIR = join(ROOT, 'evidence');
const UPDATE_STATUS_PATH = join(ROOT, 'manual-update-status.json');
const WORKFLOW_STATUS_PATH = join(ROOT, 'workflow-status.json');
const DEFAULT_UPDATE_SCRIPT = join(ROOT, 'manual_update_report.sh');
const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const MAX_REQUEST_BYTES = Number(process.env.SENTRY_TRIAGE_REPORT_MAX_REQUEST_BYTES || 2 * 1024 * 1024);
const CLAUDE_COMMAND = process.env.SENTRY_TRIAGE_CLAUDE_COMMAND || '/opt/homebrew/bin/claude';
const CLAUDE_TIMEOUT_MS = Number(process.env.SENTRY_TRIAGE_CLAUDE_TIMEOUT_MS || 45000);

const clients = new Set();
let broadcastTimer = null;
let dataBroadcastTimer = null;
let workflowBroadcastTimer = null;
let updateBroadcastTimer = null;
let updateProcess = null;

function loadUpdateState() {
  if (!existsSync(UPDATE_STATUS_PATH)) {
    return {
      running: false,
      status: 'idle',
      message: 'Manual update has not run yet.',
      startedAt: null,
      completedAt: null,
      exitCode: null,
      logTail: '',
    };
  }

  try {
    const state = JSON.parse(readFileSync(UPDATE_STATUS_PATH, 'utf8'));
    if (state.running) {
      return {
        ...state,
        running: false,
        status: 'stale',
        message: 'Previous manual update did not finish cleanly.',
        completedAt: new Date().toISOString(),
      };
    }
    return state;
  } catch {
    return {
      running: false,
      status: 'unknown',
      message: 'Manual update status could not be read.',
      startedAt: null,
      completedAt: null,
      exitCode: null,
      logTail: '',
    };
  }
}

let updateState = loadUpdateState();

function loadWorkflowState() {
  if (!existsSync(WORKFLOW_STATUS_PATH)) {
    return {
      status: 'idle',
      step: '',
      title: '',
      message: 'No workflow status has been reported yet.',
      pre: null,
      sentryKey: null,
      sentryIssueId: null,
      repo: null,
      pr: null,
      phase: null,
      url: null,
      source: null,
      updatedAt: null,
    };
  }

  try {
    return normalizeWorkflowState(JSON.parse(readFileSync(WORKFLOW_STATUS_PATH, 'utf8')));
  } catch {
    return {
      status: 'unknown',
      step: '',
      title: 'Workflow status unreadable',
      message: 'workflow-status.json could not be read.',
      pre: null,
      sentryKey: null,
      sentryIssueId: null,
      repo: null,
      pr: null,
      phase: null,
      url: null,
      source: null,
      updatedAt: new Date().toISOString(),
    };
  }
}

let workflowState = loadWorkflowState();
let uiState = {
  status: 'unknown',
  activeIssueId: null,
  activeSentryKey: null,
  activeUrl: null,
  activeJiraKeys: [],
  workflowUpdatedAt: null,
  highlightedCount: 0,
  sourceScopeHighlighted: false,
  visibleFeedHighlighted: false,
  renderedAt: null,
  clientUrl: null,
};

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
};

function contentType(pathname) {
  return contentTypes[extname(pathname)] || 'application/octet-stream';
}

function noStoreHeaders(type) {
  return {
    'content-type': type,
    'cache-control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    pragma: 'no-cache',
    expires: '0',
  };
}

function writeJson(res, status, body) {
  res.writeHead(status, noStoreHeaders('application/json; charset=utf-8'));
  res.end(JSON.stringify(body, null, 2));
}

function publicUpdateState() {
  return {
    running: updateState.running,
    status: updateState.status,
    message: updateState.message,
    pre: updateState.pre || null,
    startedAt: updateState.startedAt,
    completedAt: updateState.completedAt,
    exitCode: updateState.exitCode,
    logTail: updateState.logTail,
  };
}

function cleanText(value, maxLength = 240) {
  if (value === null || value === undefined) {
    return null;
  }
  const text = String(value).replace(/\s+/g, ' ').trim();
  return text ? text.slice(0, maxLength) : null;
}

function normalizeWorkflowState(input = {}) {
  const pre = cleanText(input.pre || input.preKey || input.jiraKey, 24);
  const sentryKey = cleanText(input.sentryKey || input.sentry || input.issueKey, 80);
  const sentryIssueId = cleanText(input.sentryIssueId || input.issueId || input.groupId, 80);
  const repo = cleanText(input.repo || input.repository, 80);
  const pr = cleanText(input.pr || input.prNumber || input.pullRequest, 32);
  const step = cleanText(input.step || input.stepNumber, 32);
  const phase = cleanText(input.phase || input.stage || input.currentPhase || input.currentStep, 80);
  const title = cleanText(input.title || input.stepTitle, 160);
  const message = cleanText(input.message || input.text || input.body, 600);
  const source = cleanText(input.source, 120);
  const url = cleanText(input.url || input.evidenceUrl, 600);
  const status = cleanText(input.status, 32) || 'info';

  return {
    status,
    step: step || '',
    title: title || '',
    message: message || '',
    pre: pre && /^PRE-\d+$/i.test(pre) ? pre.toUpperCase() : pre,
    sentryKey,
    sentryIssueId,
    repo,
    pr,
    phase,
    url,
    source,
    updatedAt: cleanText(input.updatedAt || input.checkedAt, 80) || new Date().toISOString(),
  };
}

function atomicWriteFile(path, contents) {
  const tmpPath = `${path}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(tmpPath, contents);
  renameSync(tmpPath, path);
}

function atomicWriteJson(path, body) {
  atomicWriteFile(path, `${JSON.stringify(body, null, 2)}\n`);
}

function saveUpdateState() {
  atomicWriteJson(UPDATE_STATUS_PATH, publicUpdateState());
}

function broadcastUpdateState(reason = 'manual update status changed') {
  const message = {
    type: 'report:update',
    reason,
    update: publicUpdateState(),
    report: reportMetadata(),
  };

  for (const client of clients) {
    send(client, message);
  }
}

function scheduleUpdateStateBroadcast(reason) {
  clearTimeout(updateBroadcastTimer);
  updateBroadcastTimer = setTimeout(() => {
    updateState = loadUpdateState();
    broadcastUpdateState(reason);
  }, 250);
}

function publicWorkflowState() {
  return workflowState;
}

function normalizeUiState(input = {}) {
  return {
    status: cleanText(input.status, 32) || 'rendered',
    activeIssueId: cleanText(input.activeIssueId || input.sentryIssueId || input.issueId, 80),
    activeSentryKey: cleanText(input.activeSentryKey || input.sentryKey, 120),
    activeUrl: cleanText(input.activeUrl || input.url, 600),
    activeJiraKeys: Array.isArray(input.activeJiraKeys)
      ? input.activeJiraKeys.map((key) => cleanText(key, 80)).filter(Boolean)
      : [],
    workflowUpdatedAt: cleanText(input.workflowUpdatedAt, 80),
    highlightedCount: Number(input.highlightedCount || 0),
    sourceScopeHighlighted: input.sourceScopeHighlighted === true,
    visibleFeedHighlighted: input.visibleFeedHighlighted === true,
    renderedAt: cleanText(input.renderedAt, 80) || new Date().toISOString(),
    clientUrl: cleanText(input.clientUrl, 600),
  };
}

function publicUiState() {
  return uiState;
}

function setUiState(nextState) {
  uiState = normalizeUiState(nextState);
  return uiState;
}

function saveWorkflowState() {
  atomicWriteJson(WORKFLOW_STATUS_PATH, publicWorkflowState());
}

function broadcastWorkflowState(reason = 'workflow status changed') {
  const message = {
    type: 'workflow:status',
    reason,
    workflow: publicWorkflowState(),
    report: reportMetadata(),
  };

  for (const client of clients) {
    send(client, message);
  }
}

function scheduleWorkflowBroadcast(reason) {
  clearTimeout(workflowBroadcastTimer);
  workflowBroadcastTimer = setTimeout(() => {
    workflowState = loadWorkflowState();
    broadcastWorkflowState(reason);
  }, 250);
}

function setWorkflowState(nextState) {
  workflowState = normalizeWorkflowState(nextState);
  saveWorkflowState();
  broadcastWorkflowState();
  return workflowState;
}

function setUpdateState(patch) {
  updateState = {
    ...updateState,
    ...patch,
  };
  saveUpdateState();
  broadcastUpdateState();
}

function appendLogTail(chunk) {
  const text = chunk.toString();
  const nextTail = `${updateState.logTail || ''}${text}`;
  setUpdateState({
    logTail: nextTail.slice(-4000),
  });
}

function updateCommandConfig() {
  if (process.env.SENTRY_TRIAGE_UPDATE_COMMAND) {
    return {
      command: process.env.SENTRY_TRIAGE_UPDATE_COMMAND,
      args: [],
      shell: true,
      configured: true,
      source: 'SENTRY_TRIAGE_UPDATE_COMMAND',
    };
  }

  if (existsSync(DEFAULT_UPDATE_SCRIPT)) {
    return {
      command: DEFAULT_UPDATE_SCRIPT,
      args: [],
      shell: false,
      configured: true,
      source: DEFAULT_UPDATE_SCRIPT,
    };
  }

  return {
    command: null,
    args: [],
    shell: false,
    configured: false,
    source: null,
  };
}

function startManualUpdate(context = {}) {
  if (updateProcess) {
    return {
      accepted: false,
      statusCode: 409,
      body: {
        ok: false,
        error: 'Manual update is already running.',
        update: publicUpdateState(),
      },
    };
  }

  const config = updateCommandConfig();
  if (!config.configured) {
    setUpdateState({
      running: false,
      status: 'not-configured',
      message: 'No manual update command is configured.',
      completedAt: new Date().toISOString(),
      exitCode: null,
      logTail: '',
    });
    return {
      accepted: false,
      statusCode: 501,
      body: {
        ok: false,
        error: 'No manual update command is configured.',
        hint: 'Set SENTRY_TRIAGE_UPDATE_COMMAND or create manual_update_report.sh next to live-report-server.mjs.',
        update: publicUpdateState(),
      },
    };
  }

  const pre = typeof context.pre === 'string' && /^PRE-\d+$/i.test(context.pre.trim())
    ? context.pre.trim().toUpperCase()
    : '';
  const title = typeof context.title === 'string' ? context.title.trim().slice(0, 160) : '';
  const scopeLabel = pre ? `item ${pre}` : 'all tracked items';

  setUpdateState({
    running: true,
    status: 'running',
    message: `Refreshing ${scopeLabel}: PR, Sentry, Jira, Jenkins, Sonar, staging, and release status.`,
    pre: pre || null,
    startedAt: new Date().toISOString(),
    completedAt: null,
    exitCode: null,
    logTail: `Starting ${config.source}\n`,
  });

  updateProcess = spawn(config.command, config.args, {
    cwd: ROOT,
    env: {
      ...process.env,
      SENTRY_TRIAGE_REPORT_DIR: ROOT,
      SENTRY_TRIAGE_REPORT_APP_PATH: APP_PATH,
      SENTRY_TRIAGE_REPORT_DATA_PATH: REPORT_DATA_PATH,
      SENTRY_TRIAGE_REFRESH_PRE: pre,
      SENTRY_TRIAGE_REFRESH_TITLE: title,
    },
    shell: config.shell,
  });

  updateProcess.stdout.on('data', appendLogTail);
  updateProcess.stderr.on('data', appendLogTail);
  updateProcess.on('error', (error) => {
    updateProcess = null;
    setUpdateState({
      running: false,
      status: 'failed',
      message: `Manual update could not start: ${error.message}`,
      pre: null,
      completedAt: new Date().toISOString(),
      exitCode: null,
    });
  });
  updateProcess.on('close', (code) => {
    updateProcess = null;
    setUpdateState({
      running: false,
      status: code === 0 ? 'succeeded' : 'failed',
      message: code === 0
        ? `${pre ? `${pre} refresh` : 'Manual update'} finished. Live data will update automatically if facts changed.`
        : `${pre ? `${pre} refresh` : 'Manual update'} failed with exit code ${code}.`,
      pre,
      completedAt: new Date().toISOString(),
      exitCode: code,
    });
  });

  return {
    accepted: true,
    statusCode: 202,
    body: {
      ok: true,
      update: publicUpdateState(),
    },
  };
}

function truncateForClaude(value, maxLength = 1600) {
  if (value === null || value === undefined) {
    return value;
  }
  const text = String(value).replace(/\s+/g, ' ').trim();
  return text.length > maxLength ? `${text.slice(0, maxLength)}... [truncated]` : text;
}

function compactForClaude(value, depth = 0) {
  if (value === null || value === undefined || typeof value === 'boolean' || typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string') {
    return truncateForClaude(value);
  }
  if (depth >= 5) {
    return '[truncated depth]';
  }
  if (Array.isArray(value)) {
    return value.slice(0, 24).map((entry) => compactForClaude(entry, depth + 1));
  }
  if (!isObject(value)) {
    return truncateForClaude(value);
  }
  const output = {};
  for (const [key, entry] of Object.entries(value)) {
    if (entry === null || entry === undefined || entry === '') {
      continue;
    }
    output[key] = compactForClaude(entry, depth + 1);
  }
  return output;
}

function findReportContext(data, requestedPre) {
  const pre = normalizePre(requestedPre);
  if (!pre || !isObject(data)) {
    return null;
  }
  const item = Array.isArray(data.triageItems)
    ? data.triageItems.find((candidate) => normalizePre(candidate?.pre) === pre)
    : null;
  const status = isObject(data.statusByPre?.[pre]) ? data.statusByPre[pre] : {};
  if (!item && !Object.keys(status).length) {
    return null;
  }
  return {
    pre,
    item: item || { pre },
    status,
    reportLastUpdated: data.lastUpdated || null,
  };
}

function buildClaudeEvaluationPrompt(context) {
  const payload = compactForClaude({
    generatedAt: new Date().toISOString(),
    reportLastUpdated: context.reportLastUpdated,
    pre: context.pre,
    triageItem: context.item,
    statusByPre: context.status,
  });
  return [
    'Bạn là Claude, đang giúp Thien Nguyen đọc một dòng trong CHECK24 Energie Sentry/Jira/PR triage report.',
    'Hãy trả lời hoàn toàn bằng tiếng Việt, rõ ràng, thực dụng, không dài dòng.',
    'Chỉ dùng dữ liệu JSON được cung cấp. Nếu dữ liệu thiếu hoặc không chắc, hãy nói "chưa rõ" thay vì đoán.',
    'Mục tiêu: giải thích toàn bộ lịch sử issue theo dữ liệu report, trạng thái hiện tại, rủi ro, và đề xuất hành động tiếp theo cho Thien.',
    'Không yêu cầu chạy lệnh, không chỉnh code, không chuyển Jira, không resolve Sentry. Đây chỉ là phân tích.',
    '',
    'Định dạng Markdown bắt buộc:',
    '## Tóm tắt nhanh',
    '## Lịch sử issue',
    '## Trạng thái hiện tại',
    '## Việc đã làm / bằng chứng',
    '## Rủi ro hoặc điểm chưa chắc',
    '## Hành động tiếp theo',
    '',
    'JSON report context:',
    JSON.stringify(payload, null, 2),
  ].join('\n');
}

function cleanClaudeText(value) {
  return String(value || '')
    .replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, '')
    .trim();
}

function runClaudeEvaluation(context) {
  return new Promise((resolve, reject) => {
    if (CLAUDE_COMMAND.startsWith('/') && !existsSync(CLAUDE_COMMAND)) {
      reject(new Error(`Claude command not found at ${CLAUDE_COMMAND}`));
      return;
    }

    const prompt = buildClaudeEvaluationPrompt(context);
    const child = spawn(CLAUDE_COMMAND, [
      '-p',
      '--output-format',
      'text',
      '--no-session-persistence',
      '--permission-mode',
      'dontAsk',
      '--tools',
      '',
    ], {
      cwd: ROOT,
      env: {
        ...process.env,
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
    }, CLAUDE_TIMEOUT_MS);

    child.stdout.on('data', (chunk) => {
      stdout = `${stdout}${chunk.toString()}`.slice(-24000);
    });
    child.stderr.on('data', (chunk) => {
      stderr = `${stderr}${chunk.toString()}`.slice(-8000);
    });
    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      const text = cleanClaudeText(stdout);
      if (timedOut) {
        reject(new Error(`Claude evaluation timed out after ${CLAUDE_TIMEOUT_MS}ms`));
        return;
      }
      if (code !== 0) {
        reject(new Error(cleanClaudeText(stderr) || `Claude exited with code ${code}`));
        return;
      }
      if (!text) {
        reject(new Error('Claude returned an empty evaluation'));
        return;
      }
      resolve(text);
    });

    child.stdin.end(prompt);
  });
}

function readJsonRequest(req, callback) {
  let raw = '';
  let done = false;
  const finish = (error, value) => {
    if (done) {
      return;
    }
    done = true;
    callback(error, value);
  };
  req.on('data', (chunk) => {
    if (done) {
      return;
    }
    raw += chunk;
    if (raw.length > MAX_REQUEST_BYTES) {
      finish(new Error(`request body is larger than ${MAX_REQUEST_BYTES} bytes`));
      req.destroy();
    }
  });
  req.on('error', (error) => {
    finish(error);
  });
  req.on('end', () => {
    if (done) {
      return;
    }
    if (!raw.trim()) {
      finish(null, {});
      return;
    }
    try {
      finish(null, JSON.parse(raw));
    } catch (error) {
      finish(error);
    }
  });
}

function reportMetadata() {
  const appStat = existsSync(APP_PATH) ? statSync(APP_PATH) : null;
  const dataStat = existsSync(REPORT_DATA_PATH) ? statSync(REPORT_DATA_PATH) : null;
  return {
    ok: Boolean(appStat && dataStat),
    appPath: APP_PATH,
    appUpdatedAt: appStat ? appStat.mtime.toISOString() : null,
    dataPath: REPORT_DATA_PATH,
    dataUpdatedAt: dataStat ? dataStat.mtime.toISOString() : null,
    dataBytes: dataStat ? dataStat.size : null,
    clients: clients.size,
  };
}

function readReportData() {
  if (!existsSync(REPORT_DATA_PATH)) {
    return null;
  }
  const data = JSON.parse(readFileSync(REPORT_DATA_PATH, 'utf8'));
  const validation = validateReportData(data);
  if (!validation.valid) {
    throw new Error(`report-data.json schema check failed: ${validation.errors.slice(0, 8).join('; ')}`);
  }
  return data;
}

function replaceReportData(nextData) {
  const validation = validateReportData(nextData);
  if (!validation.valid) {
    const error = new Error(`report-data.json schema check failed: ${validation.errors.slice(0, 8).join('; ')}`);
    error.validation = validation;
    throw error;
  }
  atomicWriteJson(REPORT_DATA_PATH, nextData);
  broadcastReportData('report data updated through API');
  return nextData;
}

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizePre(value) {
  const text = typeof value === 'string' || typeof value === 'number'
    ? String(value).trim().toUpperCase()
    : '';
  return /^PRE-\d+$/i.test(text) ? text : '';
}

function normalizeSentryIssueId(value) {
  if (value === undefined || value === null) {
    return '';
  }
  const text = String(value).trim();
  if (/^\d+$/.test(text)) {
    return text;
  }
  const match = text.match(/\/issues\/(\d+)(?:[/?#]|$)/i);
  return match ? match[1] : '';
}

function normalizeSentryKey(value) {
  return typeof value === 'string' ? value.trim().toUpperCase() : '';
}

function sentryIdentity(record) {
  if (!isObject(record)) {
    return {
      issueId: '',
      key: '',
    };
  }
  return {
    issueId: firstNonEmpty(
      normalizeSentryIssueId(record.sentryIssueId),
      normalizeSentryIssueId(record.sentryUrl),
      normalizeSentryIssueId(record.sentryStatusDetails?.url),
      normalizeSentryIssueId(record.sentryLink),
    ),
    key: firstNonEmpty(
      normalizeSentryKey(record.sentryKey),
      normalizeSentryKey(record.sentryIssueKey),
      normalizeSentryKey(record.sentry),
    ),
  };
}

function firstNonEmpty(...values) {
  return values.find((value) => typeof value === 'string' && value.trim()) || '';
}

function isSentryOutOfScope(record) {
  if (!isObject(record)) {
    return false;
  }
  if (record.outOfScope === true || record.sentryOutOfScope === true) {
    return true;
  }
  const scopeText = [
    record.scopeStatus,
    record.sentryScope,
    record.sentryScopeStatus,
    record.reason,
  ].map((value) => String(value || '').toLowerCase());
  return scopeText.some((value) => value === 'out-of-scope' || value === 'out-of-scope-not-in-union');
}

function sentrySourceItemId(item) {
  if (!isObject(item)) {
    return '';
  }
  return firstNonEmpty(
    normalizeSentryIssueId(item.id),
    normalizeSentryIssueId(item.sentryIssueId),
    normalizeSentryIssueId(item.sentryUrl),
    normalizeSentryIssueId(item.permalink),
  );
}

function sentryVerificationIds(verification) {
  if (!isObject(verification)) {
    return [];
  }
  if (Array.isArray(verification.unionIds)) {
    return verification.unionIds.map((id) => normalizeSentryIssueId(id)).filter(Boolean);
  }
  if (Array.isArray(verification.union)) {
    return verification.union.map((item) => sentrySourceItemId(item)).filter(Boolean);
  }
  return [];
}

function validateReportData(data) {
  const errors = [];
  if (!isObject(data)) {
    return {
      valid: false,
      errors: ['root must be an object'],
    };
  }

  if (typeof data.lastUpdated !== 'string' || !data.lastUpdated.trim()) {
    errors.push('lastUpdated must be a non-empty string');
  }
  if (!Array.isArray(data.triageItems)) {
    errors.push('triageItems must be an array');
  }
  if (!isObject(data.statusByPre)) {
    errors.push('statusByPre must be an object');
  }

  const seenPre = new Set();
  const recordsByPre = new Map();
  for (const [index, item] of (Array.isArray(data.triageItems) ? data.triageItems : []).entries()) {
    if (!isObject(item)) {
      errors.push(`triageItems[${index}] must be an object`);
      continue;
    }
    if (typeof item.pre !== 'string' || !/^PRE-\d+$/i.test(item.pre)) {
      errors.push(`triageItems[${index}].pre must look like PRE-1234`);
      continue;
    }
    const pre = item.pre.toUpperCase();
    if (seenPre.has(pre)) {
      errors.push(`duplicate triage item ${pre}`);
    }
    seenPre.add(pre);
    if (typeof item.title !== 'string' || !item.title.trim()) {
      errors.push(`${pre}.title must be a non-empty string`);
    }
    if (typeof item.repo !== 'string' || !item.repo.trim()) {
      errors.push(`${pre}.repo must be a non-empty string`);
    }
    if (isObject(data.statusByPre) && !isObject(data.statusByPre[pre])) {
      errors.push(`statusByPre.${pre} must exist and be an object`);
    }
    const mergedRecord = {
      ...item,
      ...(isObject(data.statusByPre) && isObject(data.statusByPre[pre]) ? data.statusByPre[pre] : {}),
      pre,
    };
    if (isSentryOutOfScope(mergedRecord)) {
      errors.push(`${pre} is marked out of the current Sentry union scope and must be removed from active triageItems/statusByPre instead of shown`);
    }
    recordsByPre.set(pre, mergedRecord);
  }

  for (const [pre, status] of Object.entries(isObject(data.statusByPre) ? data.statusByPre : {})) {
    if (!/^PRE-\d+$/i.test(pre)) {
      errors.push(`statusByPre key ${pre} must look like PRE-1234`);
    }
    if (!isObject(status)) {
      errors.push(`statusByPre.${pre} must be an object`);
      continue;
    }
    for (const field of ['sentry', 'jira']) {
      if (status[field] !== undefined && typeof status[field] !== 'string') {
        errors.push(`statusByPre.${pre}.${field} must be a string when present`);
      }
    }
    if (status.pr !== undefined && !['string', 'number'].includes(typeof status.pr)) {
      errors.push(`statusByPre.${pre}.pr must be a string or number when present`);
    }
    const normalizedPre = normalizePre(pre);
    if (normalizedPre && isSentryOutOfScope(status)) {
      errors.push(`statusByPre.${normalizedPre} is marked out of the current Sentry union scope and must be removed instead of kept active`);
    }
    if (normalizedPre && !recordsByPre.has(normalizedPre)) {
      recordsByPre.set(normalizedPre, {
        ...status,
        pre: normalizedPre,
      });
    }
  }

  for (const [pre, record] of recordsByPre.entries()) {
    for (const field of ['duplicateOf', 'duplicatePre']) {
      const duplicatePre = normalizePre(record[field]);
      if (!duplicatePre) {
        continue;
      }
      const duplicateRecord = recordsByPre.get(duplicatePre);
      if (!duplicateRecord) {
        errors.push(`${pre}.${field} references missing ${duplicatePre}; verify the Jira ticket in Chrome before grouping`);
        continue;
      }
      const currentIdentity = sentryIdentity(record);
      const duplicateIdentity = sentryIdentity(duplicateRecord);
      const issueIdsDiffer = currentIdentity.issueId && duplicateIdentity.issueId && currentIdentity.issueId !== duplicateIdentity.issueId;
      const keysDiffer = currentIdentity.key && duplicateIdentity.key && currentIdentity.key !== duplicateIdentity.key;
      if (issueIdsDiffer || (!currentIdentity.issueId && !duplicateIdentity.issueId && keysDiffer)) {
        const currentLabel = currentIdentity.issueId || currentIdentity.key || 'unknown Sentry issue';
        const duplicateLabel = duplicateIdentity.issueId || duplicateIdentity.key || 'unknown Sentry issue';
        errors.push(
          `${pre}.${field} points to ${duplicatePre}, but their Sentry identities differ (${currentLabel} vs ${duplicateLabel}); open both Jira tickets in Chrome and use coveredByPre/groupedIntoPre instead unless Jira explicitly links them as duplicates`,
        );
      }
    }
  }

  const sourceVerification = isObject(data.sentrySourceVerification) ? data.sentrySourceVerification : null;
  const sourceItems = Array.isArray(data.sentryScopeItems) ? data.sentryScopeItems : null;
  if (sourceVerification || sourceItems) {
    if (!sourceVerification) {
      errors.push('sentrySourceVerification must exist when sentryScopeItems exists');
    } else if (sourceVerification.status !== 'verified') {
      errors.push('sentrySourceVerification.status must be "verified" before the live report can pass');
    }
    if (!sourceItems) {
      errors.push('sentryScopeItems must exist when sentrySourceVerification exists');
    }
    const expectedIds = new Set(sentryVerificationIds(sourceVerification));
    const actualIds = new Set();
    for (const [index, item] of (sourceItems || []).entries()) {
      const id = sentrySourceItemId(item);
      if (!id) {
        errors.push(`sentryScopeItems[${index}] must include a Sentry issue id or URL`);
        continue;
      }
      if (actualIds.has(id)) {
        errors.push(`duplicate sentryScopeItems issue ${id}`);
      }
      actualIds.add(id);
      if (typeof item.shortId !== 'string' || !item.shortId.trim()) {
        errors.push(`sentryScopeItems[${index}].shortId must be a non-empty string`);
      }
      if (typeof item.title !== 'string' || !item.title.trim()) {
        errors.push(`sentryScopeItems[${index}].title must be a non-empty string`);
      }
    }
    if (expectedIds.size > 0) {
      const missing = [...expectedIds].filter((id) => !actualIds.has(id));
      const extra = [...actualIds].filter((id) => !expectedIds.has(id));
      if (missing.length) {
        errors.push(`sentryScopeItems is missing ${missing.length} union issue(s): ${missing.slice(0, 10).join(', ')}`);
      }
      if (extra.length) {
        errors.push(`sentryScopeItems has ${extra.length} issue(s) outside the verified union: ${extra.slice(0, 10).join(', ')}`);
      }
      if (Number(sourceVerification.unionCount || expectedIds.size) !== actualIds.size) {
        errors.push(`sentryScopeItems count ${actualIds.size} does not match verified union count ${sourceVerification.unionCount || expectedIds.size}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

function websocketFrame(text) {
  const payload = Buffer.from(text);
  const header = [0x81];

  if (payload.length < 126) {
    header.push(payload.length);
  } else if (payload.length < 65536) {
    header.push(126, (payload.length >> 8) & 255, payload.length & 255);
  } else {
    header.push(127, 0, 0, 0, 0);
    header.push(
      (payload.length / 2 ** 24) & 255,
      (payload.length / 2 ** 16) & 255,
      (payload.length / 2 ** 8) & 255,
      payload.length & 255,
    );
  }

  return Buffer.concat([Buffer.from(header), payload]);
}

function send(socket, message) {
  if (socket.writable) {
    socket.write(websocketFrame(JSON.stringify(message)));
  }
}

function broadcastReload(reason = 'app shell changed') {
  const message = {
    type: 'report:reload',
    reason,
    report: reportMetadata(),
  };

  for (const client of clients) {
    send(client, message);
  }
}

function scheduleReload(reason) {
  clearTimeout(broadcastTimer);
  broadcastTimer = setTimeout(() => broadcastReload(reason), 250);
}

function broadcastReportData(reason = 'report data changed') {
  let data = null;
  let error = null;
  try {
    data = readReportData();
  } catch (readError) {
    error = readError.message;
  }

  const message = {
    type: 'report:data',
    reason,
    report: reportMetadata(),
    data,
    error,
  };

  for (const client of clients) {
    send(client, message);
  }
}

function scheduleDataBroadcast(reason) {
  clearTimeout(dataBroadcastTimer);
  dataBroadcastTimer = setTimeout(() => broadcastReportData(reason), 250);
}

function acceptWebSocket(req, socket) {
  const key = req.headers['sec-websocket-key'];
  if (!key) {
    socket.destroy();
    return;
  }

  const accept = createHash('sha1').update(`${key}${WS_GUID}`).digest('base64');
  socket.write([
    'HTTP/1.1 101 Switching Protocols',
    'Upgrade: websocket',
    'Connection: Upgrade',
    `Sec-WebSocket-Accept: ${accept}`,
    '',
    '',
  ].join('\r\n'));

  clients.add(socket);
  socket.on('close', () => clients.delete(socket));
  socket.on('error', () => clients.delete(socket));
  socket.on('data', (chunk) => {
    const opcode = chunk[0] & 0x0f;
    if (opcode === 0x8) {
      clients.delete(socket);
      socket.write(Buffer.from([0x88, 0x00]));
      socket.end();
    }
  });
  let data = null;
  let error = null;
  try {
    data = readReportData();
  } catch (readError) {
    error = readError.message;
  }
  send(socket, {
    type: 'report:connected',
    report: reportMetadata(),
    data,
    error,
    update: publicUpdateState(),
    workflow: publicWorkflowState(),
  });
}

function serveReport(res) {
  if (!existsSync(APP_PATH)) {
    writeJson(res, 404, {
      ok: false,
      error: `Missing live app shell at ${APP_PATH}`,
    });
    return;
  }

  res.writeHead(200, noStoreHeaders(contentType(APP_PATH)));
  res.end(readFileSync(APP_PATH));
}

function serveEvidence(pathname, res) {
  let relativePath = '';
  try {
    relativePath = decodeURIComponent(pathname.slice('/evidence/'.length));
  } catch {
    writeJson(res, 400, {
      ok: false,
      error: 'Invalid evidence path',
    });
    return;
  }
  const filePath = resolve(EVIDENCE_DIR, relativePath);
  const evidenceRoot = resolve(EVIDENCE_DIR);
  if (!filePath.startsWith(`${evidenceRoot}${sep}`) || !existsSync(filePath) || !statSync(filePath).isFile()) {
    writeJson(res, 404, {
      ok: false,
      error: 'Evidence not found',
    });
    return;
  }

  res.writeHead(200, noStoreHeaders(contentType(filePath)));
  res.end(readFileSync(filePath));
}

const server = createServer((req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || `${HOST}:${PORT}`}`);

  if (url.pathname === '/healthz') {
    writeJson(res, 200, {
      ...reportMetadata(),
      update: publicUpdateState(),
      workflow: publicWorkflowState(),
      ui: publicUiState(),
    });
    return;
  }

  if (url.pathname === '/api/ui-state') {
    if (req.method === 'GET') {
      writeJson(res, 200, {
        ok: true,
        ui: publicUiState(),
      });
      return;
    }

    if (req.method !== 'POST') {
      writeJson(res, 405, {
        ok: false,
        error: 'Use GET to read or POST to update UI render state.',
      });
      return;
    }

    readJsonRequest(req, (error, context) => {
      if (error) {
        writeJson(res, 400, {
          ok: false,
          error: `Invalid UI state JSON: ${error.message}`,
        });
        return;
      }
      writeJson(res, 200, {
        ok: true,
        ui: setUiState(context),
      });
    });
    return;
  }

  if (url.pathname === '/api/workflow-status') {
    if (req.method === 'GET') {
      writeJson(res, 200, {
        ok: true,
        workflow: publicWorkflowState(),
      });
      return;
    }

    if (req.method !== 'POST') {
      writeJson(res, 405, {
        ok: false,
        error: 'Use GET to read or POST to update workflow status.',
      });
      return;
    }

    readJsonRequest(req, (error, context) => {
      if (error) {
        writeJson(res, 400, {
          ok: false,
          error: `Invalid workflow status JSON: ${error.message}`,
        });
        return;
      }
      writeJson(res, 200, {
        ok: true,
        workflow: setWorkflowState(context),
      });
    });
    return;
  }

  if (url.pathname === '/api/update-status') {
    writeJson(res, 200, {
      ok: true,
      update: publicUpdateState(),
    });
    return;
  }

  if (url.pathname === '/api/report-data') {
    if (req.method !== 'GET' && req.method !== 'PUT' && req.method !== 'POST') {
      writeJson(res, 405, {
        ok: false,
        error: 'Use GET to read or PUT/POST to replace report data.',
      });
      return;
    }

    if (req.method !== 'GET') {
      readJsonRequest(req, (error, requestBody) => {
        if (error) {
          writeJson(res, 400, {
            ok: false,
            error: `Invalid report data JSON: ${error.message}`,
          });
          return;
        }
        try {
          const nextData = isObject(requestBody) && isObject(requestBody.data)
            ? requestBody.data
            : requestBody;
          replaceReportData(nextData);
          writeJson(res, 200, {
            ok: true,
            report: reportMetadata(),
          });
        } catch (replaceError) {
          writeJson(res, 422, {
            ok: false,
            error: replaceError.message,
            validation: replaceError.validation || null,
          });
        }
      });
      return;
    }

    try {
      const data = readReportData();
      if (!data) {
        writeJson(res, 404, {
          ok: false,
          error: `Missing live report data at ${REPORT_DATA_PATH}`,
        });
        return;
      }
      writeJson(res, 200, data);
    } catch (error) {
      writeJson(res, 500, {
        ok: false,
        error: `Could not read live report data: ${error.message}`,
      });
    }
    return;
  }

  if (url.pathname === '/api/live-update') {
    if (req.method !== 'POST') {
      writeJson(res, 405, {
        ok: false,
        error: 'Use POST to push a live workflow, update, or report-data change.',
      });
      return;
    }

    readJsonRequest(req, (error, requestBody) => {
      if (error) {
        writeJson(res, 400, {
          ok: false,
          error: `Invalid live update JSON: ${error.message}`,
        });
        return;
      }

      const applied = [];
      try {
        const reason = cleanText(requestBody.reason, 240) || 'live update API';
        if (isObject(requestBody.workflow)) {
          setWorkflowState({
            ...requestBody.workflow,
            source: requestBody.workflow.source || requestBody.source || 'live-update-api',
          });
          applied.push('workflow');
        }
        if (isObject(requestBody.update)) {
          setUpdateState(requestBody.update);
          applied.push('update');
        }
        const nextData = isObject(requestBody.data)
          ? requestBody.data
          : isObject(requestBody.reportData)
            ? requestBody.reportData
            : null;
        if (nextData) {
          replaceReportData(nextData);
          applied.push('reportData');
        }
        if (requestBody.reload) {
          broadcastReload(reason);
          applied.push('reload');
        }
        if (!applied.length) {
          writeJson(res, 400, {
            ok: false,
            error: 'Provide workflow, update, data/reportData, or reload=true.',
          });
          return;
        }
        writeJson(res, 200, {
          ok: true,
          applied,
          report: reportMetadata(),
          workflow: publicWorkflowState(),
          update: publicUpdateState(),
        });
      } catch (liveUpdateError) {
        writeJson(res, 422, {
          ok: false,
          applied,
          error: liveUpdateError.message,
          validation: liveUpdateError.validation || null,
        });
      }
    });
    return;
  }

  if (url.pathname === '/api/report-validation') {
    try {
      const data = existsSync(REPORT_DATA_PATH)
        ? JSON.parse(readFileSync(REPORT_DATA_PATH, 'utf8'))
        : null;
      const validation = data
        ? validateReportData(data)
        : { valid: false, errors: [`Missing live report data at ${REPORT_DATA_PATH}`] };
      writeJson(res, validation.valid ? 200 : 422, {
        ok: validation.valid,
        ...validation,
        report: reportMetadata(),
      });
    } catch (error) {
      writeJson(res, 500, {
        ok: false,
        valid: false,
        errors: [`Could not validate live report data: ${error.message}`],
        report: reportMetadata(),
      });
    }
    return;
  }

  if (url.pathname === '/api/claude-evaluate') {
    if (req.method !== 'POST') {
      writeJson(res, 405, {
        ok: false,
        error: 'Use POST to evaluate a report item with Claude.',
      });
      return;
    }

    readJsonRequest(req, (error, requestBody) => {
      if (error) {
        writeJson(res, 400, {
          ok: false,
          error: `Invalid Claude evaluation request JSON: ${error.message}`,
        });
        return;
      }

      let data = null;
      let context = null;
      try {
        data = readReportData();
        context = findReportContext(data, requestBody.pre);
      } catch (readError) {
        writeJson(res, 500, {
          ok: false,
          error: `Could not read live report data for Claude evaluation: ${readError.message}`,
        });
        return;
      }

      if (!context) {
        writeJson(res, 404, {
          ok: false,
          error: `No report item found for ${requestBody.pre || 'unknown PRE'}.`,
        });
        return;
      }

      runClaudeEvaluation(context)
        .then((evaluation) => {
          writeJson(res, 200, {
            ok: true,
            pre: context.pre,
            source: 'claude-cli',
            generatedAt: new Date().toISOString(),
            evaluation,
          });
        })
        .catch((claudeError) => {
          writeJson(res, 502, {
            ok: false,
            pre: context.pre,
            source: 'claude-cli',
            error: claudeError.message,
          });
        });
    });
    return;
  }

  if (url.pathname === '/api/update') {
    if (req.method !== 'POST') {
      writeJson(res, 405, {
        ok: false,
        error: 'Use POST to start a manual update.',
      });
      return;
    }

    readJsonRequest(req, (error, context) => {
      if (error) {
        writeJson(res, 400, {
          ok: false,
          error: `Invalid update request JSON: ${error.message}`,
        });
        return;
      }
      const result = startManualUpdate(context);
      writeJson(res, result.statusCode, result.body);
    });
    return;
  }

  if (url.pathname === '/' || url.pathname === '/index.html') {
    serveReport(res);
    return;
  }

  if (url.pathname.startsWith('/evidence/')) {
    serveEvidence(url.pathname, res);
    return;
  }

  writeJson(res, 404, {
    ok: false,
    error: 'Not found',
  });
});

server.on('upgrade', (req, socket) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || `${HOST}:${PORT}`}`);
  if (url.pathname !== '/ws') {
    socket.destroy();
    return;
  }
  acceptWebSocket(req, socket);
});

server.listen(PORT, HOST, () => {
  console.log(`Live Sentry triage report: http://${HOST}:${PORT}/`);
  console.log(`WebSocket endpoint: ws://${HOST}:${PORT}/ws`);
});

watch(ROOT, { persistent: true }, (_eventType, filename) => {
  const changed = filename ? filename.toString() : '';
  if (!changed || changed === basename(APP_PATH)) {
    scheduleReload('app shell changed');
  }
  if (!changed || changed === basename(REPORT_DATA_PATH)) {
    scheduleDataBroadcast('report data changed');
  }
  if (!changed || changed === basename(WORKFLOW_STATUS_PATH)) {
    scheduleWorkflowBroadcast('workflow status changed');
  }
  if (!changed || changed === basename(UPDATE_STATUS_PATH)) {
    scheduleUpdateStateBroadcast('manual update status changed');
  }
});
