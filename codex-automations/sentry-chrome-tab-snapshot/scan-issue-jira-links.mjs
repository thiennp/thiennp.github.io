#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
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

async function signalWorkflow(row, index, total, message, status = 'active') {
  const id = issueIdFrom(row.issueId || row.issueUrl);
  const key = firstShortId(row, id);
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
  const highlighted = Number(ui.highlightedCount || 0) > 0 && (ui.sourceScopeHighlighted === true || ui.visibleFeedHighlighted === true);
  const uiKeys = new Set((Array.isArray(ui.activeJiraKeys) ? ui.activeJiraKeys : []).map((item) => cleanText(item, 80).toUpperCase()));
  const jiraVisible = expectedJiraKeys.every((ticket) => uiKeys.has(cleanText(ticket, 80).toUpperCase()));
  return sameIssue && sameWorkflow && highlighted && jiraVisible;
}

async function waitForUiAck(row, workflow, expectedJiraKeys = [], label = 'active issue') {
  const started = Date.now();
  let lastUiState = null;
  while (Date.now() - started < uiAckTimeoutMs) {
    try {
      const payload = await getJson(uiStateApi);
      lastUiState = payload.ui || null;
      if (uiAckMatches(lastUiState, row, workflow, expectedJiraKeys)) {
        return lastUiState;
      }
    } catch (error) {
      lastUiState = {error: error.message};
    }
    sleep(uiAckPollMs);
  }
  const id = issueIdFrom(row.issueId || row.issueUrl);
  throw new UiAckAbort(`UI did not acknowledge/render ${label} for Sentry issue ${id} within ${uiAckTimeoutMs}ms.`, row, lastUiState);
}

function patchSentryItem(item, id, tickets, checkedAt, detailState, row) {
  const itemId = issueIdFrom(item?.id || item?.sentryIssueId || item?.issueId || item?.sentryUrl || item?.permalink || item?.url);
  if (itemId !== id) return item;
  const existingTickets = itemTickets(item);
  const mergedTickets = mergeTickets(existingTickets, rowTickets(row), tickets);
  const ticketKeys = mergedTickets.map((ticket) => ticket.key);
  const foundThisRun = mergeTickets(rowTickets(row), tickets).length > 0;
  return {
    ...item,
    jiraTickets: mergedTickets,
    jiraTicketKeys: ticketKeys,
    linkedJiraKeys: mergedTickets.map((ticket) => ({
      key: ticket.key,
      href: ticket.url || jiraUrl(ticket.key),
      source: ticket.source,
    })),
    jiraScanStatus: ticketKeys.length
      ? (foundThisRun ? 'jira-ticket-found' : 'jira-ticket-known-from-report')
      : 'no-jira-ticket-found',
    lastJiraLinkScanAt: checkedAt,
    lastJiraLinkScanUrl: detailState.url || canonicalIssueUrl(row.issueUrl, id),
    lastJiraLinkScanTitle: detailState.title || '',
  };
}

async function updateReport(row, detailState, checkedAt, results, index, total) {
  const report = await getReport();
  const id = issueIdFrom(row.issueId || row.issueUrl);
  const tickets = mergeTickets(rowTickets(row), detailState.tickets);
  const patchItem = (item) => patchSentryItem(item, id, tickets, checkedAt, detailState, row);
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
    status: tickets.length ? 'jira-ticket-found' : 'no-jira-ticket-found',
    authState: detailState.authState || null,
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
let errors = 0;
let authAbort = null;
let uiAckAbort = null;

try {
  for (const [index, row] of rows.entries()) {
    const id = issueIdFrom(row.issueId || row.issueUrl);
    const url = canonicalIssueUrl(row.issueUrl, id);
    const key = firstShortId(row, id) || id;
    let detailState = null;
    try {
      const openingWorkflow = await signalWorkflow(row, index, rows.length, `Opening ${key} to check attached Jira tickets.`);
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
      results.splice(0, results.length, ...(await updateReport(row, detailState, new Date().toISOString(), results, index, rows.length)));
      const found = mergeTickets(rowTickets(row), detailState.tickets).map((ticket) => ticket.key).join(', ') || 'no Jira ticket';
      const resultWorkflow = await signalWorkflow(row, index, rows.length, `${key}: ${found}. Moving to the next issue.`, 'active');
      if (resultWorkflow) {
        workflowSignals += 1;
        const expectedKeys = mergeTickets(rowTickets(row), detailState.tickets).map((ticket) => ticket.key);
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
    : `Checked ${rows.length} visible Sentry issue(s); found Jira tickets for ${foundIssueCount}; scan errors: ${errors}.`,
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
  errorCount: errors,
  blocker: authAbort ? 'AUTH_FAILURE' : (uiAckAbort ? 'UI_ACK_FAILURE' : null),
  workflowSignals,
  uiAcknowledgements,
}, null, 2));

if (authAbort || uiAckAbort) {
  process.exit(authAbort ? EXIT.AUTH : EXIT.PRECONDITION);
}
