#!/usr/bin/env node
import { copyFileSync, existsSync, openSync, closeSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const snapshotPath = process.argv[2] || process.env.SENTRY_SNAPSHOT_JSON;
const reportApi = process.env.SENTRY_TRIAGE_REPORT_API || 'http://127.0.0.1:8766/api/report-data';
const reportDataPath = process.env.SENTRY_TRIAGE_REPORT_DATA_PATH || '/Users/thien.nguyen/Desktop/Sentry Triage History/report-data.json';
const syncStatusPath = process.env.SENTRY_TRIAGE_REPORT_SYNC_STATUS_JSON || join(scriptDir, 'live-report-sync-status.json');
const syncSource = 'sentry-chrome-tab-snapshot';

if (!snapshotPath) {
  fail('Missing snapshot path. Pass the full snapshot JSON path as argv[2] or set SENTRY_SNAPSHOT_JSON.');
}

function fail(message, extra = {}) {
  writeStatus({
    ok: false,
    status: 'failed',
    syncedAt: new Date().toISOString(),
    message,
    ...extra,
  });
  console.error(`[${syncSource}] ${message}`);
  process.exit(1);
}

function log(message) {
  console.error(`[${syncSource}] ${message}`);
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function atomicWriteJson(file, data) {
  const dir = dirname(file);
  const tmp = join(dir, `.${basename(file)}.tmp-${process.pid}-${Date.now()}`);
  const json = `${JSON.stringify(data, null, 2)}\n`;
  const fd = openSync(tmp, 'w', 0o600);
  try {
    writeFileSync(fd, json, 'utf8');
  } finally {
    closeSync(fd);
  }
  renameSync(tmp, file);
}

function writeStatus(status) {
  if (!syncStatusPath) return;
  atomicWriteJson(syncStatusPath, status);
}

function cleanText(value, maxLength = 400) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function canonicalIssueUrl(value, id) {
  if (id) return `https://check24-energie.sentry.io/issues/${id}/`;
  if (!value) return '';
  try {
    const url = new URL(value);
    const match = url.pathname.match(/\/issues\/(\d+)/);
    return match ? `${url.origin}/issues/${match[1]}/` : url.toString();
  } catch {
    return String(value);
  }
}

function issueIdFrom(value) {
  if (value === null || value === undefined) return '';
  const text = String(value);
  if (/^\d+$/.test(text)) return text;
  const match = text.match(/\/issues\/(\d+)/);
  return match ? match[1] : '';
}

function substatusFrom(row) {
  const status = cleanText(row.status, 80).toLowerCase();
  if (!status) return 'unresolved';
  return status
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'unresolved';
}

function firstShortId(row, id) {
  if (Array.isArray(row.sentryShortIds)) {
    const value = row.sentryShortIds.map((item) => cleanText(item, 120)).find(Boolean);
    if (value) return value;
  }
  return id || 'SENTRY-ISSUE';
}

function snapshotItemFromRow(row, existingIds, previousItem = {}) {
  const id = issueIdFrom(row.issueId || row.issueUrl);
  const url = canonicalIssueUrl(row.issueUrl, id);
  const preservedJira = {};
  for (const key of ['jiraTickets', 'jiraTicketKeys', 'linkedJiraKeys', 'jiraScanStatus', 'lastJiraLinkScanAt', 'lastJiraLinkScanUrl', 'lastJiraLinkScanTitle']) {
    if (previousItem[key] !== undefined) preservedJira[key] = previousItem[key];
  }
  return {
    ...preservedJira,
    id,
    key: firstShortId(row, id),
    title: cleanText(row.issueTitle || row.culprit || 'Untitled Sentry issue', 500),
    status: 'unresolved',
    substatus: substatusFrom(row),
    count: cleanText(row.eventCount, 80),
    userCount: cleanText(row.userCount, 80),
    frequency: cleanText(row.frequency, 80),
    priority: cleanText(row.priority, 80),
    lastSeen: cleanText(row.lastSeen?.text || row.lastSeen, 120),
    firstSeen: cleanText(row.firstSeen?.text || row.firstSeen, 120),
    assignedTo: cleanText(row.assignee || row.owner, 120),
    project: cleanText(row.projectSlug || row.projectId, 160),
    url,
    knownInReport: id ? existingIds.has(id) : false,
    pluginIssues: [],
  };
}

function patchScopeItem(item, row, checkedAt) {
  const id = issueIdFrom(item.id || item.sentryIssueId || item.sentryUrl || item.permalink);
  const shortId = firstShortId(row, id);
  const title = cleanText(row.issueTitle, 500);
  return {
    ...item,
    id: item.id || id,
    sentryIssueId: item.sentryIssueId || id,
    shortId: item.shortId || shortId,
    sentryKey: item.sentryKey || shortId,
    title: title && title !== '<unknown>' ? title : item.title,
    projectSlug: cleanText(row.projectSlug, 160) || item.projectSlug,
    projectName: cleanText(row.projectSlug, 160) || item.projectName,
    repo: item.repo || cleanText(row.projectSlug, 160),
    status: 'unresolved',
    substatus: substatusFrom(row),
    permalink: item.permalink || canonicalIssueUrl(row.issueUrl, id),
    sentryUrl: item.sentryUrl || canonicalIssueUrl(row.issueUrl, id),
    visibleEventCount24h: cleanText(row.eventCount, 80),
    visibleUserCount24h: cleanText(row.userCount, 80),
    visibleFrequency24h: cleanText(row.frequency, 80),
    visiblePriority: cleanText(row.priority, 80),
    visibleLastSeenText: cleanText(row.lastSeen?.text || row.lastSeen, 120),
    visibleFirstSeenText: cleanText(row.firstSeen?.text || row.firstSeen, 120),
    lastVisibleSnapshotAt: checkedAt,
    lastVisibleSnapshotRank: row.rowIndex || null,
  };
}

function sentryScopeId(item) {
  return issueIdFrom(item?.id || item?.sentryIssueId || item?.sentryUrl || item?.permalink);
}

function verificationIds(verification) {
  if (!verification || typeof verification !== 'object') return [];
  if (Array.isArray(verification.unionIds)) return verification.unionIds.map(issueIdFrom).filter(Boolean);
  if (Array.isArray(verification.union)) return verification.union.map(sentryScopeId).filter(Boolean);
  return [];
}

function hasConsistentScope(data) {
  const sourceItems = Array.isArray(data.sentryScopeItems) ? data.sentryScopeItems : [];
  const expectedIds = verificationIds(data.sentrySourceVerification);
  if (!sourceItems.length || !expectedIds.length) return false;
  const actual = new Set(sourceItems.map(sentryScopeId).filter(Boolean));
  const expected = new Set(expectedIds);
  if (actual.size !== sourceItems.length || expected.size !== expectedIds.length) return false;
  if (actual.size !== expected.size) return false;
  return [...expected].every((id) => actual.has(id));
}

async function getCurrentReport() {
  try {
    const response = await fetch(reportApi, { cache: 'no-store' });
    if (response.ok) {
      return {
        data: await response.json(),
        source: 'api',
      };
    }
    log(`GET ${reportApi} returned HTTP ${response.status}; falling back to ${reportDataPath}`);
  } catch (error) {
    log(`GET ${reportApi} failed (${error.message}); falling back to ${reportDataPath}`);
  }

  if (!existsSync(reportDataPath)) {
    fail(`Live report data file does not exist: ${reportDataPath}`);
  }
  return {
    data: readJson(reportDataPath),
    source: 'file',
  };
}

async function pushReport(data) {
  const response = await fetch(reportApi, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(data),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.ok === false) {
    const error = payload.error || `HTTP ${response.status}`;
    const validation = payload.validation?.errors ? ` (${payload.validation.errors.join('; ')})` : '';
    throw new Error(`${error}${validation}`);
  }
  return payload;
}

const snapshot = readJson(snapshotPath);
const { data: report, source: reportSource } = await getCurrentReport();
const checkedAt = snapshot.sentryIssueList?.capturedAt || snapshot.extractionFinishedAt || new Date().toISOString();
const rows = Array.isArray(snapshot.sentryIssueList?.rows) ? snapshot.sentryIssueList.rows : [];
const existingScopeItems = Array.isArray(report.sentryScopeItems) ? report.sentryScopeItems : [];
const existingIds = new Set(existingScopeItems.map(sentryScopeId).filter(Boolean));
const rowsById = new Map(rows.map((row) => [issueIdFrom(row.issueId || row.issueUrl), row]).filter(([id]) => id));
const previousFeedItemsById = new Map((Array.isArray(report.lastSentryFeedSnapshot?.items) ? report.lastSentryFeedSnapshot.items : [])
  .map((item) => [sentryScopeId(item), item])
  .filter(([id]) => id));
const matchedScopeIds = new Set([...rowsById.keys()].filter((id) => existingIds.has(id)));
const patchedScopeItems = existingScopeItems.map((item) => {
  const row = rowsById.get(sentryScopeId(item));
  return row ? patchScopeItem(item, row, checkedAt) : item;
});
const snapshotItems = rows
  .map((row) => {
    const id = issueIdFrom(row.issueId || row.issueUrl);
    return snapshotItemFromRow(row, existingIds, previousFeedItemsById.get(id));
  })
  .filter((item) => item.id);
const blockerText = Array.isArray(snapshot.blockers) && snapshot.blockers.length
  ? snapshot.blockers.map((blocker) => `${blocker.type}: ${blocker.message}`).join(' | ')
  : '';

const next = {
  ...report,
  lastUpdated: checkedAt,
  sentryScopeItems: patchedScopeItems,
  lastSentryFeedSnapshot: {
    checkedAt,
    source: 'Verified Google Chrome profile DOM snapshot',
    query: 'is:unresolved sort=freq statsPeriod=24h',
    scope: 'all-unresolved-visible-chrome-rows',
    targetUrl: snapshot.target?.url || '',
    currentPageUrl: snapshot.sentryIssueList?.url || '',
    authState: snapshot.sentryIssueList?.authState || null,
    rowCount: rows.length,
    profileWindowCount: snapshot.openedTabs?.profileWindowCount || 0,
    profileTabCount: snapshot.openedTabs?.profileTabCount || 0,
    tabAction: snapshot.target?.action || null,
    items: snapshotItems,
    untrackedEligibleCandidates: snapshotItems.filter((item) => !item.knownInReport),
    blocker: blockerText,
    scopeFilteredAt: checkedAt,
  },
  lastChromeProfileSentrySnapshot: {
    checkedAt,
    automationId: snapshot.automationId || 'sentry-chrome-tab-snapshot',
    status: snapshot.run?.status || 'unknown',
    exitCode: snapshot.run?.exitCode ?? null,
    targetEmail: snapshot.target?.email || '',
    targetUrl: snapshot.target?.url || '',
    currentPageUrl: snapshot.sentryIssueList?.url || '',
    tabAction: snapshot.target?.action || null,
    rowCount: rows.length,
    profileWindowCount: snapshot.openedTabs?.profileWindowCount || 0,
    profileTabCount: snapshot.openedTabs?.profileTabCount || 0,
    matchedExistingScopeCount: matchedScopeIds.size,
    outOfCurrentScopeCount: snapshotItems.filter((item) => !item.knownInReport).length,
    fullSnapshotPath: snapshotPath,
  },
};

if (next.sentrySourceVerification && hasConsistentScope(next)) {
  next.sentrySourceVerification = {
    ...next.sentrySourceVerification,
    status: 'verified',
    verifiedAt: checkedAt,
    verifiedBy: syncSource,
    sourceUnionFrozen: next.sentrySourceVerification.sourceUnionFrozen === true,
    lastChromeSnapshotAt: checkedAt,
    lastChromeSnapshotRows: rows.length,
    lastChromeSnapshotMatchedScopeCount: matchedScopeIds.size,
    lastChromeSnapshotOutOfScopeCount: snapshotItems.filter((item) => !item.knownInReport).length,
  };
}

if (existsSync(reportDataPath)) {
  const stamp = checkedAt.replace(/[:.]/g, '-');
  const backupPath = join(dirname(reportDataPath), `report-data.snapshot-sync-${stamp}.json`);
  copyFileSync(reportDataPath, backupPath);
  next.lastChromeProfileSentrySnapshot.backupPath = backupPath;
}

let apiResult;
try {
  apiResult = await pushReport(next);
} catch (error) {
  fail(`Could not update localhost report via ${reportApi}: ${error.message}`, {
    checkedAt,
    reportSource,
    rowCount: rows.length,
    matchedExistingScopeCount: matchedScopeIds.size,
    outOfCurrentScopeCount: snapshotItems.filter((item) => !item.knownInReport).length,
  });
}

writeStatus({
  ok: true,
  status: 'synced',
  syncedAt: new Date().toISOString(),
  checkedAt,
  reportApi,
  reportDataPath,
  reportSource,
  rowCount: rows.length,
  profileTabCount: snapshot.openedTabs?.profileTabCount || 0,
  matchedExistingScopeCount: matchedScopeIds.size,
  outOfCurrentScopeCount: snapshotItems.filter((item) => !item.knownInReport).length,
  sourceVerificationStatus: next.sentrySourceVerification?.status || null,
  apiReport: apiResult.report || null,
});

console.log(JSON.stringify({
  ok: true,
  status: 'synced',
  checkedAt,
  rowCount: rows.length,
  matchedExistingScopeCount: matchedScopeIds.size,
  outOfCurrentScopeCount: snapshotItems.filter((item) => !item.knownInReport).length,
  sourceVerificationStatus: next.sentrySourceVerification?.status || null,
}, null, 2));
