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
const jiraAssignViaChrome = !/^(0|false|no)$/i.test(String(process.env.SENTRY_TRIAGE_JIRA_ASSIGN_VIA_CHROME || '1'));
const sentryAttachJiraTickets = !/^(0|false|no)$/i.test(String(process.env.SENTRY_TRIAGE_ATTACH_JIRA_TO_SENTRY || '1'));
const sentrySyncAssignee = !/^(0|false|no)$/i.test(String(process.env.SENTRY_TRIAGE_SYNC_SENTRY_ASSIGNEE || '1'));
const jiraUiSettleMs = Number(process.env.SENTRY_TRIAGE_JIRA_UI_SETTLE_MS || 1200);
const sentryIssueTrackingSettleMs = Number(process.env.SENTRY_TRIAGE_SENTRY_ISSUE_TRACKING_SETTLE_MS || 1500);
const jiraUiActionTimeoutMs = Number(process.env.SENTRY_TRIAGE_JIRA_UI_ACTION_TIMEOUT_MS || 60000);
const sentryIssueTrackingActionTimeoutMs = Number(process.env.SENTRY_TRIAGE_SENTRY_ISSUE_TRACKING_ACTION_TIMEOUT_MS || 60000);
const uiActionPollMs = Number(process.env.SENTRY_TRIAGE_UI_ACTION_POLL_MS || 1000);
const standaloneMode = /^(1|true|yes)$/i.test(String(process.env.SENTRY_TRIAGE_STANDALONE || '0'));
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

