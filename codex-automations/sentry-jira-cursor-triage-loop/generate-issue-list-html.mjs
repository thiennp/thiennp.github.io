#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DEFAULT_OUT = path.join(__dirname, 'artifacts', 'current-sentry-issue-list.html');
const DEFAULT_STATUS_OUT = path.join(__dirname, 'artifacts', 'current-sentry-issue-status.json');
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
  --status-out PATH
      Status sidecar JSON path. Defaults to artifacts/current-sentry-issue-status.json.
  --snapshot-dir DIR
      Directory for fresh snapshot JSON files. Defaults to /tmp/sentry-triage-html-<timestamp>.

The generated HTML is sanitized and contains no tokens.`);
};

const args = process.argv.slice(2);
let fresh = false;
let sentryPath = null;
let jiraBitbucketPath = null;
let outPath = DEFAULT_OUT;
let statusOutPath = DEFAULT_STATUS_OUT;
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
  } else if (arg === '--status-out') {
    statusOutPath = args[++i];
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
const OWN_ASSIGNEE_NAME = 'thien nguyen';

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}[char]));
const encodePrompt = (value) => Buffer.from(String(value), 'utf8').toString('base64');
const scriptJson = (value) => JSON.stringify(value).replace(/</g, '\\u003c');

const badge = (text, className = '') => `<span class="badge ${className}">${escapeHtml(text)}</span>`;
const issueAssignee = (issue) => issue.assignedTo?.name || issue.assignedTo?.email || '';
const issueProject = (issue) => issue.project?.slug || issue.project?.name || issue.project || '';
const repoForProject = (project) => ({
  energymodule: {
    repo: 'energymodule',
    repoPath: '/Users/thien.nguyen/enrg-energymodule',
  },
  'enrg-web-frontend': {
    repo: 'enrg-web-frontend',
    repoPath: '/Users/thien.nguyen/enrg-web-frontend',
  },
  'enrg-energycenter-rev': {
    repo: 'enrg-energycenter-rev',
    repoPath: '/Users/thien.nguyen/enrg-energycenter-rev',
  },
  tarifvergleich: {
    repo: 'tarifvergleich',
    repoPath: '/Users/thien.nguyen/enrg-tarifvergleich',
  },
}[project] || {
  repo: project || 'unknown',
  repoPath: '(unknown - Codex should infer or ask before delegation)',
});
const isAssignedToOtherPerson = (issue) => {
  const assignee = issueAssignee(issue).trim().toLowerCase();
  return assignee !== '' && assignee !== OWN_ASSIGNEE_NAME;
};

const allUnionItems = sentry.unionItems || [];
const filteredOutAssignedToOthers = allUnionItems.filter(isAssignedToOtherPerson);

const rows = allUnionItems.filter((issue) => !isAssignedToOtherPerson(issue)).map((issue) => {
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
const visibleCount = rows.length;
const sourceACount = sentry.sources?.A?.count ?? '';
const sourceBCount = sentry.sources?.B?.count ?? '';
const bitbucketCount = snapshot.bitbucket?.count ?? snapshot.bitbucket?.pullRequests?.length ?? 0;
const composePrompt = (row) => {
  const project = issueProject(row);
  const repo = repoForProject(project);
  const jira = row.jira;
  const lines = [
    'Use this sanitized Sentry/Jira evidence to delegate a bug fix to Cursor. Do not browse unless the API evidence is insufficient. Do not hand-write the bug fix in Codex.',
    '',
    'First, use Claude CLI for local root-cause analysis if available:',
    "claude <<'EOF'",
    'Summarize the likely root cause in 2-4 sentences for a developer fixing this Sentry issue. Use only this sanitized evidence:',
    `Sentry key: ${row.shortId}`,
    `Sentry issue id: ${row.id}`,
    `Sentry URL: ${row.permalink}`,
    `Project: ${project}`,
    `Title: ${row.title}`,
    `Culprit: ${row.culprit || '(not provided)'}`,
    `Status: ${row.status} / ${row.substatus}`,
    `Event count: ${row.count}`,
    `Assignee: ${issueAssignee(row) || 'unassigned'}`,
    `Sources: ${(row.sourceKeys || []).join(',') || '(none)'}`,
    `Jira key: ${jira?.key || '(none mounted in assigned snapshot)'}`,
    `Jira status: ${jira?.status || '(unknown)'}`,
    `Jira URL: ${jira?.browseUrl || '(none)'}`,
    'EOF',
    '',
    'Then give Codex this request:',
    '',
    `Please create/update a Cursor /agent-fix-bug handoff and delegate it through the safe wrapper for ${row.shortId}.`,
    `Sentry issue id: ${row.id}`,
    `Sentry URL: ${row.permalink}`,
    `Sentry title: ${row.title}`,
    `Sentry status: ${row.status} / ${row.substatus}`,
    `Repo: ${repo.repo}`,
    `Repo path: ${repo.repoPath}`,
    `Jira: ${jira?.key || '(create or verify Jira mount first)'} ${jira?.browseUrl || ''}`.trim(),
    'Requirements:',
    '- Use API-first verification and duplicate/idempotency checks.',
    '- If no matching Jira exists, create/link via the verified Sentry Jira helper only after dry-run and confirmation gates.',
    '- If Jira is Done/Closed while Sentry is unresolved/regressed, reopen to In Progress before Cursor delegation.',
    '- Cursor owns bug-code changes. Codex must not hand-roll the fix.',
    '- Use cursor-agent --model auto through safe-delegate-cli / triage-api-actions.sh delegate-cursor.',
    '- After Cursor returns, inspect .pipeline artifacts and run lightweight verification.',
  ];
  return lines.join('\n');
};

const composeClaudePrompt = (row) => {
  const project = issueProject(row);
  const jira = row.jira;
  return [
    'Summarize the likely root cause in 2-4 sentences for a developer fixing this Sentry issue.',
    'Use only this sanitized evidence. Do not browse. Do not use credentials.',
    '',
    `Sentry key: ${row.shortId}`,
    `Sentry issue id: ${row.id}`,
    `Sentry URL: ${row.permalink}`,
    `Project: ${project}`,
    `Title: ${row.title}`,
    `Culprit: ${row.culprit || '(not provided)'}`,
    `Status: ${row.status} / ${row.substatus}`,
    `Event count: ${row.count}`,
    `Assignee: ${issueAssignee(row) || 'unassigned'}`,
    `Sources: ${(row.sourceKeys || []).join(',') || '(none)'}`,
    `Jira key: ${jira?.key || '(none mounted in assigned snapshot)'}`,
    `Jira status: ${jira?.status || '(unknown)'}`,
    `Jira URL: ${jira?.browseUrl || '(none)'}`,
  ].join('\n');
};

const rowsHtml = rows.map((row) => {
  const source = (row.sourceKeys || []).join(',');
  const assignee = issueAssignee(row) || 'unassigned';
  const project = issueProject(row);
  const jira = row.jira;
  const prompt = composePrompt(row);
  const claudePrompt = composeClaudePrompt(row);
  return `<tr class="${row.isPriority ? 'priority' : ''}" data-issue-id="${escapeHtml(row.id)}">
    <td>${row.isPriority ? badge('priority', 'hot') : ''}</td>
    <td><a href="${escapeHtml(row.permalink)}">${escapeHtml(row.shortId)}</a><div class="muted">${escapeHtml(row.id)}</div></td>
    <td>${escapeHtml(project)}</td>
    <td>${escapeHtml(row.title)}</td>
    <td>${badge(row.status)} ${badge(row.substatus, row.substatus === 'regressed' ? 'hot' : '')}</td>
    <td class="num">${escapeHtml(row.count)}</td>
    <td>${escapeHtml(assignee)}</td>
    <td>${escapeHtml(source)}</td>
    <td>${jira ? `<a href="${escapeHtml(jira.browseUrl)}">${escapeHtml(jira.key)}</a><div class="muted">${escapeHtml(jira.status)} / ${escapeHtml(jira.assignee?.displayName || '')}</div>` : '<span class="muted">none in assigned snapshot</span>'}</td>
    <td>
      <div class="status-cell">
        <span class="row-status status-not-started">not started</span>
        <div class="status-actions">
          <button type="button" class="status-button" data-status="selected">Select</button>
          <button type="button" class="status-button" data-status="working">Working</button>
          <button type="button" class="status-button" data-status="blocked">Blocked</button>
          <button type="button" class="status-button" data-status="done">Done</button>
        </div>
        <input class="status-message" type="text" placeholder="Optional status note" />
        <div class="muted row-note"></div>
      </div>
    </td>
    <td>
      <button type="button" class="ask-claude" data-prompt-base64="${encodePrompt(claudePrompt)}">Ask Claude</button>
      <button type="button" class="copy-prompt" data-prompt-base64="${encodePrompt(prompt)}">Copy prompt</button>
      <div class="muted claude-result"></div>
    </td>
  </tr>`;
}).join('\n');

const statusSeed = {
  generatedAt: new Date().toISOString(),
  sourceHtml: path.basename(outPath),
  issues: Object.fromEntries(rows.map((row) => [row.id, {
    id: row.id,
    shortId: row.shortId,
    status: 'not-started',
    updatedAt: null,
    message: '',
  }])),
};
if (fs.existsSync(statusOutPath)) {
  try {
    const existing = JSON.parse(fs.readFileSync(statusOutPath, 'utf8'));
    statusSeed.issues = Object.fromEntries(rows.map((row) => {
      const old = existing.issues?.[row.id] || {};
      return [row.id, {
        id: row.id,
        shortId: row.shortId,
        status: old.status || 'not-started',
        updatedAt: old.updatedAt || null,
        message: old.message || '',
      }];
    }));
    statusSeed.previousGeneratedAt = existing.generatedAt || existing.previousGeneratedAt || null;
    statusSeed.lastUpdated = existing.lastUpdated || existing.generatedAt || null;
  } catch {
    statusSeed.recoveredFromInvalidStatusFileAt = new Date().toISOString();
  }
}
const appData = {
  statusFile: path.basename(statusOutPath),
  issues: rows.map((row) => ({
    id: row.id,
    shortId: row.shortId,
    title: row.title,
    permalink: row.permalink,
    isPriority: row.isPriority,
    substatus: row.substatus,
  })),
};

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Sentry Triage Issue List</title>
<style>
  :root { --line: #dbe3ef; --bg: #f5f7fb; --panel: #ffffff; --text: #172033; --muted: #64748b; --accent: #075985; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 0; color: var(--text); background: var(--bg); }
  .app-shell { display: grid; grid-template-columns: minmax(260px, 320px) minmax(0, 1fr); min-height: 100vh; }
  aside { background: #0f172a; color: #e2e8f0; padding: 22px; position: sticky; top: 0; height: 100vh; overflow: auto; }
  main { padding: 22px; overflow: auto; }
  h1 { margin: 0 0 8px; font-size: 24px; }
  aside h1 { color: #ffffff; }
  .active-panel { margin-top: 18px; padding: 14px; border: 1px solid #334155; border-radius: 8px; background: #111c33; }
  .active-panel strong { display: block; color: #ffffff; margin-bottom: 6px; }
  .toolbar { display: flex; flex-wrap: wrap; gap: 8px; margin: 16px 0; align-items: center; }
  .toolbar input, .toolbar select { border: 1px solid var(--line); border-radius: 7px; padding: 8px 10px; min-height: 36px; background: white; }
  .toolbar input { min-width: 260px; flex: 1; }
  .summary { display: flex; flex-wrap: wrap; gap: 8px; margin: 16px 0 20px; }
  .card { background: white; border: 1px solid var(--line); border-radius: 8px; padding: 10px 12px; min-width: 130px; }
  .card strong { display: block; font-size: 20px; }
  .table-wrap { border: 1px solid var(--line); border-radius: 8px; overflow: auto; background: white; }
  table { width: 100%; border-collapse: collapse; min-width: 1180px; }
  th, td { padding: 8px 10px; border-bottom: 1px solid var(--line); vertical-align: top; font-size: 13px; }
  th { text-align: left; background: #eef2f7; position: sticky; top: 0; z-index: 1; }
  tr.priority { background: #fff7ed; }
  tr.is-active { outline: 2px solid #0ea5e9; outline-offset: -2px; }
  .muted { color: var(--muted); font-size: 12px; margin-top: 2px; }
  .badge { display: inline-block; border: 1px solid #d1d5db; border-radius: 999px; padding: 1px 7px; font-size: 12px; background: #f9fafb; margin-right: 4px; white-space: nowrap; }
  .badge.hot { border-color: #fb923c; background: #ffedd5; color: #9a3412; }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  button { border: 1px solid #94a3b8; background: #ffffff; border-radius: 6px; padding: 5px 8px; cursor: pointer; white-space: nowrap; }
  button:hover { background: #f1f5f9; }
  button.copied { border-color: #16a34a; color: #166534; background: #dcfce7; }
  .status-cell { min-width: 220px; }
  .status-actions { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }
  .status-message { width: 100%; border: 1px solid var(--line); border-radius: 6px; padding: 5px 7px; margin-top: 6px; font-size: 12px; }
  .row-status { display: inline-block; border-radius: 999px; padding: 2px 8px; font-size: 12px; border: 1px solid #cbd5e1; background: #f8fafc; }
  .status-selected { border-color: #38bdf8; background: #e0f2fe; color: #075985; }
  .status-working { border-color: #f59e0b; background: #fef3c7; color: #92400e; }
  .status-blocked { border-color: #ef4444; background: #fee2e2; color: #991b1b; }
  .status-done { border-color: #22c55e; background: #dcfce7; color: #166534; }
  .server-state { color: #bae6fd; font-size: 12px; margin-top: 8px; }
  a { color: var(--accent); text-decoration: none; }
  a:hover { text-decoration: underline; }
  @media (max-width: 900px) {
    .app-shell { grid-template-columns: 1fr; }
    aside { position: static; height: auto; }
    main { padding: 14px; }
  }
</style>
</head>
<body>
<div class="app-shell">
<aside>
<h1>Sentry Triage Issue List</h1>
<div class="muted">Generated ${escapeHtml(new Date().toISOString())} from sanitized API snapshots. No local live report or Jenkins data used.</div>
<div class="muted">Filter: showing unassigned issues and issues assigned to Thien Nguyen. Hidden issues assigned to other people: ${escapeHtml(filteredOutAssignedToOthers.length)}.</div>
<div class="muted">Sentry evidence: ${escapeHtml(sentryPath)}<br />Jira/Bitbucket evidence: ${escapeHtml(jiraBitbucketPath)}</div>
<div class="active-panel">
  <strong>Current Codex Work</strong>
  <div id="activeIssue">No active issue marked yet.</div>
  <div id="activeMessage" class="muted"></div>
  <div id="serverState" class="server-state">Status source: loading</div>
</div>
<div class="summary">
  <div class="card"><strong>${escapeHtml(sentry.unionCount)}</strong><span>Total union issues</span></div>
  <div class="card"><strong>${escapeHtml(visibleCount)}</strong><span>Visible after filter</span></div>
  <div class="card"><strong>${escapeHtml(sourceACount)}</strong><span>Source A</span></div>
  <div class="card"><strong>${escapeHtml(sourceBCount)}</strong><span>Source B</span></div>
  <div class="card"><strong>${escapeHtml(priorityCount)}</strong><span>Priority rows</span></div>
  <div class="card"><strong>${escapeHtml(regressedCount)}</strong><span>Regressed</span></div>
  <div class="card"><strong>${escapeHtml(bitbucketCount)}</strong><span>Bitbucket PRs</span></div>
</div>
</aside>
<main>
<div class="toolbar">
  <input id="searchBox" type="search" placeholder="Filter by Sentry key, title, project, Jira, or assignee" />
  <select id="statusFilter">
    <option value="">All local statuses</option>
    <option value="not-started">Not started</option>
    <option value="selected">Selected</option>
    <option value="working">Working</option>
    <option value="blocked">Blocked</option>
    <option value="done">Done</option>
  </select>
  <button type="button" id="reloadStatus">Reload status</button>
</div>
<div class="table-wrap">
<table>
<thead><tr><th>Flag</th><th>Sentry</th><th>Project</th><th>Title</th><th>Status</th><th>Count</th><th>Assignee</th><th>Source</th><th>Jira match</th><th>Local status</th><th>Prompt</th></tr></thead>
<tbody>${rowsHtml}</tbody>
</table>
</div>
</main>
</div>
<script>
const APP_DATA = ${scriptJson(appData)};
const LOCAL_STORAGE_KEY = 'sentry-triage-issue-status';
let issueStatus = { issues: {} };
let remoteFailureCount = 0;
let remotePollingPaused = false;

const decodePrompt = (value) => {
  const binary = atob(value);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
};

const statusLabel = (status) => ({
  'not-started': 'not started',
  selected: 'selected',
  working: 'working',
  blocked: 'blocked',
  done: 'done',
}[status] || status || 'not started');

const normalizeStatus = (value) => ['selected', 'working', 'blocked', 'done'].includes(value) ? value : 'not-started';
const formatTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

const saveLocalStatus = () => {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(issueStatus));
};

const loadLocalStatus = () => {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{"issues":{}}');
  } catch {
    return { issues: {} };
  }
};

const mergeStatus = (remote, local) => {
  const merged = { issues: {} };
  for (const issue of APP_DATA.issues) {
    const base = {
      id: issue.id,
      shortId: issue.shortId,
      status: 'not-started',
      updatedAt: null,
      message: '',
    };
    const remoteIssue = remote?.issues?.[issue.id] || {};
    const localIssue = local?.issues?.[issue.id] || {};
    const remoteTime = remoteIssue.updatedAt ? Date.parse(remoteIssue.updatedAt) : 0;
    const localTime = localIssue.updatedAt ? Date.parse(localIssue.updatedAt) : 0;
    merged.issues[issue.id] = {
      ...base,
      ...(remoteTime >= localTime ? localIssue : remoteIssue),
      ...(remoteTime >= localTime ? remoteIssue : localIssue),
    };
    merged.issues[issue.id].status = normalizeStatus(merged.issues[issue.id].status);
  }
  return merged;
};

const fetchRemoteStatus = async () => {
  const response = await fetch('/api/status', { cache: 'no-store' });
  if (!response.ok) throw new Error('No local status API');
  return response.json();
};

const renderStatus = () => {
  const active = [];
  for (const row of document.querySelectorAll('tr[data-issue-id]')) {
    const issueId = row.dataset.issueId;
    const status = issueStatus.issues[issueId] || {};
    const normalized = normalizeStatus(status.status);
    const label = row.querySelector('.row-status');
    const note = row.querySelector('.row-note');
    const messageInput = row.querySelector('.status-message');
    const claudeResult = row.querySelector('.claude-result');
    row.classList.toggle('is-active', normalized === 'working' || normalized === 'selected');
    label.className = 'row-status status-' + normalized;
    label.textContent = statusLabel(normalized);
    note.textContent = status.updatedAt ? 'Updated ' + formatTime(status.updatedAt) + (status.message ? ' - ' + status.message : '') : (status.message || '');
    if (document.activeElement !== messageInput && messageInput.value !== (status.message || '')) {
      messageInput.value = status.message || '';
    }
    if (status.claude?.status) {
      const summary = status.claude.output || status.claude.error || '';
      claudeResult.textContent = 'Claude ' + status.claude.status + (summary ? ': ' + summary.slice(0, 240) : '');
      claudeResult.title = summary;
    } else {
      claudeResult.textContent = '';
      claudeResult.removeAttribute('title');
    }
    if (normalized === 'working' || normalized === 'selected' || normalized === 'blocked') {
      const issue = APP_DATA.issues.find((entry) => entry.id === issueId);
      active.push({ issue, status: normalized, message: status.message, updatedAt: status.updatedAt });
    }
  }
  const primary = active.find((entry) => entry.status === 'working') || active[0];
  const activeIssue = document.getElementById('activeIssue');
  activeIssue.replaceChildren();
  if (primary) {
    const link = document.createElement('a');
    link.href = primary.issue.permalink;
    link.textContent = primary.issue.shortId;
    const title = document.createElement('div');
    title.textContent = primary.issue.title;
    const meta = document.createElement('div');
    meta.className = 'muted';
    meta.textContent = statusLabel(primary.status) + (primary.updatedAt ? ' - ' + formatTime(primary.updatedAt) : '');
    activeIssue.append(link, title, meta);
  } else {
    activeIssue.textContent = 'No active issue marked yet.';
  }
  document.getElementById('activeMessage').textContent = primary?.message || '';
  applyFilters();
};

const setIssueStatus = async (issueId, status, message = '') => {
  const entry = {
    ...(issueStatus.issues[issueId] || {}),
    id: issueId,
    status: normalizeStatus(status),
    message,
    updatedAt: new Date().toISOString(),
  };
  issueStatus.issues[issueId] = entry;
  saveLocalStatus();
  renderStatus();
  try {
    const response = await fetch('/api/status', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(entry),
    });
    if (response.ok) {
      remoteFailureCount = 0;
      remotePollingPaused = false;
      issueStatus = mergeStatus(await response.json(), loadLocalStatus());
      document.getElementById('serverState').textContent = 'Status source: local API + browser cache';
      renderStatus();
      return;
    }
    throw new Error('POST failed');
  } catch {
    remoteFailureCount += 1;
    document.getElementById('serverState').textContent = 'Status source: browser cache only. Start issue-list-status-server.mjs for Codex API updates.';
  }
};

const askClaude = async (row, prompt) => {
  const issueId = row.dataset.issueId;
  const button = row.querySelector('button.ask-claude');
  const result = row.querySelector('.claude-result');
  const original = button.textContent;
  button.disabled = true;
  button.textContent = 'Claude running...';
  result.textContent = 'Running Claude analysis through local safe wrapper.';
  await setIssueStatus(issueId, 'working', 'Running Claude analysis');
  try {
    const response = await fetch('/api/claude', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ issueId, prompt }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Claude request failed');
    issueStatus = mergeStatus(data.status, loadLocalStatus());
    saveLocalStatus();
    renderStatus();
  } catch (error) {
    result.textContent = 'Claude unavailable: ' + error.message;
    await setIssueStatus(issueId, 'blocked', 'Claude unavailable: ' + error.message);
  } finally {
    button.disabled = false;
    button.textContent = original;
  }
};

const loadStatus = async () => {
  const local = loadLocalStatus();
  if (!remotePollingPaused) {
    try {
      const remote = await fetchRemoteStatus();
      remoteFailureCount = 0;
      issueStatus = mergeStatus(remote, local);
      document.getElementById('serverState').textContent = 'Status source: local API + browser cache';
    } catch {
      remoteFailureCount += 1;
      remotePollingPaused = remoteFailureCount >= 3;
      try {
        const sidecar = await fetch(APP_DATA.statusFile, { cache: 'no-store' }).then((response) => response.ok ? response.json() : null);
        issueStatus = mergeStatus(sidecar, local);
        document.getElementById('serverState').textContent = remotePollingPaused
          ? 'Status source: sidecar JSON + browser cache. Local API unreachable; polling paused.'
          : 'Status source: sidecar JSON + browser cache';
      } catch {
        issueStatus = mergeStatus(null, local);
        document.getElementById('serverState').textContent = remotePollingPaused
          ? 'Status source: browser cache only. Local API unreachable; polling paused.'
          : 'Status source: browser cache only';
      }
    }
  } else {
    issueStatus = mergeStatus(null, local);
  }
  saveLocalStatus();
  renderStatus();
};

const applyFilters = () => {
  const query = document.getElementById('searchBox').value.trim().toLowerCase();
  const statusFilter = document.getElementById('statusFilter').value;
  for (const row of document.querySelectorAll('tr[data-issue-id]')) {
    const status = normalizeStatus(issueStatus.issues[row.dataset.issueId]?.status);
    const text = row.textContent.toLowerCase();
    const visible = (!query || text.includes(query)) && (!statusFilter || status === statusFilter);
    row.style.display = visible ? '' : 'none';
  }
};

document.addEventListener('click', async (event) => {
  const claudeButton = event.target.closest('button.ask-claude');
  if (claudeButton) {
    const row = claudeButton.closest('tr[data-issue-id]');
    await askClaude(row, decodePrompt(claudeButton.dataset.promptBase64 || ''));
    return;
  }

  const statusButton = event.target.closest('button.status-button');
  if (statusButton) {
    const row = statusButton.closest('tr[data-issue-id]');
    const message = row.querySelector('.status-message').value.trim();
    await setIssueStatus(row.dataset.issueId, statusButton.dataset.status, message);
    return;
  }

  const button = event.target.closest('button.copy-prompt');
  if (!button) return;
  const prompt = decodePrompt(button.dataset.promptBase64 || '');
  const original = button.textContent;
  try {
    await navigator.clipboard.writeText(prompt);
    button.textContent = 'Copied';
    button.classList.add('copied');
  } catch (error) {
    const area = document.createElement('textarea');
    area.value = prompt;
    area.style.position = 'fixed';
    area.style.left = '-9999px';
    document.body.appendChild(area);
    area.focus();
    area.select();
    document.execCommand('copy');
    area.remove();
    button.textContent = 'Copied';
    button.classList.add('copied');
  }
  window.setTimeout(() => {
    button.textContent = original;
    button.classList.remove('copied');
  }, 1600);
});

document.getElementById('searchBox').addEventListener('input', applyFilters);
document.getElementById('statusFilter').addEventListener('change', applyFilters);
document.getElementById('reloadStatus').addEventListener('click', () => {
  remoteFailureCount = 0;
  remotePollingPaused = false;
  loadStatus();
});
window.setInterval(loadStatus, 10000);
loadStatus();
</script>
</body>
</html>`;

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, html);
fs.mkdirSync(path.dirname(statusOutPath), { recursive: true });
fs.writeFileSync(statusOutPath, JSON.stringify(statusSeed, null, 2));

console.log(JSON.stringify({
  out: outPath,
  statusOut: statusOutPath,
  sentry: sentryPath,
  jiraBitbucket: jiraBitbucketPath,
  unionCount: sentry.unionCount,
  visibleCount,
  filteredOutAssignedToOthers: filteredOutAssignedToOthers.length,
  priorityCount,
  regressedCount,
}, null, 2));
