#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { closeSync, openSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const snapshotPath = process.argv[2] || process.env.SENTRY_SNAPSHOT_JSON;
const reportApi = process.env.SENTRY_TRIAGE_REPORT_API || 'http://127.0.0.1:8766/api/report-data';
const workflowApi = process.env.SENTRY_TRIAGE_WORKFLOW_API || 'http://127.0.0.1:8766/api/workflow-status';
const uiStateApi = process.env.SENTRY_TRIAGE_UI_STATE_API || 'http://127.0.0.1:8766/api/ui-state';
const statusPath = process.env.SENTRY_ISSUE_JIRA_SCAN_STATUS_JSON || join(scriptDir, 'issue-jira-scan-status.json');
const targetListUrl = process.env.SENTRY_SNAPSHOT_URL || 'https://check24-energie.sentry.io/issues/?project=-1&query=is%3Aunresolved&referrer=issue-list&sort=freq&statsPeriod=24h';
const scanLimit = Number(process.env.SENTRY_ISSUE_JIRA_SCAN_LIMIT || 25);
const pageTimeoutMs = Number(process.env.SENTRY_ISSUE_JIRA_SCAN_PAGE_TIMEOUT_MS || 20000);
const settleMs = Number(process.env.SENTRY_ISSUE_JIRA_SCAN_SETTLE_MS || 900);
const uiAckTimeoutMs = Number(process.env.SENTRY_ISSUE_JIRA_SCAN_UI_ACK_TIMEOUT_MS || 10000);
const uiAckPollMs = Number(process.env.SENTRY_ISSUE_JIRA_SCAN_UI_ACK_POLL_MS || 250);
const uiAckConsecutiveMatches = Number(process.env.SENTRY_ISSUE_JIRA_SCAN_UI_ACK_CONSECUTIVE_MATCHES || 2);
const requestedMinChromeDwellMs = Number(process.env.SENTRY_ISSUE_JIRA_SCAN_MIN_CHROME_DWELL_MS || 5000);
const minChromeDwellMs = Math.max(5000, Number.isFinite(requestedMinChromeDwellMs) ? requestedMinChromeDwellMs : 5000);
const jiraBaseUrl = String(process.env.SENTRY_TRIAGE_JIRA_BASE_URL || process.env.JIRA_BASE_URL || 'https://c24-energie.atlassian.net').replace(/\/+$/, '');
const jiraEmail = process.env.SENTRY_TRIAGE_JIRA_EMAIL || process.env.JIRA_EMAIL || process.env.ATLASSIAN_EMAIL || 'thien.nguyen@check24.de';
const jiraApiToken = process.env.SENTRY_TRIAGE_JIRA_API_TOKEN || process.env.JIRA_API_TOKEN || '';
const jiraProjectKey = process.env.SENTRY_TRIAGE_JIRA_PROJECT || process.env.JIRA_PROJECT || 'PRE';
const jiraIssueTypeName = process.env.SENTRY_TRIAGE_JIRA_ISSUE_TYPE || 'Bug';
const jiraAssigneeAccountId = process.env.SENTRY_TRIAGE_JIRA_ASSIGNEE_ACCOUNT_ID || '712020:98c2de13-71c4-48ae-a98a-3baa7fa11ba2';
const jiraReporterAccountId = process.env.SENTRY_TRIAGE_JIRA_REPORTER_ACCOUNT_ID || jiraAssigneeAccountId;
const jiraAssignUnassigned = !/^(0|false|no)$/i.test(String(process.env.SENTRY_TRIAGE_JIRA_ASSIGN_UNASSIGNED || '1'));
const jiraCreateMissing = !/^(0|false|no)$/i.test(String(process.env.SENTRY_TRIAGE_JIRA_CREATE_MISSING || '1'));
const jiraDryRun = /^(1|true|yes)$/i.test(String(process.env.SENTRY_TRIAGE_JIRA_DRY_RUN || '0'));
const source = 'sentry-chrome-tab-snapshot-detail-scan';
const EXIT = {
  SUCCESS: 0,
  PRECONDITION: 1,
  AUTH: 2,
};

class AuthAbort extends Error {
  constructor(message, row, detailState) {
    super(message);
    this.name = 'AuthAbort';
    this.row = row;
    this.detailState = detailState;
  }
}

class UiAckAbort extends Error {
  constructor(message, row, lastUiState) {
    super(message);
    this.name = 'UiAckAbort';
    this.row = row;
    this.lastUiState = lastUiState;
  }
}

if (!snapshotPath) {
  fail('Missing snapshot path. Pass the full snapshot JSON path as argv[2] or set SENTRY_SNAPSHOT_JSON.');
}

function fail(message, extra = {}) {
  writeStatus({
    ok: false,
    status: 'failed',
    finishedAt: new Date().toISOString(),
    message,
    ...extra,
  });
  console.error(`[${source}] ${message}`);
  process.exit(1);
}

