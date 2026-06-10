#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DEFAULT_OUT = path.join(__dirname, 'artifacts', 'current-sentry-issue-list.html');
const SENTRY_HELPER = path.join(__dirname, 'sentry-source-union.mjs');
const JIRA_BB_HELPER = path.join(__dirname, 'jira-bitbucket-snapshot.mjs');

const usage = () => {
  console.log(`Usage: generate-issue-list-html.mjs [options]

Options:
  --fresh
      Fetch fresh Sentry and Jira/Bitbucket snapshots before rendering.
  --sentry PATH
      Use an existing sanitized sentry-source-union JSON file.
  --jira-bitbucket PATH
      Use an existing sanitized jira-bitbucket-snapshot JSON file.
  --out PATH
      HTML output path. Defaults to artifacts/current-sentry-issue-list.html.
  --snapshot-dir DIR
      Directory for fresh snapshot JSON files. Defaults to /tmp/sentry-triage-html-<timestamp>.

The generated HTML is sanitized and contains no tokens.`);
};

const args = process.argv.slice(2);
let fresh = false;
let sentryPath = null;
let jiraBitbucketPath = null;
let outPath = DEFAULT_OUT;
let snapshotDir = null;

for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (arg === '--help' || arg === '-h') {
    usage();
    process.exit(0);
  }
  if (arg === '--fresh') {
    fresh = true;
  } else if (arg === '--sentry') {
    sentryPath = args[++i];
  } else if (arg === '--jira-bitbucket') {
    jiraBitbucketPath = args[++i];
  } else if (arg === '--out') {
    outPath = args[++i];
  } else if (arg === '--snapshot-dir') {
    snapshotDir = args[++i];
  } else {
    throw new Error(`Unknown argument: ${arg}`);
  }
}

const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
if (!snapshotDir) {
  snapshotDir = path.join('/tmp', `sentry-triage-html-${timestamp}`);
}

const runNode = (script, scriptArgs) => {
  const result = spawnSync(process.execPath, [script, ...scriptArgs], {
    cwd: __dirname,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 20 * 1024 * 1024,
  });
  if (result.status !== 0) {
    throw new Error(`Helper failed: ${path.basename(script)}\n${result.stderr || result.stdout}`);
  }
};

if (fresh || !sentryPath || !jiraBitbucketPath) {
  fs.mkdirSync(snapshotDir, { recursive: true });
}

if (fresh || !sentryPath) {
  sentryPath = path.join(snapshotDir, `sentry-source-union.${timestamp}.json`);
  runNode(SENTRY_HELPER, ['--out', sentryPath]);
}

if (fresh || !jiraBitbucketPath) {
  jiraBitbucketPath = path.join(snapshotDir, `jira-bitbucket-snapshot.${timestamp}.json`);
  runNode(JIRA_BB_HELPER, ['--mode', 'all', '--out', jiraBitbucketPath]);
}

const readJson = (inputPath) => JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const sentry = readJson(sentryPath);
const snapshot = readJson(jiraBitbucketPath);

if (sentry.status !== 'complete') {
  throw new Error(`Sentry source union is not complete: ${sentry.status}`);
}
if (snapshot.status !== 'complete') {
  throw new Error(`Jira/Bitbucket snapshot is not complete: ${snapshot.status}`);
}

const jiraIssues = snapshot.jira?.issues || [];
const jiraBySummary = new Map(jiraIssues.map((issue) => [String(issue.summary || '').trim(), issue]));
const priorityIds = new Set(['6708782936', '7430161619']);

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}[char]));

const badge = (text, className = '') => `<span class="badge ${className}">${escapeHtml(text)}</span>`;
const issueAssignee = (issue) => issue.assignedTo?.name || issue.assignedTo?.email || '';
const issueProject = (issue) => issue.project?.slug || issue.project?.name || issue.project || '';

const rows = (sentry.unionItems || []).map((issue) => {
  const jira = jiraBySummary.get(String(issue.title || '').trim());
  const isPriority =
    priorityIds.has(issue.id) ||
    issue.substatus === 'regressed' ||
    (issue.sourceKeys || []).includes('B');
  return { ...issue, jira, isPriority };
}).sort((a, b) => (
  Number(b.isPriority) - Number(a.isPriority) ||
  Number(b.count || 0) - Number(a.count || 0) ||
  String(a.shortId).localeCompare(String(b.shortId))
));