function waitForUiAction(label, action, {timeoutMs, pollMs = uiActionPollMs, accept = (result) => result?.ok === true} = {}) {
  const startedAtMs = Date.now();
  const budgetMs = Math.max(0, Number.isFinite(timeoutMs) ? timeoutMs : 60000);
  let attempts = 0;
  let lastResult = null;
  while (Date.now() - startedAtMs <= budgetMs) {
    attempts += 1;
    try {
      lastResult = action();
    } catch (error) {
      lastResult = {ok: false, reason: error.message};
    }
    if (accept(lastResult)) {
      return {
        ...lastResult,
        attempts,
        waitedMs: Math.max(0, Date.now() - startedAtMs),
      };
    }
    sleep(Math.max(100, pollMs));
  }
  return {
    ...(lastResult || {}),
    ok: false,
    reason: `${label} timed out after ${budgetMs}ms${lastResult?.reason ? `: ${lastResult.reason}` : ''}`,
    attempts,
    waitedMs: Math.max(0, Date.now() - startedAtMs),
  };
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

function escapeRegExp(value) {
  return cleanText(value, 200).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
    return {
      type: 'assign',
      key: normalized.key,
      status: 'dry-run',
      assignee: 'Thien Nguyen',
      message: 'Would assign through the Jira page UI if currently unassigned.',
    };
  }
  if (!jiraAssignViaChrome) {
    return {
      type: 'assign',
      key: normalized.key,
      status: 'disabled',
      via: 'chrome-ui',
      message: 'Jira assignment is UI-only; REST assignment is disabled by policy.',
    };
  }
  return assignJiraTicketIfUnassignedViaChrome(normalized);
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
  if (currentTickets.length) {
    for (const ticket of currentTickets) {
      actions.push(await assignJiraTicketIfUnassigned(ticket));
    }
    return {tickets: currentTickets, actions};
  }
  if (!jiraAuthConfigured()) {
    actions.push({
      type: 'create',
      status: 'blocked',
      message: 'No known Jira ticket was found and Jira REST credentials are not configured for dedupe/create.',
      projectKey: jiraProjectKey,
    });
    return {tickets: currentTickets, actions};
  }
  const created = await createJiraTicketForSentry(row, detailState);
  actions.push(created.action);
  if (created.ticket) {
    actions.push(await assignJiraTicketIfUnassigned(created.ticket));
  }
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

function waitForUrlFragment(fragment, timeoutMs = pageTimeoutMs) {
  const expected = cleanText(fragment, 240);
  const start = Date.now();
  let state = activeTabState();
  while (Date.now() - start < timeoutMs) {
    state = activeTabState();
    if (!state.loading && (!expected || String(state.url || '').includes(expected))) {
      sleep(settleMs);
      return state;
    }
    sleep(500);
  }
  return state;
}

function extractJiraAssigneeState(ticketKey) {
  const js = `(() => {
    const clean = value => String(value || '').replace(/\\s+/g, ' ').trim();
    const visible = element => {
      if (!element) return false;
      const rect = element.getBoundingClientRect();
      return Boolean((rect.width || rect.height || element.getClientRects().length) && getComputedStyle(element).visibility !== 'hidden');
    };
    const compact = element => {
      const rect = element.getBoundingClientRect();
      const text = clean(element.innerText || element.textContent || '');
      return text.length <= 500 && rect.width <= 900 && rect.height <= 260;
    };
    const assigneeField =
      document.querySelector('[data-testid="issue.issue-view-layout.issue-view-assignee-field.assignee"], [data-test-id="issue.issue-view-layout.issue-view-assignee-field.assignee"]') ||
      [...document.querySelectorAll('[data-testid], [data-test-id], section, div')]
        .filter(node => visible(node) && compact(node))
        .find(node => /assignee/i.test((node.getAttribute('data-testid') || node.getAttribute('data-test-id') || '') + ' ' + clean(node.innerText).slice(0, 300)));
    const assigneeText = clean(assigneeField ? assigneeField.innerText : '');
    const body = clean(document.body ? document.body.innerText : '');
    const loginish = /log in|login|sign in|atlassian account/i.test(document.title + ' ' + body.slice(0, 1000));
    const key = ${JSON.stringify(ticketKey)};
    return JSON.stringify({
      title: document.title,
      url: location.href,
      readyState: document.readyState,
      authState: loginish ? 'login_or_auth_required' : 'jira_issue_loaded',
      ticketKey: key,
      issueKeyVisible: !key || body.includes(key),
      assigneeText,
      bodySample: assigneeText ? '' : body.slice(0, 500)
    });
  })()`;
  return JSON.parse(executeActiveTabJavascript(js));
}

function jiraAssigneeIsUnassigned(assigneeText) {
  const text = cleanText(assigneeText, 240).toLowerCase();
  return !text || /unassigned|none|select|assign to me|no assignee/.test(text);
}

function jiraAssigneeIsThien(assigneeText) {
  return /thien nguyen/i.test(cleanText(assigneeText, 240));
}

function jiraAssigneeNameFromText(assigneeText) {
  const text = cleanText(assigneeText, 240)
    .replace(/^Assignee\b/i, '')
    .replace(/\bUnassigned\b/i, '')
    .replace(/\bAssign to me\b/i, '')
    .trim();
  return cleanText(text, 160);
}

function clickJiraAssignToMeControl() {
  const js = `(() => {
    const clean = value => String(value || '').replace(/\\s+/g, ' ').trim();
    const visible = element => {
      if (!element) return false;
      const rect = element.getBoundingClientRect();
      return Boolean((rect.width || rect.height || element.getClientRects().length) && getComputedStyle(element).visibility !== 'hidden');
    };
    const compactControl = element => {
      const rect = element.getBoundingClientRect();
      const text = clean(element.innerText || element.textContent || '');
      return text.length <= 220 && rect.width <= 700 && rect.height <= 180;
    };
    const isInteractive = element => {
      const tag = element.tagName.toLowerCase();
      return tag === 'button' ||
        tag === 'a' ||
        ['button', 'option', 'menuitem', 'combobox'].includes(element.getAttribute('role') || '') ||
        element.hasAttribute('aria-label') ||
        element.hasAttribute('title') ||
        element.hasAttribute('data-testid') ||
        element.hasAttribute('data-test-id');
    };
    const click = element => {
      element.scrollIntoView({block: 'center', inline: 'nearest'});
      element.dispatchEvent(new MouseEvent('mouseover', {bubbles: true, cancelable: true, view: window}));
      element.click();
    };
    const textFor = element => clean([
      element.innerText,
      element.textContent,
      element.getAttribute('aria-label'),
      element.getAttribute('title'),
      element.getAttribute('data-testid'),
      element.getAttribute('data-test-id')
    ].filter(Boolean).join(' '));
    const controls = [...document.querySelectorAll('button, a, [role="button"], [role="option"], [role="menuitem"], [role="combobox"], [aria-label], [title], [data-testid], [data-test-id]')]
      .filter(element => visible(element) && compactControl(element) && isInteractive(element));
    const direct = controls.find(element => /^assign to me$/i.test(textFor(element)) || /\\bassign to me\\b/i.test(element.getAttribute('aria-label') || element.getAttribute('title') || ''));
    if (direct) {
      click(direct);
      return JSON.stringify({ok: true, clicked: 'assign-to-me', text: textFor(direct).slice(0, 200)});
    }
    const thienOption = controls.find(element => /^Thien Nguyen$/i.test(textFor(element)) || /Thien Nguyen.*assign/i.test(textFor(element)));
    if (thienOption) {
      click(thienOption);
      return JSON.stringify({ok: true, clicked: 'thien-nguyen-option', text: textFor(thienOption).slice(0, 200)});
    }
    const assigneeField =
      document.querySelector('[data-testid="issue.issue-view-layout.issue-view-assignee-field.assignee"], [data-test-id="issue.issue-view-layout.issue-view-assignee-field.assignee"]') ||
      controls.find(element => /assignee/i.test(textFor(element)) && compactControl(element));
    if (assigneeField) {
      click(assigneeField);
      return JSON.stringify({ok: true, clicked: 'assignee-field', text: textFor(assigneeField).slice(0, 200)});
    }
    return JSON.stringify({ok: false, reason: 'assignee control not found'});
  })()`;
  return JSON.parse(executeActiveTabJavascript(js));
}

async function assignJiraTicketIfUnassignedViaChrome(ticket) {
  const normalized = normalizeTicket(ticket);
  const targetUrl = normalized.url || jiraUrl(normalized.key);
  navigateActiveTab(targetUrl);
  const pageState = waitForUrlFragment(normalized.key, jiraUiActionTimeoutMs);
  if (!String(pageState.url || '').includes(normalized.key)) {
    return {
      type: 'assign',
      key: normalized.key,
      status: 'blocked',
      via: 'chrome-ui',
      message: `Chrome did not load Jira issue ${normalized.key}; active URL was ${cleanText(pageState.url, 240)}.`,
    };
  }
  sleep(jiraUiSettleMs);
  let state = extractJiraAssigneeState(normalized.key);
  if (state.authState === 'login_or_auth_required') {
    return {
      type: 'assign',
      key: normalized.key,
      status: 'blocked',
      via: 'chrome-ui',
      message: `Jira issue ${normalized.key} requires login/authentication in Chrome.`,
    };
  }
  if (!state.issueKeyVisible) {
    return {
      type: 'assign',
      key: normalized.key,
      status: 'blocked',
      via: 'chrome-ui',
      message: `Jira issue ${normalized.key} was not visible in the loaded Chrome page.`,
    };
  }
  if (jiraAssigneeIsThien(state.assigneeText)) {
    return {type: 'assign', key: normalized.key, status: 'already-assigned', via: 'chrome-ui', assignee: 'Thien Nguyen'};
  }
  if (!jiraAssigneeIsUnassigned(state.assigneeText)) {
    return {
      type: 'assign',
      key: normalized.key,
      status: 'already-assigned',
      via: 'chrome-ui',
      assignee: jiraAssigneeNameFromText(state.assigneeText),
    };
  }
  const attempts = [];
  const startedAtMs = Date.now();
  while (Date.now() - startedAtMs <= jiraUiActionTimeoutMs) {
    attempts.push(clickJiraAssignToMeControl());
    sleep(jiraUiSettleMs);
    state = extractJiraAssigneeState(normalized.key);
    if (jiraAssigneeIsThien(state.assigneeText)) {
      return {
        type: 'assign',
        key: normalized.key,
        status: 'assigned',
        via: 'chrome-ui',
        assignee: 'Thien Nguyen',
        attempts,
      };
    }
    if (!jiraAssigneeIsUnassigned(state.assigneeText)) {
      return {
        type: 'assign',
        key: normalized.key,
        status: 'already-assigned',
        via: 'chrome-ui',
        assignee: jiraAssigneeNameFromText(state.assigneeText),
        attempts,
      };
    }
  }
  return {
    type: 'assign',
    key: normalized.key,
    status: 'blocked',
    via: 'chrome-ui',
    message: `Jira issue ${normalized.key} still appears unassigned after ${jiraUiActionTimeoutMs}ms of Chrome UI assignment attempts.`,
    attempts,
    waitedMs: Math.max(0, Date.now() - startedAtMs),
  };
}

function extractDetailJiraTickets() {
  const js = `(() => {
    const clean = value => (value || '').replace(/\\s+/g, ' ').trim();
    const absolute = value => { try { return new URL(value, location.href).href; } catch { return value || ''; } };
    const tickets = [];
    const issueTrackingTickets = [];
    const addTo = (list, key, url, text, source) => {
      const normalized = clean(key).toUpperCase();
      if (!/^[A-Z][A-Z0-9]+-\\d+$/.test(normalized)) return;
      if (!list.some(ticket => ticket.key === normalized)) {
        list.push({key: normalized, url: url || '', text: clean(text) || normalized, source});
      }
    };
    const add = (key, url, text, source, issueTrackingVisible = false) => {
      addTo(tickets, key, url, text, source);
      if (issueTrackingVisible) addTo(issueTrackingTickets, key, url, text, source);
    };
    const linkedIssuesSection =
      document.querySelector('[data-test-id="linked-issues"], [data-testid="linked-issues"]') ||
      [...document.querySelectorAll('aside section, section')]
        .find(node => /issue tracking|jira/i.test(clean(node.innerText).slice(0, 300)));
    for (const link of [...document.querySelectorAll('a[href]')]) {
      const href = absolute(link.getAttribute('href'));
      const match = href.match(/atlassian\\.net\\/browse\\/([A-Z][A-Z0-9]+-\\d+)/i);
      if (match) add(match[1], href, link.textContent, 'atlassian-link', Boolean(linkedIssuesSection && linkedIssuesSection.contains(link)));
    }
    if (linkedIssuesSection) {
      for (const match of clean(linkedIssuesSection.innerText).matchAll(/\\b(?:PRE|OPS)-\\d+\\b/g)) {
        add(match[0], '', match[0], 'sentry-issue-tracking-section', true);
      }
    }
    const likelySections = [...document.querySelectorAll('aside, section, [role="complementary"], [data-test-id*="issue"], [data-test-id*="sidebar"]')]
      .filter(node => /jira|linked|external|ticket|issue/i.test(clean(node.innerText).slice(0, 1200)));
    for (const section of likelySections) {
      for (const match of clean(section.innerText).matchAll(/\\b(?:PRE|OPS)-\\d+\\b/g)) {
        add(match[0], '', match[0], linkedIssuesSection && linkedIssuesSection.contains(section) ? 'sentry-issue-tracking-section' : 'jira-section-text', Boolean(linkedIssuesSection && linkedIssuesSection.contains(section)));
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
      issueTrackingTickets,
      issueTrackingText: linkedIssuesSection ? clean(linkedIssuesSection.innerText).slice(0, 800) : '',
      bodySample: tickets.length ? '' : body.slice(0, 500)
    });
  })()`;
  return JSON.parse(executeActiveTabJavascript(js));
}

function issueTrackingTicketKeys(detailState) {
  const keys = new Set(mergeTickets(detailState?.issueTrackingTickets).map((ticket) => ticket.key));
  const text = cleanText(detailState?.issueTrackingText, 1200);
  for (const match of text.matchAll(/\b[A-Z][A-Z0-9]+-\d+\b/g)) {
    keys.add(match[0].toUpperCase());
  }
  return keys;
}

function textHasJiraKey(text, ticketKey) {
  const key = cleanText(ticketKey, 80).toUpperCase();
  if (!key) return false;
  return new RegExp(`\\b${escapeRegExp(key)}\\b`, 'i').test(cleanText(text, 1200));
}

function detailStateWithIssueTrackingTicket(detailState, ticket) {
  const normalized = normalizeTicket(ticket);
  if (!normalized || !detailState) return detailState;
  if (!issueTrackingTicketKeys(detailState).has(normalized.key)) return detailState;
  const issueTrackingTickets = mergeTickets(detailState.issueTrackingTickets, {
    ...normalized,
    text: normalized.text || normalized.key,
    source: normalized.source ? `${normalized.source}, sentry-issue-tracking-text` : 'sentry-issue-tracking-text',
  });
  return {...detailState, issueTrackingTickets};
}

function issueTrackingTicketsFromState(detailState, candidateTickets = []) {
  const keys = issueTrackingTicketKeys(detailState);
  const tickets = mergeTickets(detailState?.issueTrackingTickets);
  for (const ticket of mergeTickets(candidateTickets)) {
    if (keys.has(ticket.key)) tickets.push({...ticket, source: `${ticket.source || 'candidate'}, sentry-issue-tracking-text`});
  }
  for (const key of keys) {
    tickets.push({key, url: jiraUrl(key), text: key, source: 'sentry-issue-tracking-text'});
  }
  return mergeTickets(tickets);
}

function openSentryJiraLinkDialog() {
  const js = `(() => {
    const clean = value => String(value || '').replace(/\\s+/g, ' ').trim();
    const visible = element => {
      if (!element) return false;
      const rect = element.getBoundingClientRect();
      return Boolean((rect.width || rect.height || element.getClientRects().length) && getComputedStyle(element).visibility !== 'hidden');
    };
    const section =
      document.querySelector('[data-test-id="linked-issues"], [data-testid="linked-issues"]') ||
      [...document.querySelectorAll('aside section, section')].find(node => /issue tracking|jira/i.test(clean(node.innerText).slice(0, 300)));
    if (!section) return JSON.stringify({ok: false, reason: 'linked-issues section not found'});
    const jiraButton = [...section.querySelectorAll('button, [role="button"], a')]
      .filter(visible)
      .find(element => /jira/i.test(clean(element.innerText || element.textContent || element.getAttribute('aria-label'))));
    if (!jiraButton) return JSON.stringify({ok: false, reason: 'Jira button not found in Issue Tracking section', sectionText: clean(section.innerText).slice(0, 500)});
    jiraButton.scrollIntoView({block: 'center', inline: 'nearest'});
    jiraButton.click();
    return JSON.stringify({ok: true, clicked: clean(jiraButton.innerText || jiraButton.textContent || jiraButton.getAttribute('aria-label')).slice(0, 120)});
  })()`;
  return JSON.parse(executeActiveTabJavascript(js));
}

function prepareSentryLinkForm(ticketKey) {
  const js = `(() => {
    const key = ${JSON.stringify(ticketKey)};
    const searchText = key;
    const clean = value => String(value || '').replace(/\\s+/g, ' ').trim();
    const visible = element => {
      if (!element) return false;
      const rect = element.getBoundingClientRect();
      return Boolean((rect.width || rect.height || element.getClientRects().length) && getComputedStyle(element).visibility !== 'hidden');
    };
    const visibleTextFor = element => clean(element.innerText || element.textContent || element.getAttribute('aria-label') || '');
    const metadataFor = element => clean([
      element.innerText,
      element.textContent,
      element.value,
      element.getAttribute('aria-label'),
      element.getAttribute('placeholder'),
      element.getAttribute('name'),
      element.getAttribute('role'),
      element.id
    ].filter(Boolean).join(' '));
    const usableControl = element => {
      if (!element || !visible(element)) return false;
      if (element.disabled || element.getAttribute('aria-disabled') === 'true') return false;
      if (element.matches?.('input[type="hidden"]')) return false;
      return element.matches?.('input:not([type="hidden"]), textarea, [contenteditable="true"], [role="combobox"], [role="textbox"]');
    };
    const controlsIn = root => [...root.querySelectorAll('input:not([type="hidden"]), textarea, [contenteditable="true"], [role="combobox"], [role="textbox"]')]
      .filter(usableControl)
      .filter(element => !/issue\\s*type|jira\\s*project|assignee|reporter|priority|sprint|epic/i.test(metadataFor(element)));
    const interactiveInputFor = control => {
      if (!control) return null;
      if (control.matches?.('input:not([type="hidden"]), textarea, [contenteditable="true"], [role="textbox"]')) return control;
      const nested = [...control.querySelectorAll('input:not([type="hidden"]), textarea, [contenteditable="true"], [role="textbox"]')].find(usableControl);
      return nested || null;
    };
    const findIssueField = dialog => {
      const labels = [...dialog.querySelectorAll('label, div, span, p')]
        .filter(visible)
        .filter(element => /^Issue\\s*(?:\\*)?$/i.test(visibleTextFor(element)));
      for (const label of labels) {
        let node = label;
        for (let depth = 0; node && depth < 6 && node !== dialog.parentElement; depth += 1, node = node.parentElement) {
          const controls = controlsIn(node);
          if (controls.length) {
            const control = controls.find(element => element.getAttribute('role') === 'combobox') || controls[0];
            return {control, input: interactiveInputFor(control), label: visibleTextFor(label)};
          }
        }
        const block = label.parentElement?.nextElementSibling || label.nextElementSibling;
        if (block) {
          const controls = controlsIn(block);
          if (controls.length) {
            const control = controls.find(element => element.getAttribute('role') === 'combobox') || controls[0];
            return {control, input: interactiveInputFor(control), label: visibleTextFor(label)};
          }
        }
      }
      const fallback = controlsIn(dialog)
        .find(element => /issue|external|jira/i.test(metadataFor(element)) && !/issue\\s*type/i.test(metadataFor(element))) ||
        controlsIn(dialog)[0];
      return fallback ? {control: fallback, input: interactiveInputFor(fallback), label: ''} : null;
    };
    const setNativeValue = (element, value) => {
      if (!element) return;
      if (element.isContentEditable) {
        element.textContent = value;
        return;
      }
      const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), 'value')?.set;
      if (setter) setter.call(element, value);
      else element.value = value;
    };
    const currentText = element => element?.isContentEditable ? clean(element.textContent) : String(element?.value || '');
    const typeIntoIssueField = field => {
      const control = field.control;
      control.scrollIntoView({block: 'center', inline: 'nearest'});
      control.click();
      let input = field.input || interactiveInputFor(control);
      if (!input && usableControl(document.activeElement)) input = document.activeElement;
      if (!input) return {ok: false, reason: 'Issue combobox input did not focus after click', controlText: metadataFor(control).slice(0, 240)};
      input.focus();
      input.click();
      if (input.select) input.select();
      if (currentText(input) !== searchText) {
        setNativeValue(input, '');
        input.dispatchEvent(new InputEvent('input', {bubbles: true, inputType: 'deleteContentBackward', data: ''}));
        input.dispatchEvent(new Event('change', {bubbles: true}));
        if (document.execCommand) document.execCommand('insertText', false, searchText);
        if (currentText(input) !== searchText) setNativeValue(input, searchText);
        input.dispatchEvent(new InputEvent('input', {bubbles: true, inputType: 'insertText', data: searchText}));
        input.dispatchEvent(new Event('change', {bubbles: true}));
      }
      input.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowDown', code: 'ArrowDown', bubbles: true, cancelable: true}));
      input.dispatchEvent(new KeyboardEvent('keyup', {key: 'ArrowDown', code: 'ArrowDown', bubbles: true, cancelable: true}));
      const finalInputValue = currentText(input).slice(0, 120);
      const finalControlText = metadataFor(control).slice(0, 240);
      if (!finalInputValue.toUpperCase().includes(searchText.toUpperCase()) && !finalControlText.toUpperCase().includes(searchText.toUpperCase())) {
        return {
          ok: false,
          reason: 'Issue dropdown typed-state was not confirmed after click/type',
          typed: searchText,
          inputValue: finalInputValue,
          inputId: input.id || '',
          controlRole: control.getAttribute('role') || '',
          controlText: finalControlText
        };
      }
      return {
        ok: true,
        typed: searchText,
        inputValue: finalInputValue,
        inputId: input.id || '',
        controlRole: control.getAttribute('role') || '',
        controlText: finalControlText
      };
    };
    const dialog = document.querySelector('[role="dialog"]');
    if (!dialog) return JSON.stringify({ok: false, reason: 'Jira modal dialog not open'});
    const linkTab = [...dialog.querySelectorAll('[role="tab"], button, [role="button"], li, span')]
      .filter(visible)
      .find(element => /^Link$/i.test(visibleTextFor(element)) || /tab-link\\b/i.test(element.id || ''));
    if (!linkTab) return JSON.stringify({ok: false, reason: 'Link tab not found', dialogText: clean(dialog.innerText).slice(0, 500)});
    linkTab.click();
    const field = findIssueField(dialog);
    if (!field) return JSON.stringify({ok: false, reason: 'Issue dropdown/combobox not found after Link tab', dialogText: clean(dialog.innerText).slice(0, 500)});
    const typed = typeIntoIssueField(field);
    if (!typed.ok) return JSON.stringify({...typed, dialogText: clean(dialog.innerText).slice(0, 500)});
    return JSON.stringify({ok: true, key, clickedTab: visibleTextFor(linkTab) || linkTab.id || '', fieldLabel: field.label, ...typed, dialogText: clean(dialog.innerText).slice(0, 500)});
  })()`;
  return JSON.parse(executeActiveTabJavascript(js));
}

function selectSentryLinkOption(ticketKey) {
  const js = `(() => {
    const key = ${JSON.stringify(ticketKey)};
    const searchText = key;
    const clean = value => String(value || '').replace(/\\s+/g, ' ').trim();
    const visible = element => {
      if (!element) return false;
      const rect = element.getBoundingClientRect();
      return Boolean((rect.width || rect.height || element.getClientRects().length) && getComputedStyle(element).visibility !== 'hidden');
    };
    const textFor = element => clean([
      element.innerText,
      element.textContent,
      element.value,
      element.getAttribute('aria-label'),
      element.getAttribute('title')
    ].filter(Boolean).join(' '));
    const dropdownRoots = [...document.querySelectorAll('[role="listbox"], [role="menu"], [data-testid*="select"], [data-test-id*="select"], [class*="menu"], [id*="react-select"]')]
      .filter(visible);
    const optionRoots = dropdownRoots.length ? dropdownRoots : [document];
    const optionSelector = dropdownRoots.length
      ? '[role="option"], [role="menuitem"], button, [role="button"], [data-testid], [data-test-id]'
      : '[role="option"], [role="menuitem"]';
    const optionCandidates = optionRoots.flatMap(root => [...root.querySelectorAll(optionSelector)]);
    const option = optionCandidates
      .filter(visible)
      .find(element => textFor(element).toUpperCase().includes(key) && !/^Link Issue$/i.test(textFor(element)));
    if (option) {
      option.scrollIntoView({block: 'center', inline: 'nearest'});
      option.click();
      return JSON.stringify({ok: true, selected: textFor(option).slice(0, 240)});
    }
    const visibleOptionTexts = optionCandidates
      .filter(visible)
      .map(element => textFor(element))
      .filter(text => text && !/^Link Issue$/i.test(text))
      .slice(0, 10);
    const dialog = document.querySelector('[role="dialog"]');
    if (dialog) {
      const metadataFor = element => clean([
        element.innerText,
        element.textContent,
        element.value,
        element.getAttribute('aria-label'),
        element.getAttribute('placeholder'),
        element.getAttribute('name'),
        element.getAttribute('role'),
        element.id
      ].filter(Boolean).join(' '));
      const usableControl = element => {
        if (!element || !visible(element)) return false;
        if (element.disabled || element.getAttribute('aria-disabled') === 'true') return false;
        if (element.matches?.('input[type="hidden"]')) return false;
        return element.matches?.('input:not([type="hidden"]), textarea, [contenteditable="true"], [role="combobox"], [role="textbox"]');
      };
      const controlsIn = root => [...root.querySelectorAll('input:not([type="hidden"]), textarea, [contenteditable="true"], [role="combobox"], [role="textbox"]')]
        .filter(usableControl)
        .filter(element => !/issue\\s*type|jira\\s*project|assignee|reporter|priority|sprint|epic/i.test(metadataFor(element)));
      const interactiveInputFor = control => {
        if (!control) return null;
        if (control.matches?.('input:not([type="hidden"]), textarea, [contenteditable="true"], [role="textbox"]')) return control;
        return [...control.querySelectorAll('input:not([type="hidden"]), textarea, [contenteditable="true"], [role="textbox"]')].find(usableControl) || null;
      };
      const labels = [...dialog.querySelectorAll('label, div, span, p')]
        .filter(visible)
        .filter(element => /^Issue\\s*(?:\\*)?$/i.test(clean(element.innerText || element.textContent || element.getAttribute('aria-label') || '')));
      let control = null;
      for (const label of labels) {
        let node = label;
        for (let depth = 0; node && depth < 6 && node !== dialog.parentElement; depth += 1, node = node.parentElement) {
          const controls = controlsIn(node);
          if (controls.length) {
            control = controls.find(element => element.getAttribute('role') === 'combobox') || controls[0];
            break;
          }
        }
        if (control) break;
      }
      control ||= controlsIn(dialog).find(element => /issue|external|jira/i.test(metadataFor(element)) && !/issue\\s*type/i.test(metadataFor(element)));
      if (control) {
        control.scrollIntoView({block: 'center', inline: 'nearest'});
        control.click();
        const input = interactiveInputFor(control) || (usableControl(document.activeElement) ? document.activeElement : null);
        if (input) {
          input.focus();
          input.click();
          if (input.select) input.select();
          const current = input.isContentEditable ? clean(input.textContent) : String(input.value || '');
          if (current !== searchText) {
            const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), 'value')?.set;
            if (input.isContentEditable) input.textContent = '';
            else if (setter) setter.call(input, '');
            else input.value = '';
            input.dispatchEvent(new InputEvent('input', {bubbles: true, inputType: 'deleteContentBackward', data: ''}));
            if (document.execCommand) document.execCommand('insertText', false, searchText);
            const after = input.isContentEditable ? clean(input.textContent) : String(input.value || '');
            if (after !== searchText) {
              if (input.isContentEditable) input.textContent = searchText;
              else if (setter) setter.call(input, searchText);
              else input.value = searchText;
            }
            input.dispatchEvent(new InputEvent('input', {bubbles: true, inputType: 'insertText', data: searchText}));
            input.dispatchEvent(new Event('change', {bubbles: true}));
          }
          input.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowDown', code: 'ArrowDown', bubbles: true, cancelable: true}));
          return JSON.stringify({ok: false, reason: 'No matching Jira issue option found after typing Issue dropdown search text', typed: searchText, inputId: input.id || '', inputValue: (input.isContentEditable ? clean(input.textContent) : String(input.value || '')).slice(0, 120), visibleOptions: visibleOptionTexts});
        }
      }
    }
    return JSON.stringify({ok: false, reason: 'No matching Jira issue option found and Issue dropdown input could not be typed', visibleOptions: visibleOptionTexts});
  })()`;
  return JSON.parse(executeActiveTabJavascript(js));
}

function verifySentryLinkIssueSelected(ticketKey) {
  const js = `(() => {
    const key = ${JSON.stringify(ticketKey)};
    const clean = value => String(value || '').replace(/\\s+/g, ' ').trim();
    const visible = element => {
      if (!element) return false;
      const rect = element.getBoundingClientRect();
      return Boolean((rect.width || rect.height || element.getClientRects().length) && getComputedStyle(element).visibility !== 'hidden');
    };
    const textFor = element => clean([
      element.innerText,
      element.textContent,
      element.value,
      element.getAttribute('aria-label'),
      element.getAttribute('title'),
      element.getAttribute('placeholder'),
      element.getAttribute('name'),
      element.getAttribute('role'),
      element.id
    ].filter(Boolean).join(' '));
    const dialog = document.querySelector('[role="dialog"]');
    if (!dialog) return JSON.stringify({ok: false, reason: 'Jira modal dialog not found during Issue selection verification'});
    const listLike = element => element.closest?.('[role="listbox"], [role="menu"], [role="option"], [role="menuitem"]');
    const controlsIn = root => [...root.querySelectorAll('input:not([type="hidden"]), textarea, [contenteditable="true"], [role="combobox"], [role="textbox"], [data-testid], [data-test-id], [class*="singleValue"], [class*="multiValue"], [class*="value-container"], [class*="ValueContainer"], div, span')]
      .filter(visible)
      .filter(element => !/issue\\s*type|jira\\s*project|assignee|reporter|priority|sprint|epic/i.test(textFor(element)))
      .filter(element => !listLike(element));
    const isTypedInputOnly = element => element.matches?.('input:not([type="hidden"]), textarea, [contenteditable="true"], [role="textbox"]');
    const labels = [...dialog.querySelectorAll('label, div, span, p')]
      .filter(visible)
      .filter(element => /^Issue\\s*(?:\\*)?$/i.test(clean(element.innerText || element.textContent || element.getAttribute('aria-label') || '')));
    const evidence = [];
    for (const label of labels) {
      let node = label;
      for (let depth = 0; node && depth < 6 && node !== dialog.parentElement; depth += 1, node = node.parentElement) {
        for (const control of controlsIn(node)) {
          const text = textFor(control);
          if (text.toUpperCase().includes(key) && !isTypedInputOnly(control)) evidence.push(text.slice(0, 300));
        }
      }
      const block = label.parentElement?.nextElementSibling || label.nextElementSibling;
      if (block) {
        for (const control of controlsIn(block)) {
          const text = textFor(control);
          if (text.toUpperCase().includes(key) && !isTypedInputOnly(control)) evidence.push(text.slice(0, 300));
        }
      }
    }
    const typedEvidence = controlsIn(dialog)
      .filter(isTypedInputOnly)
      .map(element => textFor(element))
      .filter(text => text.toUpperCase().includes(key))
      .slice(0, 3);
    const uniqueEvidence = [...new Set(evidence)].filter(Boolean).slice(0, 5);
    const visibleOptions = [...document.querySelectorAll('[role="listbox"] [role="option"], [role="menu"] [role="menuitem"], [role="option"], [role="menuitem"]')]
      .filter(visible)
      .map(element => textFor(element))
      .filter(text => text && text.toUpperCase().includes(key))
      .slice(0, 5);
    const submit = [...dialog.querySelectorAll('button, [role="button"], input[type="submit"]')]
      .filter(visible)
      .find(element => /link issue/i.test(clean(element.innerText || element.value || element.getAttribute('aria-label'))));
    const submitEnabled = Boolean(submit && !submit.disabled && submit.getAttribute('aria-disabled') !== 'true');
    if (uniqueEvidence.length && submitEnabled && visibleOptions.length === 0) {
      return JSON.stringify({ok: true, key, selectedEvidence: uniqueEvidence, submitEnabled});
    }
    return JSON.stringify({
      ok: false,
      reason: uniqueEvidence.length && visibleOptions.length
        ? 'Issue option text is still visible in the dropdown; selected-state is not confirmed yet'
        : uniqueEvidence.length
        ? 'Issue key found in a selected-value area but the Link Issue button is not enabled yet'
        : 'Issue key is not confirmed as a selected value in the Issue field',
      key,
      selectedEvidence: uniqueEvidence,
      typedEvidence,
      visibleOptions,
      submitEnabled,
      dialogText: clean(dialog.innerText).slice(0, 500)
    });
  })()`;
  return JSON.parse(executeActiveTabJavascript(js));
}

function submitSentryLinkForm(ticketKey) {
  const selected = verifySentryLinkIssueSelected(ticketKey);
  if (!selected.ok) {
    return {
      ok: false,
      reason: 'Refusing to submit: Issue key is not confirmed as a selected value or Link Issue is not enabled',
      selection: selected,
    };
  }
  const js = `(() => {
    const key = ${JSON.stringify(ticketKey)};
    const clean = value => String(value || '').replace(/\\s+/g, ' ').trim();
    const visible = element => {
      if (!element) return false;
      const rect = element.getBoundingClientRect();
      return Boolean((rect.width || rect.height || element.getClientRects().length) && getComputedStyle(element).visibility !== 'hidden');
    };
    const dialog = document.querySelector('[role="dialog"]');
    if (!dialog) return JSON.stringify({ok: false, reason: 'Jira modal dialog not open before submit'});
    const submit = [...dialog.querySelectorAll('button, [role="button"], input[type="submit"]')]
      .filter(visible)
      .find(element => /link issue/i.test(clean(element.innerText || element.value || element.getAttribute('aria-label'))));
    if (!submit) return JSON.stringify({ok: false, reason: 'Link Issue submit button not found', dialogText: clean(dialog.innerText).slice(0, 500)});
    if (submit.disabled || submit.getAttribute('aria-disabled') === 'true') {
      return JSON.stringify({ok: false, reason: 'Link Issue submit button is disabled', key});
    }
    submit.scrollIntoView({block: 'center', inline: 'nearest'});
    submit.click();
    return JSON.stringify({ok: true, submitted: key});
  })()`;
  return JSON.parse(executeActiveTabJavascript(js));
}

function waitForSentryIssueTrackingTicket(ticketKey) {
  const startedAtMs = Date.now();
  let attempts = 0;
  let lastDetailState = null;
  while (Date.now() - startedAtMs <= sentryIssueTrackingActionTimeoutMs) {
    attempts += 1;
    lastDetailState = extractDetailJiraTickets();
    if (issueTrackingTicketKeys(lastDetailState).has(ticketKey)) {
      const detailState = detailStateWithIssueTrackingTicket(lastDetailState, {key: ticketKey});
      return {
        ok: true,
        attempts,
        waitedMs: Math.max(0, Date.now() - startedAtMs),
        detailState,
      };
    }
    sleep(uiActionPollMs);
  }
  return {
    ok: false,
    reason: `Sentry Issue Tracking did not show ${ticketKey} within ${sentryIssueTrackingActionTimeoutMs}ms.`,
    attempts,
    waitedMs: Math.max(0, Date.now() - startedAtMs),
    detailState: lastDetailState,
  };
}

function linkJiraTicketInSentryIssueTracking(ticket) {
  const normalized = normalizeTicket(ticket);
  if (!normalized) return {action: {type: 'sentry-issue-tracking-link', status: 'skipped'}, detailState: null};
  const preflightState = extractDetailJiraTickets();
  if (issueTrackingTicketKeys(preflightState).has(normalized.key)) {
    const detailState = detailStateWithIssueTrackingTicket(preflightState, normalized);
    return {
      action: {
        type: 'sentry-issue-tracking-link',
        key: normalized.key,
        status: 'already-visible',
        via: 'chrome-ui',
        evidence: cleanText(preflightState.issueTrackingText, 500),
      },
      detailState,
    };
  }
  if (!sentryAttachJiraTickets) {
    return {
      action: {type: 'sentry-issue-tracking-link', key: normalized.key, status: 'disabled'},
      detailState: null,
    };
  }
  if (jiraDryRun) {
    return {
      action: {type: 'sentry-issue-tracking-link', key: normalized.key, status: 'dry-run', message: 'Would link the known Jira ticket through Sentry Issue Tracking.'},
      detailState: null,
    };
  }
  const steps = [];
  steps.push({
    step: 'open-dialog',
    result: waitForUiAction('open Sentry Jira modal', openSentryJiraLinkDialog, {timeoutMs: sentryIssueTrackingActionTimeoutMs}),
  });
  if (!steps.at(-1).result.ok) {
    if (textHasJiraKey(steps.at(-1).result.sectionText, normalized.key)) {
      const detailState = detailStateWithIssueTrackingTicket(extractDetailJiraTickets(), normalized);
      return {
        action: {
          type: 'sentry-issue-tracking-link',
          key: normalized.key,
          status: 'already-visible',
          via: 'chrome-ui',
          message: 'Skipped Jira modal because the key was already visible in Sentry Issue Tracking text.',
          evidence: cleanText(steps.at(-1).result.sectionText, 500),
          steps,
        },
        detailState,
      };
    }
    return {action: {type: 'sentry-issue-tracking-link', key: normalized.key, status: 'blocked', via: 'chrome-ui', message: steps.at(-1).result.reason, steps}, detailState: null};
  }
  sleep(sentryIssueTrackingSettleMs);
  steps.push({
    step: 'prepare-link-form',
    result: waitForUiAction('prepare Sentry Jira Link tab form', () => prepareSentryLinkForm(normalized.key), {timeoutMs: sentryIssueTrackingActionTimeoutMs}),
  });
  if (!steps.at(-1).result.ok) {
    return {action: {type: 'sentry-issue-tracking-link', key: normalized.key, status: 'blocked', via: 'chrome-ui', message: steps.at(-1).result.reason, steps}, detailState: null};
  }
  sleep(sentryIssueTrackingSettleMs);
  steps.push({
    step: 'select-option',
    result: waitForUiAction('select Jira issue option in Sentry Link form', () => selectSentryLinkOption(normalized.key), {timeoutMs: sentryIssueTrackingActionTimeoutMs}),
  });
  if (!steps.at(-1).result.ok) {
    return {action: {type: 'sentry-issue-tracking-link', key: normalized.key, status: 'blocked', via: 'chrome-ui', message: steps.at(-1).result.reason, steps}, detailState: null};
  }
  sleep(sentryIssueTrackingSettleMs);
  steps.push({
    step: 'confirm-selected-issue',
    result: waitForUiAction('confirm selected Jira issue in Sentry Link form', () => verifySentryLinkIssueSelected(normalized.key), {timeoutMs: sentryIssueTrackingActionTimeoutMs}),
  });
  if (!steps.at(-1).result.ok) {
    return {action: {type: 'sentry-issue-tracking-link', key: normalized.key, status: 'blocked', via: 'chrome-ui', message: steps.at(-1).result.reason, steps}, detailState: null};
  }
  sleep(sentryIssueTrackingSettleMs);
  steps.push({
    step: 'submit',
    result: waitForUiAction('submit Sentry Jira Link form', () => submitSentryLinkForm(normalized.key), {timeoutMs: sentryIssueTrackingActionTimeoutMs}),
  });
  if (!steps.at(-1).result.ok) {
    return {action: {type: 'sentry-issue-tracking-link', key: normalized.key, status: 'blocked', via: 'chrome-ui', message: steps.at(-1).result.reason, steps}, detailState: null};
  }
  const confirmation = waitForSentryIssueTrackingTicket(normalized.key);
  steps.push({step: 'confirm-visible-in-issue-tracking', result: {...confirmation, detailState: undefined}});
  if (confirmation.ok) {
    return {
      action: {type: 'sentry-issue-tracking-link', key: normalized.key, status: 'attached', via: 'chrome-ui', steps},
      detailState: confirmation.detailState,
    };
  }
  return {
    action: {
      type: 'sentry-issue-tracking-link',
      key: normalized.key,
      status: 'blocked',
      via: 'chrome-ui',
      message: confirmation.reason || `Sentry Issue Tracking did not show ${normalized.key} after the link attempt.`,
      steps,
    },
    detailState: confirmation.detailState,
  };
}

function ensureSentryIssueTrackingLinks(detailState, tickets) {
  const actions = [];
  let currentDetailState = detailState;
  const visibleKeys = issueTrackingTicketKeys(currentDetailState);
  for (const ticket of mergeTickets(tickets)) {
    if (visibleKeys.has(ticket.key)) {
      actions.push({type: 'sentry-issue-tracking-link', key: ticket.key, status: 'already-visible', via: 'chrome-ui'});
      continue;
    }
    const result = linkJiraTicketInSentryIssueTracking(ticket);
    actions.push(result.action);
    if (result.detailState) {
      currentDetailState = result.detailState;
      for (const visibleKey of issueTrackingTicketKeys(currentDetailState)) visibleKeys.add(visibleKey);
    }
    if (result.action.status === 'blocked') break;
  }
  return {detailState: currentDetailState, actions};
}

function jiraOwnerNameFromActions(ticket, actions = []) {
  const normalized = normalizeTicket(ticket);
  if (!normalized) return '';
  const matching = actions
    .filter((action) => action && cleanText(action.key, 80).toUpperCase() === normalized.key)
    .filter((action) => ['assign', 'create'].includes(action.type))
    .reverse();
  for (const action of matching) {
    const assignee = jiraAssigneeNameFromText(action.assignee || action.owner || '');
    if (assignee && !jiraAssigneeIsUnassigned(assignee)) return assignee;
  }
  return '';
}

function resolveJiraOwnerViaChrome(ticket, actions = []) {
  const normalized = normalizeTicket(ticket);
  if (!normalized) {
    return {ok: false, status: 'blocked', message: 'Cannot resolve Jira owner for an invalid Jira ticket.'};
  }
  const ownerHint = jiraOwnerNameFromActions(normalized, actions);
  if (jiraDryRun && ownerHint) {
    return {ok: true, key: normalized.key, ownerName: ownerHint, ownerHint, source: 'jira-dry-run-action'};
  }
  navigateActiveTab(normalized.url || jiraUrl(normalized.key));
  const pageState = waitForUrlFragment(normalized.key, jiraUiActionTimeoutMs);
  if (!String(pageState.url || '').includes(normalized.key)) {
    return {
      ok: false,
      key: normalized.key,
      status: 'blocked',
      message: `Chrome did not load Jira issue ${normalized.key} to resolve owner; active URL was ${cleanText(pageState.url, 240)}.`,
    };
  }
  sleep(jiraUiSettleMs);
  const state = extractJiraAssigneeState(normalized.key);
  if (state.authState === 'login_or_auth_required') {
    return {ok: false, key: normalized.key, status: 'blocked', message: `Jira issue ${normalized.key} requires login/authentication in Chrome while resolving owner.`};
  }
  if (!state.issueKeyVisible) {
    return {ok: false, key: normalized.key, status: 'blocked', message: `Jira issue ${normalized.key} was not visible while resolving owner.`};
  }
  if (jiraAssigneeIsUnassigned(state.assigneeText)) {
    return {ok: false, key: normalized.key, status: 'blocked', message: `Jira issue ${normalized.key} has no owner/assignee to mirror into Sentry.`};
  }
  const ownerName = jiraAssigneeNameFromText(state.assigneeText);
  return ownerName
    ? {ok: true, key: normalized.key, ownerName, ownerHint, source: 'jira-chrome-ui'}
    : {ok: false, key: normalized.key, status: 'blocked', message: `Jira issue ${normalized.key} owner/assignee text could not be parsed.`};
}

function extractSentryAssigneeState(ownerName = '') {
  const js = `(() => {
    const expected = ${JSON.stringify(ownerName)};
    const clean = value => String(value || '').replace(/\\s+/g, ' ').trim();
    const visible = element => {
      if (!element) return false;
      const rect = element.getBoundingClientRect();
      return Boolean((rect.width || rect.height || element.getClientRects().length) && getComputedStyle(element).visibility !== 'hidden');
    };
    const textFor = element => clean([
      element.innerText,
      element.textContent,
      element.getAttribute('aria-label'),
      element.getAttribute('title'),
      element.getAttribute('data-testid'),
      element.getAttribute('data-test-id')
    ].filter(Boolean).join(' '));
    const body = clean(document.body ? document.body.innerText : '');
    const loginish = /sign in|log in|login|authenticate/i.test(document.title + ' ' + body.slice(0, 800));
    const candidates = [...document.querySelectorAll('[data-test-id*="assign"], [data-testid*="assign"], aside section, aside div, section, button, [role="button"]')]
      .filter(visible)
      .filter(element => !element.closest('[role="dialog"]'))
      .map(element => ({text: textFor(element), testId: element.getAttribute('data-testid') || element.getAttribute('data-test-id') || ''}))
      .filter(item => /assignee|assigned|owner|unassigned/i.test(item.text + ' ' + item.testId));
    const best = candidates
      .sort((a, b) => a.text.length - b.text.length)
      .find(item => /assignee|unassigned/i.test(item.text + ' ' + item.testId)) ||
      candidates[0] ||
      null;
    return JSON.stringify({
      title: document.title,
      url: location.href,
      authState: loginish ? 'login_or_auth_required' : 'sentry_issue_loaded',
      expectedOwner: expected,
      assigneeText: best ? best.text.slice(0, 400) : '',
      assigneeCandidates: candidates.slice(0, 8),
    });
  })()`;
  return JSON.parse(executeActiveTabJavascript(js));
}

function sentryAssigneeMatches(assigneeText, ownerName) {
  const haystack = cleanText(assigneeText, 500).toLowerCase();
  const owner = cleanText(ownerName, 160).toLowerCase();
  if (!owner || !haystack || /unassigned/i.test(haystack)) return false;
  const ownerPattern = owner.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
  return new RegExp(`(^|\\b)${ownerPattern}(\\b|$)`, 'i').test(haystack);
}

function openSentryAssigneeDropdown(ownerName) {
  const js = `(() => {
    const owner = ${JSON.stringify(ownerName)};
    const clean = value => String(value || '').replace(/\\s+/g, ' ').trim();
    const visible = element => {
      if (!element) return false;
      const rect = element.getBoundingClientRect();
      return Boolean((rect.width || rect.height || element.getClientRects().length) && getComputedStyle(element).visibility !== 'hidden');
    };
    const textFor = element => clean([
      element.innerText,
      element.textContent,
      element.value,
      element.getAttribute('aria-label'),
      element.getAttribute('placeholder'),
      element.getAttribute('title'),
      element.getAttribute('data-testid'),
      element.getAttribute('data-test-id')
    ].filter(Boolean).join(' '));
    const click = element => {
      element.scrollIntoView({block: 'center', inline: 'nearest'});
      element.dispatchEvent(new MouseEvent('mouseover', {bubbles: true, cancelable: true, view: window}));
      element.click();
    };
    const controls = [...document.querySelectorAll('[data-test-id*="assign"], [data-testid*="assign"], button, [role="button"], aside div, aside section')]
      .filter(visible)
      .filter(element => !element.closest('[role="dialog"]'));
    const assigneeControl = controls
      .find(element => /assignee|unassigned/i.test(textFor(element))) ||
      controls.find(element => /owner|assigned/i.test(textFor(element)));
    if (!assigneeControl) return JSON.stringify({ok: false, reason: 'Sentry assignee control not found'});
    click(assigneeControl);
    const input = [...document.querySelectorAll('input:not([type="hidden"]), textarea, [contenteditable="true"], [role="textbox"], [role="combobox"]')]
      .filter(visible)
      .find(element => /assignee|owner|member|search|user|team|select/i.test(textFor(element))) ||
      (visible(document.activeElement) ? document.activeElement : null);
    if (!input || !input.matches?.('input:not([type="hidden"]), textarea, [contenteditable="true"], [role="textbox"], [role="combobox"]')) {
      return JSON.stringify({ok: true, clicked: textFor(assigneeControl).slice(0, 240), typed: false, message: 'Assignee dropdown opened; no search input was visible yet'});
    }
    input.focus();
    input.click();
    if (input.select) input.select();
    const current = input.isContentEditable ? clean(input.textContent) : String(input.value || '');
    if (current !== owner) {
      const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), 'value')?.set;
      if (input.isContentEditable) input.textContent = '';
      else if (setter) setter.call(input, '');
      else input.value = '';
      input.dispatchEvent(new InputEvent('input', {bubbles: true, inputType: 'deleteContentBackward', data: ''}));
      if (document.execCommand) document.execCommand('insertText', false, owner);
      const after = input.isContentEditable ? clean(input.textContent) : String(input.value || '');
      if (after !== owner) {
        if (input.isContentEditable) input.textContent = owner;
        else if (setter) setter.call(input, owner);
        else input.value = owner;
      }
      input.dispatchEvent(new InputEvent('input', {bubbles: true, inputType: 'insertText', data: owner}));
      input.dispatchEvent(new Event('change', {bubbles: true}));
    }
    input.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowDown', code: 'ArrowDown', bubbles: true, cancelable: true}));
    input.dispatchEvent(new KeyboardEvent('keyup', {key: 'ArrowDown', code: 'ArrowDown', bubbles: true, cancelable: true}));
    return JSON.stringify({ok: true, clicked: textFor(assigneeControl).slice(0, 240), typed: true, owner, inputValue: (input.isContentEditable ? clean(input.textContent) : String(input.value || '')).slice(0, 160)});
  })()`;
  return JSON.parse(executeActiveTabJavascript(js));
}

function selectSentryAssigneeOption(ownerName) {
  const js = `(() => {
    const owner = ${JSON.stringify(ownerName)};
    const clean = value => String(value || '').replace(/\\s+/g, ' ').trim();
    const visible = element => {
      if (!element) return false;
      const rect = element.getBoundingClientRect();
      return Boolean((rect.width || rect.height || element.getClientRects().length) && getComputedStyle(element).visibility !== 'hidden');
    };
    const textFor = element => clean([
      element.innerText,
      element.textContent,
      element.value,
      element.getAttribute('aria-label'),
      element.getAttribute('title'),
      element.getAttribute('data-testid'),
      element.getAttribute('data-test-id')
    ].filter(Boolean).join(' '));
    const roots = [...document.querySelectorAll('[role="listbox"], [role="menu"], [role="dialog"], [data-test-id*="assignee"], [data-testid*="assignee"], [class*="menu"], [id*="react-select"]')]
      .filter(visible);
    const rawCandidates = (roots.length ? roots : [document])
      .flatMap(root => [...root.querySelectorAll('[role="option"], [role="menuitem"], button, [role="button"], [data-testid], [data-test-id], div, span')])
      .filter(visible)
      .filter(element => !element.closest('aside section'))
      .map(element => ({element, text: textFor(element)}))
      .filter(item => item.text.toLowerCase().includes(owner.toLowerCase()));
    const optionMap = new Map();
    for (const item of rawCandidates) {
      const option = item.element.closest('[role="option"], [role="menuitem"], button, [role="button"], [data-testid], [data-test-id]') || item.element;
      if (!visible(option)) continue;
      if (!optionMap.has(option)) optionMap.set(option, {element: option, text: textFor(option) || item.text});
    }
    const candidates = [...optionMap.values()].filter(item => item.text.toLowerCase().includes(owner.toLowerCase()));
    if (!candidates.length) {
      return JSON.stringify({ok: false, reason: 'No matching Sentry assignee option found', owner, visibleOptions: rawCandidates.map(item => item.text).slice(0, 10)});
    }
    if (candidates.length > 1) {
      return JSON.stringify({ok: false, reason: 'Multiple matching Sentry assignee options found', owner, visibleOptions: candidates.map(item => item.text).slice(0, 10), matchCount: candidates.length});
    }
    const option = candidates[0];
    option.element.scrollIntoView({block: 'center', inline: 'nearest'});
    option.element.click();
    return JSON.stringify({ok: true, owner, selected: option.text.slice(0, 240)});
  })()`;
  return JSON.parse(executeActiveTabJavascript(js));
}

function verifySentryAssignee(ownerName) {
  const state = extractSentryAssigneeState(ownerName);
  return sentryAssigneeMatches(state.assigneeText, ownerName)
    ? {ok: true, ownerName, assigneeText: state.assigneeText, state}
    : {ok: false, reason: `Sentry assignee is not ${ownerName}`, ownerName, state};
}

function assignSentryIssueToOwnerViaChrome(ownerName, ticketKey) {
  const owner = cleanText(ownerName, 160);
  const key = cleanText(ticketKey, 80).toUpperCase();
  if (!owner) {
    return {type: 'sentry-assignee-sync', key, status: 'blocked', message: `No Jira owner/assignee was available for ${key}.`};
  }
  if (jiraDryRun) {
    return {type: 'sentry-assignee-sync', key, ownerName: owner, status: 'dry-run', message: `Would assign Sentry issue to Jira owner ${owner}.`};
  }
  let state = extractSentryAssigneeState(owner);
  if (state.authState === 'login_or_auth_required') {
    return {type: 'sentry-assignee-sync', key, ownerName: owner, status: 'blocked', message: 'Sentry requires login/authentication while syncing assignee.'};
  }
  if (sentryAssigneeMatches(state.assigneeText, owner)) {
    return {type: 'sentry-assignee-sync', key, ownerName: owner, status: 'already-assigned', via: 'chrome-ui', assigneeText: state.assigneeText};
  }
  const steps = [];
  steps.push({
    step: 'open-assignee-dropdown',
    result: waitForUiAction(`open Sentry assignee dropdown for ${owner}`, () => openSentryAssigneeDropdown(owner), {timeoutMs: sentryIssueTrackingActionTimeoutMs}),
  });
  if (!steps.at(-1).result.ok) {
    return {type: 'sentry-assignee-sync', key, ownerName: owner, status: 'blocked', via: 'chrome-ui', message: steps.at(-1).result.reason, steps};
  }
  sleep(sentryIssueTrackingSettleMs);
  steps.push({
    step: 'select-assignee-option',
    result: waitForUiAction(`select Sentry assignee ${owner}`, () => selectSentryAssigneeOption(owner), {timeoutMs: sentryIssueTrackingActionTimeoutMs}),
  });
  if (!steps.at(-1).result.ok) {
    return {type: 'sentry-assignee-sync', key, ownerName: owner, status: 'blocked', via: 'chrome-ui', message: steps.at(-1).result.reason, steps};
  }
  sleep(sentryIssueTrackingSettleMs);
  steps.push({
    step: 'confirm-sentry-assignee',
    result: waitForUiAction(`confirm Sentry assignee ${owner}`, () => verifySentryAssignee(owner), {timeoutMs: sentryIssueTrackingActionTimeoutMs}),
  });
  if (!steps.at(-1).result.ok) {
    return {type: 'sentry-assignee-sync', key, ownerName: owner, status: 'blocked', via: 'chrome-ui', message: steps.at(-1).result.reason, steps};
  }
  return {type: 'sentry-assignee-sync', key, ownerName: owner, status: 'assigned', via: 'chrome-ui', steps};
}

function ensureSentryAssigneeForJiraOwner(tickets, jiraActions = [], sentryIssueUrl = '') {
  const linkedTickets = mergeTickets(tickets);
  if (linkedTickets.length > 1) {
    return {
      actions: [{
        type: 'sentry-assignee-sync',
        status: 'blocked',
        keys: linkedTickets.map((ticket) => ticket.key),
        message: 'Multiple linked Jira tickets are visible; refusing to guess which Jira owner should own the Sentry issue.',
      }],
    };
  }
  const primaryTicket = linkedTickets[0];
  if (!primaryTicket) {
    return {actions: []};
  }
  const owner = resolveJiraOwnerViaChrome(primaryTicket, jiraActions);
  if (!owner.ok) {
    return {
      actions: [{
        type: 'sentry-assignee-sync',
        key: primaryTicket.key,
        status: owner.status === 'dry-run' ? 'dry-run' : 'blocked',
        message: owner.message || `Could not resolve Jira owner for ${primaryTicket.key}.`,
      }],
    };
  }
  if (sentryIssueUrl) {
    navigateActiveTab(sentryIssueUrl);
    waitForPage(issueIdFrom(sentryIssueUrl));
  }
  const action = assignSentryIssueToOwnerViaChrome(owner.ownerName, primaryTicket.key);
  return {actions: [{...action, jiraOwnerSource: owner.source}]};
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
  if (standaloneMode) {
    return {};
  }
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
  if (standaloneMode) {
    return null;
  }
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
  const id = issueIdFrom(row.issueId || row.issueUrl);
  const tickets = mergeTickets(rowTickets(row), detailState.tickets, ensuredTickets);
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

  if (standaloneMode) {
    return nextResults;
  }

  const report = await getReport();
  const patchItem = (item) => patchSentryItem(item, id, tickets, checkedAt, detailState, row, jiraActions);
  const lastFeed = report.lastSentryFeedSnapshot && typeof report.lastSentryFeedSnapshot === 'object'
    ? report.lastSentryFeedSnapshot
    : {};

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
      standaloneMode,
      scanLimit,
      totalIssueCount: total,
      checkedIssueCount: index + 1,
      foundIssueCount: nextResults.filter((item) => item.jiraTicketKeys.length).length,
      createdJiraIssueCount: nextResults.flatMap((item) => item.jiraActions || []).filter((action) => action.type === 'create' && action.status === 'created').length,
      assignedJiraIssueCount: nextResults.flatMap((item) => item.jiraActions || []).filter((action) => action.type === 'assign' && action.status === 'assigned').length,
      sentryIssueTrackingLinkedCount: nextResults.flatMap((item) => item.jiraActions || []).filter((action) => action.type === 'sentry-issue-tracking-link' && action.status === 'attached').length,
      sentryAssigneeSyncedCount: nextResults.flatMap((item) => item.jiraActions || []).filter((action) => action.type === 'sentry-assignee-sync' && ['assigned', 'already-assigned'].includes(action.status)).length,
      jiraDryRun,
      jiraAssignViaChrome,
      sentryAttachJiraTickets,
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
const snapshotRows = Array.isArray(snapshot.sentryIssueList?.rows) ? snapshot.sentryIssueList.rows : [];
const rows = snapshotRows
  .filter((row) => issueIdFrom(row.issueId || row.issueUrl) && row.issueUrl)
  .slice(0, Math.max(0, scanLimit));

if (!rows.length) {
  const snapshotRowCount = Number(snapshot.sentryIssueList?.rowCount || snapshotRows.length || 0);
  const hasUnextractableRows = snapshotRowCount > 0 || snapshotRows.length > 0;
  const status = hasUnextractableRows ? 'blocked' : 'skipped';
  const message = hasUnextractableRows
    ? `Snapshot has ${snapshotRowCount} Sentry row(s), but none contain an issue URL/id safe enough for Jira-link scanning.`
    : 'No issue rows were available for Jira-link scanning.';
  writeStatus({
    ok: !hasUnextractableRows,
    status,
    startedAt,
    finishedAt: new Date().toISOString(),
    message,
    checkedIssueCount: 0,
    plannedIssueCount: snapshotRowCount,
    foundIssueCount: 0,
    blocker: hasUnextractableRows ? {
      type: 'NO_EXTRACTABLE_ISSUE_ROWS',
      message,
    } : null,
    results: [],
  });
  console.log(JSON.stringify({
    ok: !hasUnextractableRows,
    status,
    checkedIssueCount: 0,
    plannedIssueCount: snapshotRowCount,
    foundIssueCount: 0,
    blocker: hasUnextractableRows ? 'NO_EXTRACTABLE_ISSUE_ROWS' : null,
  }, null, 2));
  process.exit(hasUnextractableRows ? EXIT.PRECONDITION : 0);
}

const results = [];
let workflowSignals = 0;
let uiAcknowledgements = 0;
const chromeDwellRecords = [];
let errors = 0;
let authAbort = null;
let uiAckAbort = null;
let jiraActionAbort = null;
const jiraPreflight = await preflightJiraWrites();

if (!jiraPreflight.ok) {
  log(`JIRA_PREFLIGHT_WARNING: ${jiraPreflight.message || jiraPreflight.code || 'Jira REST preflight failed'}. Known-ticket Sentry linking and Jira UI assignment may continue; no-ticket dedupe/create will be blocked.`);
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
      detailState = extractDetailJiraTickets();
      if (detailState.authState === 'login_or_auth_required') {
        throw new AuthAbort(`Sentry detail page for ${id} requires login/authentication.`, row, detailState);
      }
      const initialTickets = mergeTickets(rowTickets(row), detailState.tickets);
      const jiraEnsure = await ensureJiraTicketActions(row, detailState, initialTickets);
      navigateActiveTab(url);
      waitForPage(id);
      detailState = extractDetailJiraTickets();
      if (detailState.authState === 'login_or_auth_required') {
        throw new AuthAbort(`Sentry detail page for ${id} requires login/authentication after Jira actions.`, row, detailState);
      }
      const sentryLinkEnsure = ensureSentryIssueTrackingLinks(detailState, jiraEnsure.tickets);
      detailState = sentryLinkEnsure.detailState;
      const linkActions = [...jiraEnsure.actions, ...sentryLinkEnsure.actions];
      const visibleIssueTrackingTickets = issueTrackingTicketsFromState(detailState, jiraEnsure.tickets);
      const sentryAssigneeEnsure = !sentrySyncAssignee || linkActions.some((action) => action.status === 'blocked')
        ? {actions: []}
        : ensureSentryAssigneeForJiraOwner(visibleIssueTrackingTickets, linkActions, url);
      navigateActiveTab(url);
      waitForPage(id);
      chromeDwellStartedAt = Date.now();
      detailState = extractDetailJiraTickets();
      if (detailState.authState === 'login_or_auth_required') {
        throw new AuthAbort(`Sentry detail page for ${id} requires login/authentication after Jira owner sync.`, row, detailState);
      }
      const jiraActions = [...linkActions, ...sentryAssigneeEnsure.actions];
      results.splice(0, results.length, ...(await updateReport(row, detailState, new Date().toISOString(), results, index, rows.length, jiraEnsure.tickets, jiraActions)));
      const found = jiraEnsure.tickets.map((ticket) => ticket.key).join(', ') || 'no Jira ticket';
      const actionSummary = jiraActions
        .map((action) => [action.type, action.status, action.key].filter(Boolean).join(':'))
        .join(', ');
      const resultWorkflow = await signalWorkflow(row, index, rows.length, `${key}: ${found}${actionSummary ? ` (${actionSummary})` : ''}. Moving to the next issue.`, 'active', randomUUID(), workflowContext);
      if (resultWorkflow) {
        workflowSignals += 1;
        const expectedKeys = jiraEnsure.tickets.map((ticket) => ticket.key);
        await waitForUiAck(row, resultWorkflow, expectedKeys, 'Jira scan result');
        uiAcknowledgements += 1;
      }
      const blockedAction = jiraActions.find((action) => action.status === 'blocked');
      if (blockedAction) {
        jiraActionAbort = {
          row,
          action: blockedAction,
          message: `${key}: Jira/Sentry UI action blocked (${[blockedAction.type, blockedAction.key].filter(Boolean).join(' ')}). The scan stopped before opening the next issue.`,
        };
        log(`JIRA_ACTION_BLOCKED: ${jiraActionAbort.message}`);
        break;
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
const sentryIssueTrackingLinkedCount = results.flatMap((item) => item.jiraActions || []).filter((action) => action.type === 'sentry-issue-tracking-link' && action.status === 'attached').length;
const sentryAssigneeSyncedCount = results.flatMap((item) => item.jiraActions || []).filter((action) => action.type === 'sentry-assignee-sync' && ['assigned', 'already-assigned'].includes(action.status)).length;
const blockedJiraActionCount = results.flatMap((item) => item.jiraActions || []).filter((action) => action.status === 'blocked').length;
if (!standaloneMode) {
  await postJson(workflowApi, {
    status: authAbort || uiAckAbort || jiraActionAbort || errors ? 'blocked' : 'success',
    step: `${results.length}/${rows.length}`,
    title: authAbort
      ? 'Sentry Jira link scan auth blocked'
      : uiAckAbort
        ? 'Sentry Jira link scan UI sync blocked'
        : jiraActionAbort
          ? 'Sentry Jira link scan action blocked'
          : 'Sentry Jira link scan complete',
    message: authAbort
      ? `${authAbort.message} The scan stopped before writing a false no-ticket result.`
      : uiAckAbort
        ? `${uiAckAbort.message} The scan stopped so the next issue is not opened before the app reflects the current action.`
        : jiraActionAbort
          ? jiraActionAbort.message
          : `Checked ${rows.length} visible Sentry issue(s); found Jira tickets for ${foundIssueCount}; created Jira tickets: ${createdJiraIssueCount}; assigned Jira tickets: ${assignedJiraIssueCount}; linked Jira tickets in Sentry Issue Tracking: ${sentryIssueTrackingLinkedCount}; synced Sentry assignees to Jira owners: ${sentryAssigneeSyncedCount}; scan errors: ${errors}.`,
    phase: 'jira-link-scan',
    sentryIssueId: authAbort || uiAckAbort || jiraActionAbort ? issueIdFrom((authAbort || uiAckAbort || jiraActionAbort).row?.issueId || (authAbort || uiAckAbort || jiraActionAbort).row?.issueUrl) : undefined,
    sentryKey: authAbort || uiAckAbort || jiraActionAbort ? firstShortId((authAbort || uiAckAbort || jiraActionAbort).row, issueIdFrom((authAbort || uiAckAbort || jiraActionAbort).row?.issueId || (authAbort || uiAckAbort || jiraActionAbort).row?.issueUrl)) : undefined,
    url: authAbort ? authAbort.detailState?.url || canonicalIssueUrl(authAbort.row?.issueUrl) : (uiAckAbort || jiraActionAbort ? canonicalIssueUrl((uiAckAbort || jiraActionAbort).row?.issueUrl) : undefined),
    source,
    updatedAt: finishedAt,
  }).catch((error) => log(`WORKFLOW_COMPLETE_WARNING: ${error.message}`));
}

writeStatus({
  ok: !authAbort && !uiAckAbort && !jiraActionAbort && errors === 0,
  status: authAbort || uiAckAbort || jiraActionAbort ? 'blocked' : (errors ? 'completed-with-warnings' : 'complete'),
  startedAt,
  finishedAt,
  checkedIssueCount: results.length,
  plannedIssueCount: rows.length,
  foundIssueCount,
  createdJiraIssueCount,
  assignedJiraIssueCount,
  sentryIssueTrackingLinkedCount,
  sentryAssigneeSyncedCount,
  blockedJiraActionCount,
  jiraDryRun,
  jiraAssignViaChrome,
  sentryAttachJiraTickets,
  sentrySyncAssignee,
  standaloneMode,
  jiraUiActionTimeoutMs,
  sentryIssueTrackingActionTimeoutMs,
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
  } : (jiraActionAbort ? {
    type: 'JIRA_ACTION_FAILURE',
    message: jiraActionAbort.message,
    issueId: issueIdFrom(jiraActionAbort.row?.issueId || jiraActionAbort.row?.issueUrl),
    url: canonicalIssueUrl(jiraActionAbort.row?.issueUrl),
    action: jiraActionAbort.action,
  } : null)),
  workflowSignals,
  uiAcknowledgements,
  focusedUiAcknowledgements: uiAcknowledgements,
  reportApi,
  workflowApi,
  uiStateApi,
  results,
});

console.log(JSON.stringify({
  ok: !authAbort && !uiAckAbort && !jiraActionAbort && errors === 0,
  status: authAbort || uiAckAbort || jiraActionAbort ? 'blocked' : (errors ? 'completed-with-warnings' : 'complete'),
  checkedIssueCount: results.length,
  plannedIssueCount: rows.length,
  foundIssueCount,
  createdJiraIssueCount,
  assignedJiraIssueCount,
  sentryIssueTrackingLinkedCount,
  sentryAssigneeSyncedCount,
  blockedJiraActionCount,
  jiraDryRun,
  jiraAssignViaChrome,
  sentryAttachJiraTickets,
  standaloneMode,
  jiraUiActionTimeoutMs,
  sentryIssueTrackingActionTimeoutMs,
  jiraPreflight,
  uiAckConsecutiveMatches,
  minChromeDwellMs,
  chromeDwellWaitCount: chromeDwellRecords.filter((record) => record.enforcedSleepMs > 0).length,
  chromeDwellWaitMs: chromeDwellRecords.reduce((total, record) => total + record.enforcedSleepMs, 0),
  errorCount: errors,
  blocker: authAbort ? 'AUTH_FAILURE' : (uiAckAbort ? 'UI_ACK_FAILURE' : (jiraActionAbort ? 'JIRA_ACTION_FAILURE' : null)),
  workflowSignals,
  uiAcknowledgements,
  focusedUiAcknowledgements: uiAcknowledgements,
}, null, 2));

if (authAbort || uiAckAbort || jiraActionAbort) {
  process.exit(authAbort ? EXIT.AUTH : EXIT.PRECONDITION);
}