function log(message) {
  console.error(`[${source}] ${message}`);
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function summarizeChromeDwell(row, startedAtMs, label) {
  const id = issueIdFrom(row.issueId || row.issueUrl);
  const processingMs = Math.max(0, Date.now() - startedAtMs);
  const enforcedSleepMs = Math.max(0, minChromeDwellMs - processingMs);
  if (enforcedSleepMs > 0) {
    log(`CHROME_DWELL: keeping ${label} focused for ${enforcedSleepMs}ms to satisfy the ${minChromeDwellMs}ms minimum.`);
    sleep(enforcedSleepMs);
  }
  return {
    issueId: id,
    sentryKey: firstShortId(row, id) || id,
    issueUrl: canonicalIssueUrl(row.issueUrl, id),
    startedAt: new Date(startedAtMs).toISOString(),
    processingMs,
    enforcedSleepMs,
    totalDwellMs: Math.max(0, Date.now() - startedAtMs),
    minChromeDwellMs,
  };
}

function atomicWriteJson(file, data) {
  const dir = dirname(file);
  const tmp = join(dir, `.${basename(file)}.tmp-${process.pid}-${Date.now()}`);
  const fd = openSync(tmp, 'w', 0o600);
  try {
    writeFileSync(fd, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  } finally {
    closeSync(fd);
  }
  renameSync(tmp, file);
}

function writeStatus(status) {
  atomicWriteJson(statusPath, status);
}

function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf8'));
}

function cleanText(value, maxLength = 600) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function firstPresent(...values) {
  return values.find((value) => cleanText(value, 1000));
}

function issueIdFrom(value) {
  if (value === null || value === undefined) return '';
  const text = String(value);
  if (/^\d+$/.test(text)) return text;
  const match = text.match(/\/issues\/(\d+)/);
  return match ? match[1] : '';
}

function canonicalIssueUrl(value, id = issueIdFrom(value)) {
  return id ? `https://check24-energie.sentry.io/issues/${id}/` : cleanText(value, 1000);
}

function jiraUrl(key) {
  return `https://c24-energie.atlassian.net/browse/${key}`;
}

function jiraAuthConfigured() {
  return Boolean(jiraBaseUrl && jiraEmail && jiraApiToken && jiraAssigneeAccountId);
}

function jiraAuthHeader() {
  return `Basic ${Buffer.from(`${jiraEmail}:${jiraApiToken}`).toString('base64')}`;
}

function escapeJqlText(value) {
  return cleanText(value, 160).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

async function jiraRequest(path, {method = 'GET', body} = {}) {
  if (!jiraAuthConfigured()) {
    throw new Error('Jira REST credentials are not configured.');
  }
  const response = await fetch(`${jiraBaseUrl}${path}`, {
    method,
    headers: {
      accept: 'application/json',
      authorization: jiraAuthHeader(),
      ...(body ? {'content-type': 'application/json'} : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.errorMessages?.join('; ') ||
      Object.values(payload?.errors || {}).join('; ') ||
      `Jira HTTP ${response.status}`;
    throw new Error(message);
  }
  return payload;
}

function adfParagraph(text) {
  return {
    type: 'paragraph',
    content: cleanText(text, 1200)
      ? [{type: 'text', text: cleanText(text, 1200)}]
      : [],
  };
}

function sentryIssueSummary(row, id = issueIdFrom(row.issueId || row.issueUrl)) {
  const key = firstShortId(row, id);
  const title = cleanText(row.issueTitle || row.title || row.culprit || 'Unresolved Sentry issue', 180);
  return `[Sentry] ${key ? `${key}: ` : ''}${title}`.slice(0, 250);
}

function sentryIssueDescription(row, detailState, id = issueIdFrom(row.issueId || row.issueUrl)) {
  const url = detailState?.url || canonicalIssueUrl(row.issueUrl, id);
  const lines = [
    `Sentry issue: ${url}`,
    `Short id: ${firstShortId(row, id) || id}`,
    row.project ? `Project: ${row.project}` : '',
    row.issueTitle ? `Title: ${row.issueTitle}` : '',
    row.culprit ? `Culprit: ${row.culprit}` : '',
    row.eventCount || row.frequency ? `Events/frequency: ${firstPresent(row.eventCount, row.frequency)}` : '',
    row.userCount ? `Users: ${row.userCount}` : '',
    row.lastSeenText ? `Last seen: ${row.lastSeenText}` : '',
    '',
    'Created automatically because the Sentry detail scan found no attached Jira ticket.',
  ].filter((line) => line !== '');
  return {
    type: 'doc',
    version: 1,
    content: lines.map(adfParagraph),
  };
}

async function assignJiraTicketIfUnassigned(ticket) {
  const normalized = normalizeTicket(ticket);
  if (!normalized || !jiraAssignUnassigned) {
    return {type: 'assign', key: normalized?.key || '', status: 'skipped'};
  }
  if (jiraDryRun) {
    return {type: 'assign', key: normalized.key, status: 'dry-run', message: 'Would assign if currently unassigned.'};
  }
  const issue = await jiraRequest(`/rest/api/3/issue/${encodeURIComponent(normalized.key)}?fields=assignee`);
  const assignee = issue?.fields?.assignee || null;
  if (assignee?.accountId) {
    return {
      type: 'assign',
      key: normalized.key,
      status: 'already-assigned',
      assignee: cleanText(assignee.displayName || assignee.accountId, 160),
    };
  }
  await jiraRequest(`/rest/api/3/issue/${encodeURIComponent(normalized.key)}/assignee`, {
    method: 'PUT',
    body: {accountId: jiraAssigneeAccountId},
  });
  return {type: 'assign', key: normalized.key, status: 'assigned', assignee: 'Thien Nguyen'};
}

async function createJiraTicketForSentry(row, detailState) {
  if (!jiraCreateMissing) {
    return {ticket: null, action: {type: 'create', status: 'disabled', projectKey: jiraProjectKey}};
  }
  const id = issueIdFrom(row.issueId || row.issueUrl);
  if (jiraDryRun) {
    return {
      ticket: null,
      action: {
        type: 'create',
        status: 'dry-run',
        projectKey: jiraProjectKey,
        issueType: jiraIssueTypeName,
        summary: sentryIssueSummary(row, id),
      },
    };
  }
  const existing = await findExistingJiraForSentry(row);
  if (existing) {
    return {
      ticket: existing,
      action: {
        type: 'create',
        status: 'deduped-existing',
        key: existing.key,
        url: existing.url,
        projectKey: jiraProjectKey,
        issueType: jiraIssueTypeName,
        message: 'Found an existing PRE issue before creating a new one.',
      },
    };
  }
  const payload = await jiraRequest('/rest/api/3/issue', {
    method: 'POST',
    body: {
      fields: {
        project: {key: jiraProjectKey},
        issuetype: {name: jiraIssueTypeName},
        reporter: {accountId: jiraReporterAccountId},
        assignee: {accountId: jiraAssigneeAccountId},
        summary: sentryIssueSummary(row, id),
        description: sentryIssueDescription(row, detailState, id),
      },
    },
  });
  const key = cleanText(payload.key, 80);
  const ticket = normalizeTicket({
    key,
    url: key ? jiraUrl(key) : cleanText(payload.self, 1000),
    text: key || 'Created Jira issue',
    source: 'jira-created-by-automation',
  });
  return {
    ticket,
    action: {
      type: 'create',
      status: ticket ? 'created' : 'created-without-key',
      key: ticket?.key || '',
      url: ticket?.url || cleanText(payload.self, 1000),
      projectKey: jiraProjectKey,
      issueType: jiraIssueTypeName,
      assignee: 'Thien Nguyen',
    },
  };
}

async function findExistingJiraForSentry(row) {
  const id = issueIdFrom(row.issueId || row.issueUrl);
  const key = firstShortId(row, id);
  const terms = [key, id].filter((term) => cleanText(term, 160));
  for (const term of terms) {
    const params = new URLSearchParams({
      jql: `project = ${jiraProjectKey} AND text ~ "${escapeJqlText(term)}" ORDER BY updated DESC`,
      maxResults: '1',
      fields: 'key,summary',
    });
    const result = await jiraRequest(`/rest/api/3/search/jql?${params.toString()}`);
    const issue = Array.isArray(result.issues) ? result.issues[0] : null;
    if (issue?.key) {
      return normalizeTicket({
        key: issue.key,
        url: jiraUrl(issue.key),
        text: issue.fields?.summary || issue.key,
        source: 'jira-deduped-by-sentry-text',
      });
    }
  }
  return null;
}

async function preflightJiraWrites() {
  if (jiraDryRun || (!jiraCreateMissing && !jiraAssignUnassigned)) {
    return {
      ok: true,
      dryRun: jiraDryRun,
      message: jiraDryRun ? 'Jira dry-run enabled; no Jira write endpoints will be called.' : 'Jira writes disabled.',
    };
  }
  if (!jiraAuthConfigured()) {
    return {
      ok: false,
      code: 'jira_auth_missing',
      message: 'Jira REST credentials or assignee account id are missing.',
    };
  }
  try {
    const me = await jiraRequest('/rest/api/3/myself');
    await jiraRequest(`/rest/api/3/project/${encodeURIComponent(jiraProjectKey)}`);
    return {
      ok: true,
      accountId: cleanText(me.accountId, 160),
      displayName: cleanText(me.displayName, 160),
      projectKey: jiraProjectKey,
    };
  } catch (error) {
    return {
      ok: false,
      code: 'jira_preflight_failed',
      message: error.message,
    };
  }
}

async function ensureJiraTicketActions(row, detailState, tickets) {
  const actions = [];
  const currentTickets = mergeTickets(tickets);
  if (!jiraAuthConfigured()) {
    actions.push({
      type: currentTickets.length ? 'assign' : 'create',
      status: 'blocked',
      message: 'Jira REST credentials are not configured.',
      projectKey: jiraProjectKey,
    });
    return {tickets: currentTickets, actions};
  }
  if (currentTickets.length) {
    for (const ticket of currentTickets) {
      actions.push(await assignJiraTicketIfUnassigned(ticket));
    }
    return {tickets: currentTickets, actions};
  }
  const created = await createJiraTicketForSentry(row, detailState);
  actions.push(created.action);
  return {
    tickets: mergeTickets(currentTickets, created.ticket ? [created.ticket] : []),
    actions,
  };
}

function normalizeTicket(ticket) {
  if (!ticket) return null;
  const key = cleanText(ticket.key || ticket, 80).toUpperCase();
  if (!/^[A-Z][A-Z0-9]+-\d+$/.test(key)) return null;
  return {
    key,
    url: cleanText(ticket.url || ticket.href || jiraUrl(key), 1000),
    text: cleanText(ticket.text || key, 240),
    source: cleanText(ticket.source || 'sentry-detail-page', 120),
  };
}

function mergeTickets(...groups) {
  const byKey = new Map();
  for (const group of groups) {
    for (const raw of Array.isArray(group) ? group : []) {
      const ticket = normalizeTicket(raw);
      if (!ticket) continue;
      const existing = byKey.get(ticket.key) || {};
      byKey.set(ticket.key, {
        ...existing,
        ...ticket,
        source: [existing.source, ticket.source].filter(Boolean).join(', ') || ticket.source,
      });
    }
  }
  return [...byKey.values()].sort((a, b) => a.key.localeCompare(b.key));
}

function rowTickets(row) {
  return mergeTickets((Array.isArray(row.linkedJiraKeys) ? row.linkedJiraKeys : []).map((ticket) => ({
    key: ticket.key || ticket,
    url: ticket.href || ticket.url,
    text: ticket.key || ticket.text || ticket,
    source: 'sentry-list-row',
  })));
}

function itemTickets(item = {}) {
  return mergeTickets(
    item.jiraTickets,
    (Array.isArray(item.jiraTicketKeys) ? item.jiraTicketKeys : []).map((key) => ({key, source: 'existing-report'})),
    (Array.isArray(item.linkedJiraKeys) ? item.linkedJiraKeys : []).map((ticket) => ({
      key: ticket.key || ticket,
      url: ticket.href || ticket.url,
      text: ticket.key || ticket.text || ticket,
      source: ticket.source || 'existing-report',
    })),
    item.jiraTicket ? [{key: item.jiraTicket, url: item.jiraTicketUrl, source: 'existing-report'}] : [],
    item.jiraKey ? [{key: item.jiraKey, source: 'existing-report'}] : [],
  );
}

function firstShortId(row, id) {
  if (Array.isArray(row.sentryShortIds)) {
    const value = row.sentryShortIds.map((item) => cleanText(item, 120)).find(Boolean);
    if (value) return value;
  }
  return id;
}

function runJxa(sourceText) {
  return execFileSync('/usr/bin/osascript', ['-l', 'JavaScript'], {
    input: sourceText,
    encoding: 'utf8',
    maxBuffer: 80 * 1024 * 1024,
  }).trim();
}

function navigateActiveTab(url) {
  runJxa(`
const chrome = Application('Google Chrome');
if (!chrome.running()) throw new Error('Google Chrome is not running');
chrome.activate();
const w = chrome.windows()[0];
w.index = 1;
const t = w.tabs()[w.activeTabIndex() - 1];
t.url = ${JSON.stringify(url)};
'navigated';
`);
}

function activeTabState() {
  return JSON.parse(runJxa(`
const chrome = Application('Google Chrome');
const w = chrome.windows()[0];
const t = w.tabs()[w.activeTabIndex() - 1];
JSON.stringify({title: t.title(), url: t.url(), loading: t.loading()});
`));
}

function executeActiveTabJavascript(js) {
  return runJxa(`
const chrome = Application('Google Chrome');
const w = chrome.windows()[0];
const t = w.tabs()[w.activeTabIndex() - 1];
t.execute({javascript: ${JSON.stringify(js)}});
`);
}

function waitForPage(issueId) {
  const start = Date.now();
  let state = activeTabState();
  while (Date.now() - start < pageTimeoutMs) {
    state = activeTabState();
    if (!state.loading && (!issueId || String(state.url || '').includes(issueId))) {
      sleep(settleMs);
      return state;
    }
    sleep(500);
  }
  return state;
}

function extractDetailJiraTickets() {
  const js = `(() => {
    const clean = value => (value || '').replace(/\\s+/g, ' ').trim();
    const absolute = value => { try { return new URL(value, location.href).href; } catch { return value || ''; } };
    const tickets = [];
    const add = (key, url, text, source) => {
      const normalized = clean(key).toUpperCase();
      if (!/^[A-Z][A-Z0-9]+-\\d+$/.test(normalized)) return;
      if (!tickets.some(ticket => ticket.key === normalized)) {
        tickets.push({key: normalized, url: url || '', text: clean(text) || normalized, source});
      }
    };
    for (const link of [...document.querySelectorAll('a[href]')]) {
      const href = absolute(link.getAttribute('href'));
      const match = href.match(/atlassian\\.net\\/browse\\/([A-Z][A-Z0-9]+-\\d+)/i);
      if (match) add(match[1], href, link.textContent, 'atlassian-link');
    }
    const likelySections = [...document.querySelectorAll('aside, section, [role="complementary"], [data-test-id*="issue"], [data-test-id*="sidebar"]')]
      .filter(node => /jira|linked|external|ticket|issue/i.test(clean(node.innerText).slice(0, 1200)));
    for (const section of likelySections) {
      for (const match of clean(section.innerText).matchAll(/\\b(?:PRE|OPS)-\\d+\\b/g)) {
        add(match[0], '', match[0], 'jira-section-text');
      }
    }
    const body = clean(document.body ? document.body.innerText : '');
    if (!tickets.length) {
      for (const match of body.matchAll(/\\b(?:PRE|OPS)-\\d+\\b/g)) {
        add(match[0], '', match[0], 'body-text-fallback');
      }
    }
    const loginish = /sign in|log in|login|authenticate/i.test(document.title + ' ' + body.slice(0, 800));
    return JSON.stringify({
      title: document.title,
      url: location.href,
      readyState: document.readyState,
      authState: loginish ? 'login_or_auth_required' : 'issue_detail_loaded',
      tickets,
      bodySample: tickets.length ? '' : body.slice(0, 500)
    });
  })()`;
  return JSON.parse(executeActiveTabJavascript(js));
}

async function postJson(url, body) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {'content-type': 'application/json'},
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.ok === false) {
    throw new Error(payload.error || `HTTP ${response.status}`);
  }
  return payload;
}

async function putJson(url, body) {
  const response = await fetch(url, {
    method: 'PUT',
    headers: {'content-type': 'application/json'},
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.ok === false) {
    throw new Error(payload.error || `HTTP ${response.status}`);
  }
  return payload;
}

async function getJson(url) {
  const response = await fetch(url, {cache: 'no-store'});
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.ok === false) {
    throw new Error(payload.error || `HTTP ${response.status}`);
  }
  return payload;
}

async function getReport() {
  return getJson(reportApi);
}

function workflowNeighbor(row) {
  if (!row) {
    return {
      sentryIssueId: undefined,
      sentryKey: undefined,
      url: undefined,
    };
  }
  const id = issueIdFrom(row.issueId || row.issueUrl);
  return {
    sentryIssueId: id || undefined,
    sentryKey: firstShortId(row, id) || undefined,
    url: id ? canonicalIssueUrl(row.issueUrl, id) : undefined,
  };
}

async function signalWorkflow(row, index, total, message, status = 'active', scanRequestId = randomUUID(), context = {}) {
  const id = issueIdFrom(row.issueId || row.issueUrl);
  const key = firstShortId(row, id);
  const previous = workflowNeighbor(context.previousRow);
  const next = workflowNeighbor(context.nextRow);
  try {
    const payload = await postJson(workflowApi, {
      status,
      step: `${index + 1}/${total}`,
      title: 'Sentry Jira link scan',
      message,
      phase: 'jira-link-scan',
      sentryIssueId: id,
      sentryKey: key,
      url: canonicalIssueUrl(row.issueUrl, id),
      source,
      scanRequestId,
      previousSentryIssueId: previous.sentryIssueId,
      previousSentryKey: previous.sentryKey,
      previousUrl: previous.url,
      nextSentryIssueId: next.sentryIssueId,
      nextSentryKey: next.sentryKey,
      nextUrl: next.url,
    });
    return payload.workflow || null;
  } catch (error) {
    log(`WORKFLOW_SIGNAL_WARNING: ${error.message}`);
    return null;
  }
}

function uiAckMatches(ui, row, workflow, expectedJiraKeys = []) {
  if (!ui || typeof ui !== 'object') return false;
  const id = issueIdFrom(row.issueId || row.issueUrl);
  const key = firstShortId(row, id);
  const uiIssueId = issueIdFrom(ui.activeIssueId || ui.activeUrl);
  const sameIssue = uiIssueId === id ||
    cleanText(ui.activeSentryKey, 120).toUpperCase() === cleanText(key, 120).toUpperCase() ||
    cleanText(ui.activeUrl, 1000).includes(id);
  const sameWorkflow = !workflow?.updatedAt || cleanText(ui.workflowUpdatedAt, 80) === cleanText(workflow.updatedAt, 80);
  const sameRequest = !workflow?.scanRequestId || cleanText(ui.scanRequestId, 120) === cleanText(workflow.scanRequestId, 120);
  const highlighted = Number(ui.highlightedCount || 0) > 0 && (ui.sourceScopeHighlighted === true || ui.visibleFeedHighlighted === true);
  const focused = ui.activeCardVisible === true && ui.activeCardFocused === true;
  const expectsPrevious = Boolean(workflow?.previousSentryIssueId || workflow?.previousSentryKey || workflow?.previousUrl);
  const expectsNext = Boolean(workflow?.nextSentryIssueId || workflow?.nextSentryKey || workflow?.nextUrl);
  const previousVisible = !expectsPrevious || ui.previousHighlighted === true || Number(ui.previousHighlightedCount || 0) > 0;
  const nextVisible = !expectsNext || ui.nextHighlighted === true || Number(ui.nextHighlightedCount || 0) > 0;
  const uiKeys = new Set((Array.isArray(ui.activeJiraKeys) ? ui.activeJiraKeys : []).map((item) => cleanText(item, 80).toUpperCase()));
  const jiraVisible = expectedJiraKeys.every((ticket) => uiKeys.has(cleanText(ticket, 80).toUpperCase()));
  return sameIssue && sameWorkflow && sameRequest && highlighted && focused && previousVisible && nextVisible && jiraVisible;
}

async function waitForUiAck(row, workflow, expectedJiraKeys = [], label = 'active issue') {
  const started = Date.now();
  let lastUiState = null;
  let consecutiveMatches = 0;
  while (Date.now() - started < uiAckTimeoutMs) {
    try {
      const payload = await getJson(uiStateApi);
      lastUiState = payload.ui || null;
      if (uiAckMatches(lastUiState, row, workflow, expectedJiraKeys)) {
        consecutiveMatches += 1;
        if (consecutiveMatches >= Math.max(1, uiAckConsecutiveMatches)) {
          return lastUiState;
        }
      } else {
        consecutiveMatches = 0;
      }
    } catch (error) {
      consecutiveMatches = 0;
      lastUiState = {error: error.message};
    }
    sleep(uiAckPollMs);
  }
  const id = issueIdFrom(row.issueId || row.issueUrl);
  throw new UiAckAbort(`UI did not acknowledge/render ${label} for Sentry issue ${id} within ${uiAckTimeoutMs}ms.`, row, lastUiState);
}

function patchSentryItem(item, id, tickets, checkedAt, detailState, row, jiraActions = []) {
  const itemId = issueIdFrom(item?.id || item?.sentryIssueId || item?.issueId || item?.sentryUrl || item?.permalink || item?.url);
  if (itemId !== id) return item;
  const existingTickets = itemTickets(item);
  const mergedTickets = mergeTickets(existingTickets, rowTickets(row), tickets);
  const ticketKeys = mergedTickets.map((ticket) => ticket.key);
  const foundThisRun = mergeTickets(rowTickets(row), tickets).length > 0;
  const jiraActionBlocked = jiraActions.some((action) => action.status === 'blocked');
  const jiraCreateDryRun = jiraActions.some((action) => action.type === 'create' && action.status === 'dry-run');
  const jiraTicketCreated = jiraActions.some((action) => action.type === 'create' && action.status === 'created');
  return {
    ...item,
    jiraTickets: mergedTickets,
    jiraTicketKeys: ticketKeys,
    linkedJiraKeys: mergedTickets.map((ticket) => ({
      key: ticket.key,
      href: ticket.url || jiraUrl(ticket.key),
      source: ticket.source,
    })),
    jiraScanStatus: jiraActionBlocked
      ? 'jira-action-blocked'
      : jiraCreateDryRun
        ? 'jira-create-dry-run'
        : ticketKeys.length
          ? (jiraTicketCreated ? 'jira-ticket-created' : (foundThisRun ? 'jira-ticket-found' : 'jira-ticket-known-from-report'))
          : 'no-jira-ticket-found',
    lastJiraLinkScanAt: checkedAt,
    lastJiraLinkScanUrl: detailState.url || canonicalIssueUrl(row.issueUrl, id),
    lastJiraLinkScanTitle: detailState.title || '',
    lastJiraAutomationActions: jiraActions,
  };
}

async function updateReport(row, detailState, checkedAt, results, index, total, ensuredTickets = [], jiraActions = []) {
  const report = await getReport();
  const id = issueIdFrom(row.issueId || row.issueUrl);
  const tickets = mergeTickets(rowTickets(row), detailState.tickets, ensuredTickets);
  const patchItem = (item) => patchSentryItem(item, id, tickets, checkedAt, detailState, row, jiraActions);
  const lastFeed = report.lastSentryFeedSnapshot && typeof report.lastSentryFeedSnapshot === 'object'
    ? report.lastSentryFeedSnapshot
    : {};
  const nextResults = [...results];
  const existingIndex = nextResults.findIndex((item) => item.issueId === id);
  const result = {
    issueId: id,
    sentryKey: firstShortId(row, id),
    issueTitle: cleanText(row.issueTitle, 500),
    issueUrl: canonicalIssueUrl(row.issueUrl, id),
    checkedAt,
    rowIndex: row.rowIndex || index + 1,
    jiraTicketKeys: tickets.map((ticket) => ticket.key),
    jiraTickets: tickets,
    status: jiraActions.some((action) => action.status === 'blocked')
      ? 'jira-action-blocked'
      : jiraActions.some((action) => action.type === 'create' && action.status === 'dry-run')
        ? 'jira-create-dry-run'
        : jiraActions.some((action) => action.type === 'create' && action.status === 'created')
          ? 'jira-ticket-created'
          : (tickets.length ? 'jira-ticket-found' : 'no-jira-ticket-found'),
    authState: detailState.authState || null,
    jiraActions,
  };
  if (existingIndex >= 0) nextResults[existingIndex] = result;
  else nextResults.push(result);

  const next = {
    ...report,
    lastUpdated: checkedAt,
    sentryScopeItems: Array.isArray(report.sentryScopeItems) ? report.sentryScopeItems.map(patchItem) : report.sentryScopeItems,
    lastSentryFeedSnapshot: {
      ...lastFeed,
      items: Array.isArray(lastFeed.items) ? lastFeed.items.map(patchItem) : [],
      untrackedEligibleCandidates: Array.isArray(lastFeed.untrackedEligibleCandidates)
        ? lastFeed.untrackedEligibleCandidates.map(patchItem)
        : [],
    },
    lastChromeProfileSentryJiraScan: {
      checkedAt,
      status: index + 1 >= total ? 'complete' : 'running',
      source,
      scanLimit,
      totalIssueCount: total,
      checkedIssueCount: index + 1,
      foundIssueCount: nextResults.filter((item) => item.jiraTicketKeys.length).length,
      createdJiraIssueCount: nextResults.flatMap((item) => item.jiraActions || []).filter((action) => action.type === 'create' && action.status === 'created').length,
      assignedJiraIssueCount: nextResults.flatMap((item) => item.jiraActions || []).filter((action) => action.type === 'assign' && action.status === 'assigned').length,
      jiraDryRun,
      currentIssueId: index + 1 >= total ? null : id,
      currentIssueUrl: index + 1 >= total ? null : canonicalIssueUrl(row.issueUrl, id),
      results: nextResults,
    },
  };

  await putJson(reportApi, next);
  return nextResults;
}

const startedAt = new Date().toISOString();
const snapshot = readJson(snapshotPath);
const rows = (Array.isArray(snapshot.sentryIssueList?.rows) ? snapshot.sentryIssueList.rows : [])
  .filter((row) => issueIdFrom(row.issueId || row.issueUrl) && row.issueUrl)
  .slice(0, Math.max(0, scanLimit));

if (!rows.length) {
  writeStatus({
    ok: true,
    status: 'skipped',
    startedAt,
    finishedAt: new Date().toISOString(),
    message: 'No issue rows were available for Jira-link scanning.',
    checkedIssueCount: 0,
    foundIssueCount: 0,
    results: [],
  });
  console.log(JSON.stringify({ok: true, status: 'skipped', checkedIssueCount: 0, foundIssueCount: 0}, null, 2));
  process.exit(0);
}

const results = [];
let workflowSignals = 0;
let uiAcknowledgements = 0;
const chromeDwellRecords = [];
let errors = 0;
let authAbort = null;
let uiAckAbort = null;
const jiraPreflight = await preflightJiraWrites();

if (!jiraPreflight.ok) {
  const finishedAt = new Date().toISOString();
  writeStatus({
    ok: false,
    status: 'blocked',
    startedAt,
    finishedAt,
    checkedIssueCount: 0,
    plannedIssueCount: rows.length,
    foundIssueCount: 0,
    createdJiraIssueCount: 0,
    assignedJiraIssueCount: 0,
    blockedJiraActionCount: 1,
    jiraDryRun,
    jiraProjectKey,
    jiraIssueTypeName,
    jiraAssignee: 'Thien Nguyen',
    minChromeDwellMs,
    chromeDwellRecords,
    blocker: {
      type: 'JIRA_PREFLIGHT_FAILURE',
      code: jiraPreflight.code || 'jira_preflight_failed',
      message: jiraPreflight.message,
    },
    workflowSignals,
    uiAcknowledgements,
    focusedUiAcknowledgements: uiAcknowledgements,
    reportApi,
    workflowApi,
    uiStateApi,
    results,
  });
  console.log(JSON.stringify({
    ok: false,
    status: 'blocked',
    checkedIssueCount: 0,
    plannedIssueCount: rows.length,
    foundIssueCount: 0,
    createdJiraIssueCount: 0,
    assignedJiraIssueCount: 0,
    blockedJiraActionCount: 1,
    jiraDryRun,
    minChromeDwellMs,
    errorCount: 0,
    blocker: 'JIRA_PREFLIGHT_FAILURE',
    workflowSignals,
    uiAcknowledgements,
    focusedUiAcknowledgements: uiAcknowledgements,
  }, null, 2));
  process.exit(EXIT.PRECONDITION);
}

try {
  for (const [index, row] of rows.entries()) {
    const id = issueIdFrom(row.issueId || row.issueUrl);
    const url = canonicalIssueUrl(row.issueUrl, id);
    const key = firstShortId(row, id) || id;
    const workflowContext = {
      previousRow: rows[index - 1],
      nextRow: rows[index + 1],
    };
    let detailState = null;
    let chromeDwellStartedAt = 0;
    try {
      const openingWorkflow = await signalWorkflow(row, index, rows.length, `Opening ${key} to check attached Jira tickets.`, 'active', randomUUID(), workflowContext);
      if (openingWorkflow) {
        workflowSignals += 1;
        await waitForUiAck(row, openingWorkflow, [], 'opening highlight');
        uiAcknowledgements += 1;
      }
      navigateActiveTab(url);
      waitForPage(id);
      chromeDwellStartedAt = Date.now();
      detailState = extractDetailJiraTickets();
      if (detailState.authState === 'login_or_auth_required') {
        throw new AuthAbort(`Sentry detail page for ${id} requires login/authentication.`, row, detailState);
      }
      const initialTickets = mergeTickets(rowTickets(row), detailState.tickets);
      const jiraEnsure = await ensureJiraTicketActions(row, detailState, initialTickets);
      results.splice(0, results.length, ...(await updateReport(row, detailState, new Date().toISOString(), results, index, rows.length, jiraEnsure.tickets, jiraEnsure.actions)));
      const found = jiraEnsure.tickets.map((ticket) => ticket.key).join(', ') || 'no Jira ticket';
      const actionSummary = jiraEnsure.actions
        .map((action) => [action.type, action.status, action.key].filter(Boolean).join(':'))
        .join(', ');
      const resultWorkflow = await signalWorkflow(row, index, rows.length, `${key}: ${found}${actionSummary ? ` (${actionSummary})` : ''}. Moving to the next issue.`, 'active', randomUUID(), workflowContext);
      if (resultWorkflow) {
        workflowSignals += 1;
        const expectedKeys = jiraEnsure.tickets.map((ticket) => ticket.key);
        await waitForUiAck(row, resultWorkflow, expectedKeys, 'Jira scan result');
        uiAcknowledgements += 1;
      }
    } catch (error) {
      if (error instanceof AuthAbort) {
        authAbort = error;
        log(`AUTH_FAILURE: ${error.message}`);
        break;
      }
      if (error instanceof UiAckAbort) {
        uiAckAbort = error;
        log(`UI_ACK_FAILURE: ${error.message}`);
        break;
      }
      errors += 1;
      log(`ISSUE_SCAN_WARNING: ${id} ${error.message}`);
      results.push({
        issueId: id,
        sentryKey: key,
        issueTitle: cleanText(row.issueTitle, 500),
        issueUrl: url,
        checkedAt: new Date().toISOString(),
        rowIndex: row.rowIndex || index + 1,
        jiraTicketKeys: [],
        jiraTickets: [],
        status: 'scan-error',
        error: error.message,
      });
    } finally {
      if (chromeDwellStartedAt) {
        chromeDwellRecords.push(summarizeChromeDwell(row, chromeDwellStartedAt, `${key} (${id})`));
      }
    }
  }
} finally {
  try {
    navigateActiveTab(targetListUrl);
  } catch (error) {
    log(`RESTORE_TAB_WARNING: ${error.message}`);
  }
}

const finishedAt = new Date().toISOString();
const foundIssueCount = results.filter((item) => item.jiraTicketKeys.length).length;
const createdJiraIssueCount = results.flatMap((item) => item.jiraActions || []).filter((action) => action.type === 'create' && action.status === 'created').length;
const assignedJiraIssueCount = results.flatMap((item) => item.jiraActions || []).filter((action) => action.type === 'assign' && action.status === 'assigned').length;
const blockedJiraActionCount = results.flatMap((item) => item.jiraActions || []).filter((action) => action.status === 'blocked').length;
await postJson(workflowApi, {
  status: authAbort || uiAckAbort || errors ? 'blocked' : 'success',
  step: `${results.length}/${rows.length}`,
  title: authAbort
    ? 'Sentry Jira link scan auth blocked'
    : uiAckAbort
      ? 'Sentry Jira link scan UI sync blocked'
      : 'Sentry Jira link scan complete',
  message: authAbort
    ? `${authAbort.message} The scan stopped before writing a false no-ticket result.`
    : uiAckAbort
      ? `${uiAckAbort.message} The scan stopped so the next issue is not opened before the app reflects the current action.`
    : `Checked ${rows.length} visible Sentry issue(s); found Jira tickets for ${foundIssueCount}; created Jira tickets: ${createdJiraIssueCount}; assigned Jira tickets: ${assignedJiraIssueCount}; scan errors: ${errors}.`,
  phase: 'jira-link-scan',
  sentryIssueId: authAbort || uiAckAbort ? issueIdFrom((authAbort || uiAckAbort).row?.issueId || (authAbort || uiAckAbort).row?.issueUrl) : undefined,
  sentryKey: authAbort || uiAckAbort ? firstShortId((authAbort || uiAckAbort).row, issueIdFrom((authAbort || uiAckAbort).row?.issueId || (authAbort || uiAckAbort).row?.issueUrl)) : undefined,
  url: authAbort ? authAbort.detailState?.url || canonicalIssueUrl(authAbort.row?.issueUrl) : (uiAckAbort ? canonicalIssueUrl(uiAckAbort.row?.issueUrl) : undefined),
  source,
  updatedAt: finishedAt,
}).catch((error) => log(`WORKFLOW_COMPLETE_WARNING: ${error.message}`));

writeStatus({
  ok: !authAbort && !uiAckAbort && errors === 0,
  status: authAbort || uiAckAbort ? 'blocked' : (errors ? 'completed-with-warnings' : 'complete'),
  startedAt,
  finishedAt,
  checkedIssueCount: results.length,
  plannedIssueCount: rows.length,
  foundIssueCount,
  createdJiraIssueCount,
  assignedJiraIssueCount,
  blockedJiraActionCount,
  jiraDryRun,
  jiraProjectKey,
  jiraIssueTypeName,
  jiraAssignee: 'Thien Nguyen',
  jiraPreflight,
  uiAckConsecutiveMatches,
  minChromeDwellMs,
  chromeDwellWaitCount: chromeDwellRecords.filter((record) => record.enforcedSleepMs > 0).length,
  chromeDwellWaitMs: chromeDwellRecords.reduce((total, record) => total + record.enforcedSleepMs, 0),
  chromeDwellRecords,
  errorCount: errors,
  blocker: authAbort ? {
    type: 'AUTH_FAILURE',
    message: authAbort.message,
    issueId: issueIdFrom(authAbort.row?.issueId || authAbort.row?.issueUrl),
    url: authAbort.detailState?.url || canonicalIssueUrl(authAbort.row?.issueUrl),
  } : (uiAckAbort ? {
    type: 'UI_ACK_FAILURE',
    message: uiAckAbort.message,
    issueId: issueIdFrom(uiAckAbort.row?.issueId || uiAckAbort.row?.issueUrl),
    url: canonicalIssueUrl(uiAckAbort.row?.issueUrl),
    lastUiState: uiAckAbort.lastUiState,
  } : null),
  workflowSignals,
  uiAcknowledgements,
  focusedUiAcknowledgements: uiAcknowledgements,
  reportApi,
  workflowApi,
  uiStateApi,
  results,
});

console.log(JSON.stringify({
  ok: !authAbort && !uiAckAbort && errors === 0,
  status: authAbort || uiAckAbort ? 'blocked' : (errors ? 'completed-with-warnings' : 'complete'),
  checkedIssueCount: results.length,
  plannedIssueCount: rows.length,
  foundIssueCount,
  createdJiraIssueCount,
  assignedJiraIssueCount,
  blockedJiraActionCount,
  jiraDryRun,
  jiraPreflight,
  uiAckConsecutiveMatches,
  minChromeDwellMs,
  chromeDwellWaitCount: chromeDwellRecords.filter((record) => record.enforcedSleepMs > 0).length,
  chromeDwellWaitMs: chromeDwellRecords.reduce((total, record) => total + record.enforcedSleepMs, 0),
  errorCount: errors,
  blocker: authAbort ? 'AUTH_FAILURE' : (uiAckAbort ? 'UI_ACK_FAILURE' : null),
  workflowSignals,
  uiAcknowledgements,
  focusedUiAcknowledgements: uiAcknowledgements,
}, null, 2));

if (authAbort || uiAckAbort) {
  process.exit(authAbort ? EXIT.AUTH : EXIT.PRECONDITION);
}