const priorityCount = rows.filter((row) => row.isPriority).length;
const regressedCount = rows.filter((row) => row.substatus === 'regressed').length;
const sourceACount = sentry.sources?.A?.count ?? '';
const sourceBCount = sentry.sources?.B?.count ?? '';
const bitbucketCount = snapshot.bitbucket?.count ?? snapshot.bitbucket?.pullRequests?.length ?? 0;

const rowsHtml = rows.map((row) => {
  const source = (row.sourceKeys || []).join(',');
  const assignee = issueAssignee(row) || 'unassigned';
  const project = issueProject(row);
  const jira = row.jira;
  return `<tr class="${row.isPriority ? 'priority' : ''}">
    <td>${row.isPriority ? badge('priority', 'hot') : ''}</td>
    <td><a href="${escapeHtml(row.permalink)}">${escapeHtml(row.shortId)}</a><div class="muted">${escapeHtml(row.id)}</div></td>
    <td>${escapeHtml(project)}</td>
    <td>${escapeHtml(row.title)}</td>
    <td>${badge(row.status)} ${badge(row.substatus, row.substatus === 'regressed' ? 'hot' : '')}</td>
    <td class="num">${escapeHtml(row.count)}</td>
    <td>${escapeHtml(assignee)}</td>
    <td>${escapeHtml(source)}</td>
    <td>${jira ? `<a href="${escapeHtml(jira.browseUrl)}">${escapeHtml(jira.key)}</a><div class="muted">${escapeHtml(jira.status)} / ${escapeHtml(jira.assignee?.displayName || '')}</div>` : '<span class="muted">none in assigned snapshot</span>'}</td>
  </tr>`;
}).join('\n');

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Sentry Triage Issue List</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 24px; color: #1f2937; background: #f8fafc; }
  h1 { margin: 0 0 8px; font-size: 24px; }
  .summary { display: flex; flex-wrap: wrap; gap: 8px; margin: 16px 0 20px; }
  .card { background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px 12px; min-width: 130px; }
  .card strong { display: block; font-size: 20px; }
  table { width: 100%; border-collapse: collapse; background: white; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
  th, td { padding: 8px 10px; border-bottom: 1px solid #e5e7eb; vertical-align: top; font-size: 13px; }
  th { text-align: left; background: #eef2f7; position: sticky; top: 0; z-index: 1; }
  tr.priority { background: #fff7ed; }
  .muted { color: #6b7280; font-size: 12px; margin-top: 2px; }
  .badge { display: inline-block; border: 1px solid #d1d5db; border-radius: 999px; padding: 1px 7px; font-size: 12px; background: #f9fafb; margin-right: 4px; white-space: nowrap; }
  .badge.hot { border-color: #fb923c; background: #ffedd5; color: #9a3412; }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  a { color: #075985; text-decoration: none; }
  a:hover { text-decoration: underline; }
</style>
</head>
<body>
<h1>Sentry Triage Issue List</h1>
<div class="muted">Generated ${escapeHtml(new Date().toISOString())} from sanitized API snapshots. No local live report or Jenkins data used.</div>
<div class="muted">Sentry evidence: ${escapeHtml(sentryPath)}<br />Jira/Bitbucket evidence: ${escapeHtml(jiraBitbucketPath)}</div>
<div class="summary">
  <div class="card"><strong>${escapeHtml(sentry.unionCount)}</strong><span>Total union issues</span></div>
  <div class="card"><strong>${escapeHtml(sourceACount)}</strong><span>Source A</span></div>
  <div class="card"><strong>${escapeHtml(sourceBCount)}</strong><span>Source B</span></div>
  <div class="card"><strong>${escapeHtml(priorityCount)}</strong><span>Priority rows</span></div>
  <div class="card"><strong>${escapeHtml(regressedCount)}</strong><span>Regressed</span></div>
  <div class="card"><strong>${escapeHtml(bitbucketCount)}</strong><span>Bitbucket PRs</span></div>
</div>
<table>
<thead><tr><th>Flag</th><th>Sentry</th><th>Project</th><th>Title</th><th>Status</th><th>Count</th><th>Assignee</th><th>Source</th><th>Jira match</th></tr></thead>
<tbody>${rowsHtml}</tbody>
</table>
</body>
</html>`;

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, html);

console.log(JSON.stringify({
  out: outPath,
  sentry: sentryPath,
  jiraBitbucket: jiraBitbucketPath,
  unionCount: sentry.unionCount,
  priorityCount,
  regressedCount,
}, null, 2));
