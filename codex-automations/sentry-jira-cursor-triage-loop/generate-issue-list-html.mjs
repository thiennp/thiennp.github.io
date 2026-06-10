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
const pullRequests = snapshot.bitbucket?.pullRequests || [];
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
const isOwnAssignee = (value) => String(value || '').trim().toLowerCase() === OWN_ASSIGNEE_NAME;
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
const prSearchText = (pr) => [
  pr.title,
  pr.source?.branch,
  pr.source?.repository,
  pr.destination?.branch,
].filter(Boolean).join(' ').toLowerCase();
const matchingPrsForRow = (issue, jira) => {
  const exactTerms = [
    issue.shortId,
    issue.id,
    jira?.key,
  ].filter(Boolean).map((value) => String(value).toLowerCase());
  if (exactTerms.length === 0) return [];
  return pullRequests.filter((pr) => exactTerms.some((term) => prSearchText(pr).includes(term)));
};

const allUnionItems = sentry.unionItems || [];
const filteredOutAssignedToOthers = allUnionItems.filter(isAssignedToOtherPerson);

const rows = allUnionItems.filter((issue) => !isAssignedToOtherPerson(issue)).map((issue) => {
  const jira = jiraBySummary.get(String(issue.title || '').trim());
  const prs = matchingPrsForRow(issue, jira);
  const isPriority =
    priorityIds.has(issue.id) ||
    issue.substatus === 'regressed' ||
    (issue.sourceKeys || []).includes('B');
  return { ...issue, jira, prs, isPriority };
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
  const safeShortId = String(row.shortId || row.id).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const worktreeName = `sentry-${safeShortId}-${row.id}`;
  const worktreePath = `${repo.repoPath}/../worktrees/${repo.repo}-${worktreeName}`;
  const branchName = `codex/${repo.repo}-${worktreeName}`;
  const lines = [
    'Use this sanitized Sentry/Jira evidence to delegate a bug fix to Cursor. Do not browse unless the API evidence is insufficient. Do not hand-write the bug fix in Codex.',
    '',
    'First, use Claude CLI for local codebase reasoning if available:',
    "claude <<'EOF'",
    'You are doing local-only bug triage before Cursor changes code. Read the mapped repository files relevant to this Sentry issue, then produce a concise advisory for Codex and Cursor.',
    'You are being started from the mapped repository with explicit read-only file tools. Do not claim missing filesystem permission unless the read tools actually fail.',
    'Do not browse. Do not use credentials. Use only this sanitized issue evidence plus local repository files.',
    'If you cannot read the repository, do not stop at a generic permission warning. Return repoReadStatus=unavailable, give the best Sentry-only hypothesis, and list exact files/search terms Codex should inspect before Cursor implementation.',
    'Do not stop at "known noise", browser extension, crawler, iOS WebView, or Chrome Mobile iOS unless you can cite concrete evidence from this issue payload. If you think it is external noise, still return recommendation=codex_validate_noise and list the exact evidence Codex must verify before skipping.',
    'Do not mark the issue solved. Claude is advisory only; Cursor/Codex must validate before any skip, Jira action, or fix delegation.',
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
    `Repo: ${repo.repo}`,
    `Repo path: ${repo.repoPath}`,
    '',
    'Return:',
    '1. recommendation=delegate_to_cursor|codex_validate_noise|needs_more_evidence|skip_with_evidence',
    '2. likely root cause',
    '3. repository files/functions that should be inspected or changed',
    '4. confidence and missing evidence',
    '5. suggested Cursor implementation strategy or exact Codex validation steps',
    '6. repoReadStatus=read|unavailable and concrete fallback next step',
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
    `Required worktree path: ${worktreePath}`,
    `Required branch name: ${branchName}`,
    `Jira: ${jira?.key || '(create or verify Jira mount first)'} ${jira?.browseUrl || ''}`.trim(),
    'Requirements:',
    '- Use API-first verification and duplicate/idempotency checks.',
    '- If no matching Jira exists, create/link via the verified Sentry Jira helper only after dry-run and confirmation gates.',
    '- If Jira is Done/Closed while Sentry is unresolved/regressed, reopen to In Progress before Cursor delegation.',
    `- Before Cursor changes code, create or reuse a dedicated git worktree for this exact issue at ${worktreePath} on branch ${branchName}. Do not work directly in ${repo.repoPath}.`,
    '- The worktree base must be freshly resolved: fetch origin, prefer origin/release when it exists, else origin/main, else origin/master. Create the issue branch from that refreshed base. Do not fix from a stale branch.',
    '- Multiple issues in the same repo must use separate worktrees and branches, one per Sentry issue id, so they can run in parallel without clobbering each other.',
    '- Run Claude and Cursor from the issue worktree once it exists. Pass only sanitized evidence and local repo paths; do not pass tokens or ~/.env.',
    '- Ask Claude to reason over the local codebase first. Codex must compare Claude reasoning with the Cursor plan before allowing implementation.',
    '- Ask Cursor to first explain whether it agrees with Claude/Codex root-cause reasoning. If Cursor disagrees, Codex should have Claude and Cursor compare evidence until there is a single accepted plan, or record a clear fallback decision.',
    '- If Claude reaches a limit, errors, or returns unusable output, Cursor may proceed using Codex-reviewed API/local evidence. Record that Claude was unavailable.',
    '- If Claude cannot read the repository but returns Sentry-only analysis, Codex must inspect the local repo directly using the suggested files/search terms, then ask Cursor for plan agreement before implementation.',
    '- If Cursor reaches a limit, errors, or cannot accept the task, Claude/Codex may decide the next investigation step, but Codex must not hand-roll bug-code changes.',
    '- If both Claude and Cursor fail, stop with a blocker and the exact failing tool/output summary.',
    '- Cursor owns bug-code changes. Codex must not hand-roll the fix.',
    '- Use cursor-agent --model auto through safe-delegate-cli / triage-api-actions.sh delegate-cursor.',
    '- After Cursor returns, inspect .pipeline artifacts and run lightweight verification.',
  ];
  return lines.join('\n');
};

const composeClaudePrompt = (row) => {
  const project = issueProject(row);
  const repo = repoForProject(project);
  const jira = row.jira;
  return [
    'You are doing local-only bug triage before Cursor changes code.',
    'Read the mapped repository files relevant to this Sentry issue if the repo path exists. Do not browse. Do not use credentials.',
    'You are being started from the mapped repository with explicit read-only file tools. Do not claim missing filesystem permission unless the read tools actually fail.',
    'Use only this sanitized evidence plus local repository files.',
    'If you cannot read the repository, do not stop at a generic permission warning. Return repoReadStatus=unavailable, give the best Sentry-only hypothesis, and list exact files/search terms Codex should inspect before Cursor implementation.',
    'Do not stop at "known noise", browser extension, crawler, iOS WebView, or Chrome Mobile iOS unless you can cite concrete evidence from this issue payload. If you think it is external noise, still return recommendation=codex_validate_noise and list the exact evidence Codex must verify before skipping.',
    'Do not mark the issue solved. Claude is advisory only; Cursor/Codex must validate before any skip, Jira action, or fix delegation.',
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
    `Repo: ${repo.repo}`,
    `Repo path: ${repo.repoPath}`,
    '',
    'Return:',
    '1. recommendation=delegate_to_cursor|codex_validate_noise|needs_more_evidence|skip_with_evidence',
    '2. likely root cause',
    '3. repository files/functions that should be inspected or changed',
    '4. whether Cursor should proceed and what plan it should follow',
    '5. confidence and missing evidence',
    '6. repoReadStatus=read|unavailable and concrete fallback next step',
  ].join('\n');
};

const actions = [
  ['jira-status-change', 'JIRA Ticket status change', 'Verify Jira status and Sentry state, then transition the mounted Jira ticket only when the workflow rules allow it.'],
];

const rowActionButtons = (row) => {
  const parts = [];
  if (!isOwnAssignee(issueAssignee(row))) {
    parts.push('<button type="button" class="action-button" data-action="assign-to-me" title="Verify source scope, then assign this Sentry issue to Thien Nguyen using the safe Sentry helper or Chrome only if API assignment is unavailable.">Assign to me</button>');
  }
  if (!row.jira) {
    parts.push('<button type="button" class="action-button" data-action="create-jira" title="Run duplicate and idempotency checks, dry-run Sentry Jira create/link, then create/link Jira only through the verified helper with required confirmation flags.">Create JIRA</button>');
  } else if (row.jira.browseUrl) {
    parts.push(`<a class="action-button" href="${escapeHtml(row.jira.browseUrl)}" target="_blank" rel="noreferrer" title="Open matched Jira ticket ${escapeHtml(row.jira.key || '')} directly">View JIRA</a>`);
    parts.push('<button type="button" class="action-button warning-action" data-action="unlink-jira" title="Request Codex to verify the mounted Jira is outdated, then unlink only the Sentry-to-Jira mount through the verified safe path.">Unlink outdated JIRA</button>');
  }
  parts.push('<button type="button" class="action-button" data-action="link-existing-jira" title="Enter an existing Jira key. Codex will verify it describes this Sentry issue before linking it through the safe helper.">Link existing JIRA</button>');
  const pr = (row.prs || [])[0];
  if (pr?.links?.html) {
    parts.push(`<a class="action-button" href="${escapeHtml(pr.links.html)}" target="_blank" rel="noreferrer" title="Open matched Bitbucket PR #${escapeHtml(pr.id)} directly">Review PR</a>`);
  } else {
    parts.push('<button type="button" class="action-button" data-action="review-pr" title="Find the Thien-authored Bitbucket PR for this issue, verify exact PR state, review comments/Sonar if needed, then decide whether Codex PR follow-up or Cursor delegation is required.">Review PR</button>');
  }
  parts.push(...actions.map(([action, label, description]) =>
    `<button type="button" class="action-button" data-action="${escapeHtml(action)}" title="${escapeHtml(description)}">${escapeHtml(label)}</button>`
  ));
  return parts.join('');
};

const renderExistingWork = (row) => {
  const jira = row.jira;
  const prs = row.prs || [];
  if (!jira && prs.length === 0) return '<span class="muted">none found in API snapshots</span>';
  const parts = [];
  if (jira) {
    parts.push(`<div><strong>Jira</strong> <a href="${escapeHtml(jira.browseUrl)}">${escapeHtml(jira.key)}</a><div class="muted">${escapeHtml(jira.status)} / ${escapeHtml(jira.assignee?.displayName || 'unassigned')}</div></div>`);
  }
  if (prs.length > 0) {
    parts.push(...prs.map((pr) => `<div><strong>PR</strong> <a href="${escapeHtml(pr.links?.html || '#')}">#${escapeHtml(pr.id)}</a> ${badge(pr.state || 'unknown')}<div class="muted">${escapeHtml(pr.title || '')}</div></div>`));
  }
  return parts.join('');
};

const rowsHtml = rows.map((row) => {
  const source = (row.sourceKeys || []).join(',');
  const assignee = issueAssignee(row) || 'unassigned';
  const project = issueProject(row);
  const jira = row.jira;
  const handoffPrompt = composePrompt(row);
  const claudePrompt = composeClaudePrompt(row);
  return `<tr class="issue-row ${row.isPriority ? 'priority' : ''}" data-issue-id="${escapeHtml(row.id)}">
    <td>${row.isPriority ? badge('priority', 'hot') : ''}</td>
    <td><a href="${escapeHtml(row.permalink)}">${escapeHtml(row.shortId)}</a><div class="muted">${escapeHtml(row.id)}</div></td>
    <td>${escapeHtml(project)}</td>
    <td>${escapeHtml(row.title)}</td>
    <td>${badge(row.status)} ${badge(row.substatus, row.substatus === 'regressed' ? 'hot' : '')}</td>
    <td class="num">${escapeHtml(row.count)}</td>
    <td>${escapeHtml(assignee)}</td>
    <td>${escapeHtml(source)}</td>
    <td>${renderExistingWork(row)}</td>
    <td>
      <div class="action-strip">${rowActionButtons(row)}</div>
    </td>
  </tr>
  <tr class="issue-detail-row ${row.isPriority ? 'priority' : ''}" data-issue-id="${escapeHtml(row.id)}">
    <td colspan="10">
      <div class="workflow-panel">
        <div class="workflow-primary">
          <button type="button" class="ask-claude primary-action" data-prompt-base64="${encodePrompt(claudePrompt)}">Fix it</button>
          <button type="button" class="copy-prompt" data-prompt-base64="${encodePrompt(handoffPrompt)}">Copy prompt</button>
          <div class="muted claude-result"></div>
          <div class="muted requested-action"></div>
          <pre class="terminal-output" aria-label="Live terminal output"></pre>
        </div>
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
        <div class="muted run-log"></div>
        <details class="timeline-details">
          <summary>Action history</summary>
          <ol class="action-timeline"></ol>
        </details>
      </div>
      </div>
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
    requestedAction: '',
    requestedJiraKey: '',
    timeline: [],
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
        requestedAction: old.requestedAction || '',
        requestedJiraKey: old.requestedJiraKey || '',
        timeline: Array.isArray(old.timeline) ? old.timeline : [],
        runLogPath: old.runLogPath || '',
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
  .issue-detail-row td { padding-top: 0; background: #f8fafc; }
  .issue-detail-row.priority td { background: #fff7ed; }
  .muted { color: var(--muted); font-size: 12px; margin-top: 2px; }
  .badge { display: inline-block; border: 1px solid #d1d5db; border-radius: 999px; padding: 1px 7px; font-size: 12px; background: #f9fafb; margin-right: 4px; white-space: nowrap; }
  .badge.hot { border-color: #fb923c; background: #ffedd5; color: #9a3412; }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  button { border: 1px solid #94a3b8; background: #ffffff; border-radius: 6px; padding: 5px 8px; cursor: pointer; white-space: nowrap; }
  button:hover { background: #f1f5f9; }
  button.copied { border-color: #16a34a; color: #166534; background: #dcfce7; }
  .workflow-panel { display: grid; grid-template-columns: minmax(220px, 300px) minmax(0, 1fr); gap: 14px; border: 1px solid #dbeafe; border-radius: 8px; background: #ffffff; padding: 10px; }
  .workflow-primary { display: flex; flex-direction: column; align-items: flex-start; gap: 6px; min-width: 0; }
  .primary-action { border-color: #0284c7; background: #0284c7; color: #ffffff; font-weight: 600; }
  .primary-action:hover { background: #0369a1; }
  .terminal-output { width: 100%; max-height: 300px; overflow: auto; margin: 4px 0 0; padding: 10px; border-radius: 7px; background: #0f172a; color: #dbeafe; font: 12px/1.45 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; white-space: pre-wrap; }
  .terminal-output:empty { display: none; }
  .status-cell { min-width: 220px; }
  .status-actions { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }
  .action-strip { display: flex; flex-wrap: wrap; gap: 4px; min-width: 250px; }
  .action-button { border-color: #7dd3fc; color: #075985; background: #f0f9ff; text-decoration: none; display: inline-block; }
  .action-button:hover { background: #e0f2fe; }
  .status-message { width: 100%; border: 1px solid var(--line); border-radius: 6px; padding: 5px 7px; margin-top: 6px; font-size: 12px; }
  .row-status { display: inline-block; border-radius: 999px; padding: 2px 8px; font-size: 12px; border: 1px solid #cbd5e1; background: #f8fafc; }
  .status-selected { border-color: #38bdf8; background: #e0f2fe; color: #075985; }
  .status-working { border-color: #f59e0b; background: #fef3c7; color: #92400e; }
  .status-blocked { border-color: #ef4444; background: #fee2e2; color: #991b1b; }
  .status-done { border-color: #22c55e; background: #dcfce7; color: #166534; }
  .timeline-details { margin-top: 8px; }
  .timeline-details summary { color: #475569; cursor: pointer; font-size: 12px; }
  .action-timeline { margin: 6px 0 0; padding-left: 18px; max-height: 180px; overflow: auto; }
  .action-timeline li { margin: 0 0 7px; padding-left: 2px; color: #334155; }
  .timeline-title { display: block; font-size: 12px; font-weight: 600; }
  .timeline-meta { display: block; color: var(--muted); font-size: 11px; }
  .timeline-message { display: block; color: #475569; font-size: 12px; }
  .server-state { color: #bae6fd; font-size: 12px; margin-top: 8px; }
  a { color: var(--accent); text-decoration: none; }
  a:hover { text-decoration: underline; }
  @media (max-width: 900px) {
    .app-shell { grid-template-columns: 1fr; }
    aside { position: static; height: auto; }
    main { padding: 14px; }
    .workflow-panel { grid-template-columns: 1fr; }
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
<thead><tr><th>Flag</th><th>Sentry</th><th>Project</th><th>Title</th><th>Status</th><th>Count</th><th>Assignee</th><th>Source</th><th>Existing work</th><th>Actions</th></tr></thead>
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

const escapeText = (value) => String(value ?? '');

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

const makeTimelineEvent = ({ actor = 'Codex', phase = 'manual', status = 'info', title, message }) => {
  const at = new Date().toISOString();
  return {
    id: at + '-' + Math.random().toString(36).slice(2),
    at,
    actor,
    phase,
    status,
    title,
    message,
  };
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
      requestedAction: '',
      requestedJiraKey: '',
      timeline: [],
      runLogPath: '',
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
    merged.issues[issue.id].timeline = mergeTimeline(remoteIssue.timeline, localIssue.timeline);
    merged.issues[issue.id].status = normalizeStatus(merged.issues[issue.id].status);
  }
  return merged;
};

const fetchRemoteStatus = async () => {
  const response = await fetch('/api/status', { cache: 'no-store' });
  if (!response.ok) throw new Error('No local status API');
  return response.json();
};

const issueRowFromTarget = (target) => {
  const row = target.closest('tr[data-issue-id]');
  if (!row) return null;
  if (row.classList.contains('issue-detail-row')) return row;
  return document.querySelector('tr.issue-detail-row[data-issue-id="' + CSS.escape(row.dataset.issueId) + '"]') || row;
};

const renderStatus = () => {
  const active = [];
  for (const row of document.querySelectorAll('tr.issue-detail-row[data-issue-id]')) {
    const issueId = row.dataset.issueId;
    const summaryRow = document.querySelector('tr.issue-row[data-issue-id="' + CSS.escape(issueId) + '"]');
    const status = issueStatus.issues[issueId] || {};
    const normalized = normalizeStatus(status.status);
    const label = row.querySelector('.row-status');
    const note = row.querySelector('.row-note');
    const messageInput = row.querySelector('.status-message');
    const claudeResult = row.querySelector('.claude-result');
    const requestedAction = row.querySelector('.requested-action');
    const timeline = row.querySelector('.action-timeline');
    const runLog = row.querySelector('.run-log');
    const isActive = normalized === 'working' || normalized === 'selected';
    row.classList.toggle('is-active', isActive);
    summaryRow?.classList.toggle('is-active', isActive);
    label.className = 'row-status status-' + normalized;
    label.textContent = statusLabel(normalized);
    note.textContent = status.updatedAt ? 'Updated ' + formatTime(status.updatedAt) + (status.message ? ' - ' + status.message : '') : (status.message || '');
    requestedAction.textContent = status.requestedAction
      ? 'Requested: ' + status.requestedAction + (status.requestedJiraKey ? ' (' + status.requestedJiraKey + ')' : '')
      : '';
    runLog.textContent = status.runLogPath ? 'JSON log: ' + status.runLogPath : '';
    if (document.activeElement !== messageInput && messageInput.value !== (status.message || '')) {
      messageInput.value = status.message || '';
    }
    if (status.claude?.status) {
      const summary = status.claude.output || status.claude.error || '';
      const label = status.claude.status === 'degraded'
        ? 'Claude degraded'
        : status.claude.status === 'needs-validation'
          ? 'Claude needs Codex validation'
          : 'Claude ' + status.claude.status;
      claudeResult.textContent = label + (summary ? ': ' + summary.slice(0, 240) : '');
      claudeResult.title = summary;
    } else {
      claudeResult.textContent = '';
      claudeResult.removeAttribute('title');
    }
    timeline.replaceChildren();
    const events = Array.isArray(status.timeline) ? status.timeline : [];
    if (events.length === 0) {
      const empty = document.createElement('li');
      empty.className = 'muted';
      empty.textContent = 'No actions recorded yet.';
      timeline.append(empty);
    } else {
      for (const event of events.slice(-20).reverse()) {
        const item = document.createElement('li');
        const title = document.createElement('span');
        const meta = document.createElement('span');
        const message = document.createElement('span');
        title.className = 'timeline-title';
        meta.className = 'timeline-meta';
        message.className = 'timeline-message';
        title.textContent = escapeText(event.title || event.phase || event.status || 'Action');
        meta.textContent = [event.actor, event.status, formatTime(event.at || event.updatedAt)].filter(Boolean).join(' - ');
        message.textContent = escapeText(event.message || '');
        item.append(title, meta);
        if (message.textContent) item.append(message);
        timeline.append(item);
      }
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

const postStatusEntry = async (entry) => {
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
      return true;
    }
    throw new Error('POST failed');
  } catch {
    remoteFailureCount += 1;
    document.getElementById('serverState').textContent = 'Status source: browser cache only. Start issue-list-status-server.mjs for Codex API updates.';
    return false;
  }
};

const setIssueStatus = async (issueId, status, message = '') => {
  const previous = issueStatus.issues[issueId] || {};
  const timelineEvent = makeTimelineEvent({
    status: normalizeStatus(status),
    phase: 'status',
    title: 'Status changed to ' + statusLabel(normalizeStatus(status)),
    message,
  });
  const entry = {
    ...previous,
    id: issueId,
    status: normalizeStatus(status),
    message,
    requestedAction: previous.requestedAction || '',
    requestedJiraKey: previous.requestedJiraKey || '',
    timeline: mergeTimeline(previous.timeline, [timelineEvent]),
    timelineEvent,
    updatedAt: new Date().toISOString(),
  };
  issueStatus.issues[issueId] = entry;
  saveLocalStatus();
  renderStatus();
  await postStatusEntry(entry);
};

const requestIssueAction = async (row, action) => {
  const issueId = row.dataset.issueId;
  const label = ({
    'assign-to-me': 'Assign to me',
    'create-jira': 'Create JIRA',
    'unlink-jira': 'Unlink outdated JIRA',
    'link-existing-jira': 'Link existing JIRA',
    'review-pr': 'Review PR',
    'jira-status-change': 'JIRA Ticket status change',
  })[action] || action;
  let requestedJiraKey = '';
  if (action === 'link-existing-jira') {
    requestedJiraKey = (window.prompt('Existing Jira key to verify and link, for example PRE-1234') || '').trim().toUpperCase();
    if (!requestedJiraKey) return;
  }
  const messageInput = row.querySelector('.status-message');
  const message = messageInput.value.trim() || 'Requested action: ' + label + (requestedJiraKey ? ' ' + requestedJiraKey : '');
  const previous = issueStatus.issues[issueId] || {};
  const timelineEvent = makeTimelineEvent({
    status: 'selected',
    phase: 'request',
    title: label + ' requested',
    message,
  });
  const entry = {
    ...previous,
    id: issueId,
    status: 'selected',
    message,
    requestedAction: action,
    requestedJiraKey,
    timeline: mergeTimeline(previous.timeline, [timelineEvent]),
    timelineEvent,
    updatedAt: new Date().toISOString(),
  };
  issueStatus.issues[issueId] = entry;
  saveLocalStatus();
  renderStatus();
  await postStatusEntry(entry);
};

const askClaude = async (row, prompt) => {
  const issueId = row.dataset.issueId;
  const button = row.querySelector('button.ask-claude');
  const result = row.querySelector('.claude-result');
  const terminal = row.querySelector('.terminal-output');
  const original = button.textContent;
  button.disabled = true;
  button.textContent = 'Claude running...';
  result.textContent = 'Running Claude analysis through local safe wrapper.';
  terminal.textContent = '$ claude --print ...\n';
  await setIssueStatus(issueId, 'working', 'Running Claude analysis');
  try {
    const response = await fetch('/api/claude-stream', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ issueId, prompt }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || 'Claude request failed');
    }
    if (!response.body) throw new Error('Streaming response unavailable');
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let data = null;
    const handleEvent = (raw) => {
      const lines = raw.split('\n');
      const eventName = (lines.find((line) => line.startsWith('event:')) || 'event: message').slice(6).trim();
      const dataLine = lines.find((line) => line.startsWith('data:'));
      if (!dataLine) return;
      const payload = JSON.parse(dataLine.slice(5).trim());
      if (eventName === 'stdout' || eventName === 'stderr' || eventName === 'error') {
        terminal.textContent += payload.text || '';
        terminal.scrollTop = terminal.scrollHeight;
      } else if (eventName === 'start') {
        terminal.textContent += (payload.message || 'started') + '\n';
      } else if (eventName === 'done') {
        data = payload;
      }
    };
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split('\n\n');
      buffer = events.pop() || '';
      for (const eventText of events) {
        if (eventText.trim()) handleEvent(eventText);
      }
    }
    if (buffer.trim()) handleEvent(buffer);
    if (!data) throw new Error('Claude stream ended without final status');
    issueStatus = mergeStatus(data.status, loadLocalStatus());
    const claude = data.claude || {};
    if (claude.status === 'degraded') {
      issueStatus.issues[issueId] = {
        ...(issueStatus.issues[issueId] || {}),
        id: issueId,
        status: 'selected',
        message: claude.warning || 'Claude degraded; continue with Codex local inspection and Cursor agreement',
        requestedAction: issueStatus.issues[issueId]?.requestedAction || '',
        requestedJiraKey: issueStatus.issues[issueId]?.requestedJiraKey || '',
        updatedAt: new Date().toISOString(),
      };
    } else if (claude.status === 'needs-validation') {
      issueStatus.issues[issueId] = {
        ...(issueStatus.issues[issueId] || {}),
        id: issueId,
        status: 'selected',
        message: claude.warning || 'Claude says likely external/noise; Codex must validate Sentry evidence before skipping',
        requestedAction: 'codex-validate-noise',
        requestedJiraKey: issueStatus.issues[issueId]?.requestedJiraKey || '',
        updatedAt: new Date().toISOString(),
      };
    }
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

const copyPrompt = async (row, prompt, button) => {
  await navigator.clipboard.writeText(prompt);
  const original = button.textContent;
  button.textContent = 'Copied';
  button.classList.add('copied');
  window.setTimeout(() => {
    button.textContent = original;
    button.classList.remove('copied');
  }, 1200);
  const issueId = row.dataset.issueId;
  const previous = issueStatus.issues[issueId] || {};
  const timelineEvent = makeTimelineEvent({
    actor: 'Codex',
    phase: 'handoff',
    status: 'info',
    title: 'Prompt copied',
    message: 'Full Cursor/Codex handoff prompt copied to clipboard.',
  });
  const entry = {
    ...previous,
    id: issueId,
    status: normalizeStatus(previous.status),
    message: previous.message || 'Prompt copied',
    requestedAction: previous.requestedAction || '',
    requestedJiraKey: previous.requestedJiraKey || '',
    timeline: mergeTimeline(previous.timeline, [timelineEvent]),
    timelineEvent,
    updatedAt: new Date().toISOString(),
  };
  issueStatus.issues[issueId] = entry;
  saveLocalStatus();
  renderStatus();
  await postStatusEntry(entry);
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
  for (const row of document.querySelectorAll('tr.issue-row[data-issue-id]')) {
    const status = normalizeStatus(issueStatus.issues[row.dataset.issueId]?.status);
    const detail = document.querySelector('tr.issue-detail-row[data-issue-id="' + CSS.escape(row.dataset.issueId) + '"]');
    const text = (row.textContent + ' ' + (detail?.textContent || '')).toLowerCase();
    const visible = (!query || text.includes(query)) && (!statusFilter || status === statusFilter);
    row.style.display = visible ? '' : 'none';
    if (detail) detail.style.display = visible ? '' : 'none';
  }
};

document.addEventListener('click', async (event) => {
  const claudeButton = event.target.closest('button.ask-claude');
  if (claudeButton) {
    const row = issueRowFromTarget(claudeButton);
    await askClaude(row, decodePrompt(claudeButton.dataset.promptBase64 || ''));
    return;
  }

  const copyButton = event.target.closest('button.copy-prompt');
  if (copyButton) {
    const row = issueRowFromTarget(copyButton);
    await copyPrompt(row, decodePrompt(copyButton.dataset.promptBase64 || ''), copyButton);
    return;
  }

  const statusButton = event.target.closest('button.status-button');
  if (statusButton) {
    const row = issueRowFromTarget(statusButton);
    const message = row.querySelector('.status-message').value.trim();
    await setIssueStatus(row.dataset.issueId, statusButton.dataset.status, message);
    return;
  }

  const actionButton = event.target.closest('button.action-button');
  if (actionButton) {
    const row = issueRowFromTarget(actionButton);
    await requestIssueAction(row, actionButton.dataset.action);
    return;
  }

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
