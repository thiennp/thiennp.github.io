#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const DEFAULT_JIRA_BASE_URL = 'https://c24-energie.atlassian.net';
const DEFAULT_JIRA_JQL =
  'project = PRE AND assignee = 712020:98c2de13-71c4-48ae-a98a-3baa7fa11ba2 ORDER BY updated DESC';
const DEFAULT_BB_WORKSPACE = 'check24';
const DEFAULT_BB_AUTHOR = '712020:98c2de13-71c4-48ae-a98a-3baa7fa11ba2';
const DEFAULT_TIMEOUT_MS = 30000;
const DEFAULT_MAX_PAGES = 50;

function parseArgs(argv) {
  const args = {
    mode: 'all',
    jiraJql: DEFAULT_JIRA_JQL,
    jiraMaxResults: 100,
    bitbucketState: 'ALL',
    bitbucketPagelen: 50,
    bitbucketAuthor: DEFAULT_BB_AUTHOR,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    maxPages: DEFAULT_MAX_PAGES,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--mode') args.mode = argv[++i];
    else if (arg === '--out') args.out = argv[++i];
    else if (arg === '--env-file') args.envFile = argv[++i];
    else if (arg === '--jira-jql') args.jiraJql = argv[++i];
    else if (arg === '--jira-max-results') args.jiraMaxResults = Number(argv[++i]);
    else if (arg === '--bb-workspace') args.bitbucketWorkspace = argv[++i];
    else if (arg === '--bb-author') args.bitbucketAuthor = argv[++i];
    else if (arg === '--bb-state') args.bitbucketState = argv[++i];
    else if (arg === '--bb-pagelen') args.bitbucketPagelen = Number(argv[++i]);
    else if (arg === '--timeout-ms') args.timeoutMs = Number(argv[++i]);
    else if (arg === '--max-pages') args.maxPages = Number(argv[++i]);
    else if (arg === '--help' || arg === '-h') args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function usage() {
  return `Usage: node jira-bitbucket-snapshot.mjs [--mode all|jira|bitbucket] [--out path]

Reads Jira and Bitbucket credentials from ~/.env or the environment, performs
read-only API verification for Jira PRE tickets and Bitbucket PR inventory,
follows bounded pagination, and prints sanitized JSON for report reconciliation.

Expected variables:
- Jira: JIRA_API_TOKEN, EMAIL, optional JIRA_BASE_URL, JIRA_JQL
- Bitbucket: BB_API_TOKEN, optional BB_WORKSPACE

No Jira, Bitbucket, git, Sentry, or report-data mutations are performed.`;
}

function loadDotEnv(envFile) {
  const file = envFile || path.join(os.homedir(), '.env');
  if (!fs.existsSync(file)) return {};
  const out = {};
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[match[1]] = value;
  }
  return out;
}

function normalizeBaseUrl(value) {
  return String(value || '').replace(/\/+$/, '');
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function safeErrorBody(text) {
  return text
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [redacted]')
    .replace(/Basic\s+[A-Za-z0-9._~+/=-]+/gi, 'Basic [redacted]')
    .replace(/"token"\s*:\s*"[^"]+"/gi, '"token":"[redacted]"')
    .slice(0, 1000);
}

function requireInt(name, value, min, max) {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${name} must be an integer between ${min} and ${max}`);
  }
}

function jiraAuthHeader(email, token) {
  return `Basic ${Buffer.from(`${email}:${token}`).toString('base64')}`;
}

function compactJiraIssue(issue, baseUrl) {
  const fields = issue.fields || {};
  const status = fields.status || {};
  const assignee = fields.assignee || {};
  const reporter = fields.reporter || {};
  return {
    id: issue.id || null,
    key: issue.key,
    self: issue.self || null,
    browseUrl: issue.key ? `${baseUrl}/browse/${issue.key}` : null,
    summary: fields.summary || null,
    status: status.name || null,
    statusCategory: status.statusCategory?.name || null,
    assignee: assignee.displayName
      ? {
          accountId: assignee.accountId || null,
          displayName: assignee.displayName,
        }
      : null,
    reporter: reporter.displayName
      ? {
          accountId: reporter.accountId || null,
          displayName: reporter.displayName,
        }
      : null,
    updated: fields.updated || null,
    created: fields.created || null,
    issueType: fields.issuetype?.name || null,
    priority: fields.priority?.name || null,
  };
}

async function fetchJira({ env, args }) {
  const token = env.JIRA_API_TOKEN;
  const email = env.EMAIL || env.JIRA_EMAIL || env.ATLASSIAN_EMAIL;
  if (!token || !email) {
    throw new Error('Missing JIRA_API_TOKEN and EMAIL/JIRA_EMAIL/ATLASSIAN_EMAIL');
  }
  const baseUrl = normalizeBaseUrl(env.JIRA_BASE_URL || DEFAULT_JIRA_BASE_URL);
  const jql = args.jiraJql || env.JIRA_JQL || DEFAULT_JIRA_JQL;
  const fields = [
    'summary',
    'status',
    'assignee',
    'reporter',
    'updated',
    'created',
    'issuetype',
    'priority',
  ];
  const issues = [];
  const pages = [];
  let startAt = 0;
  let total = null;
  let page = 0;
  do {
    page += 1;
    if (page > args.maxPages) throw new Error(`Jira exceeded max pagination pages (${args.maxPages})`);
    const url = new URL(`${baseUrl}/rest/api/3/search/jql`);
    url.searchParams.set('jql', jql);
    url.searchParams.set('maxResults', String(args.jiraMaxResults));
    url.searchParams.set('fields', fields.join(','));
    if (startAt > 0) url.searchParams.set('startAt', String(startAt));
    const response = await fetchWithTimeout(
      url,
      {
        headers: {
          Authorization: jiraAuthHeader(email, token),
          Accept: 'application/json',
        },
      },
      args.timeoutMs,
    );
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`Jira API request failed: HTTP ${response.status} ${response.statusText}; ${safeErrorBody(text)}`);
    }
    const json = JSON.parse(text);
    const pageIssues = Array.isArray(json.issues) ? json.issues : [];
    total = Number(json.total || pageIssues.length);
    pages.push({
      page,
      startAt,
      maxResults: Number(json.maxResults || args.jiraMaxResults),
      count: pageIssues.length,
      total,
      keys: pageIssues.map((issue) => issue.key),
    });
    for (const issue of pageIssues) issues.push(compactJiraIssue(issue, baseUrl));
    startAt += pageIssues.length;
    if (pageIssues.length === 0 || json.isLast === true) break;
  } while (total !== null && startAt < total);

  return {
    status: 'complete',
    checkedAt: new Date().toISOString(),
    method: 'jira-rest-token',
    baseUrl,
    jql,
    tokenSource: 'JIRA_API_TOKEN',
    count: issues.length,
    keys: issues.map((issue) => issue.key),
    pagination: {
      complete: total === issues.length,
      pageCount: pages.length,
      total,
      pages,
      endedBecause: total === issues.length ? 'startAt-reached-total' : 'empty-page-or-max-pages',
    },
    issues,
  };
}

function bitbucketAuthCandidates(env) {
  const token = env.BB_API_TOKEN || env.BITBUCKET_TOKEN || env.BITBUCKET_API_TOKEN;
  if (!token) throw new Error('Missing BB_API_TOKEN/BITBUCKET_TOKEN/BITBUCKET_API_TOKEN');
  const candidates = [{ label: 'bearer', header: `Bearer ${token}` }];
  candidates.push({
    label: 'basic-x-token-auth',
    header: `Basic ${Buffer.from(`x-token-auth:${token}`).toString('base64')}`,
  });
  const username = env.BB_USERNAME || env.BITBUCKET_USERNAME || env.EMAIL;
  if (username) {
    candidates.push({
      label: username === env.EMAIL ? 'basic-email' : 'basic-username',
      header: `Basic ${Buffer.from(`${username}:${token}`).toString('base64')}`,
    });
  }
  return candidates;
}

function compactPr(pr) {
  return {
    id: pr.id || null,
    title: pr.title || null,
    state: pr.state || null,
    author: pr.author
      ? {
          displayName: pr.author.display_name || null,
          uuid: pr.author.uuid || null,
          nickname: pr.author.nickname || null,
        }
      : null,
    source: pr.source
      ? {
          branch: pr.source.branch?.name || null,
          repository: pr.source.repository?.full_name || pr.source.repository?.name || null,
        }
      : null,
    destination: pr.destination
      ? {
          branch: pr.destination.branch?.name || null,
          repository: pr.destination.repository?.full_name || pr.destination.repository?.name || null,
        }
      : null,
    links: {
      html: pr.links?.html?.href || null,
      self: pr.links?.self?.href || null,
    },
    createdOn: pr.created_on || null,
    updatedOn: pr.updated_on || null,
  };
}

async function fetchBitbucketWithAuth({ url, auth, timeoutMs }) {
  const response = await fetchWithTimeout(
    url,
    {
      headers: {
        Authorization: auth.header,
        Accept: 'application/json',
      },
    },
    timeoutMs,
  );
  const text = await response.text();
  if (!response.ok) {
    throw new Error(
      `Bitbucket ${auth.label} request failed: HTTP ${response.status} ${response.statusText}; ${safeErrorBody(text)}`,
    );
  }
  return JSON.parse(text);
}

async function fetchBitbucket({ env, args }) {
  const workspace = args.bitbucketWorkspace || env.BB_WORKSPACE || DEFAULT_BB_WORKSPACE;
  const author = args.bitbucketAuthor || DEFAULT_BB_AUTHOR;
  const allowedStates = new Set(['ALL', 'OPEN', 'MERGED', 'DECLINED']);
  args.bitbucketState = String(args.bitbucketState || 'ALL').toUpperCase();
  if (!allowedStates.has(args.bitbucketState)) {
    throw new Error(`--bb-state must be one of ${Array.from(allowedStates).join(', ')}`);
  }
  const base = new URL(
    `https://api.bitbucket.org/2.0/workspaces/${encodeURIComponent(workspace)}/pullrequests/${encodeURIComponent(author)}`,
  );
  base.searchParams.set('pagelen', String(args.bitbucketPagelen));
  if (args.bitbucketState && args.bitbucketState !== 'ALL') {
    base.searchParams.set('state', args.bitbucketState);
  }

  const auths = bitbucketAuthCandidates(env);
  let selectedAuth = null;
  let firstPageJson = null;
  const errors = [];
  for (const auth of auths) {
    try {
      firstPageJson = await fetchBitbucketWithAuth({ url: base, auth, timeoutMs: args.timeoutMs });
      selectedAuth = auth;
      break;
    } catch (error) {
      errors.push(`${auth.label}: ${error.message}`);
    }
  }
  if (!selectedAuth) throw new Error(`No Bitbucket auth candidate succeeded; ${errors.join(' | ')}`);

  const prs = [];
  const pages = [];
  let next = base.toString();
  let page = 0;
  while (next) {
    page += 1;
    if (page > args.maxPages) throw new Error(`Bitbucket exceeded max pagination pages (${args.maxPages})`);
    const json =
      page === 1 && firstPageJson
        ? firstPageJson
        : await fetchBitbucketWithAuth({
            url: next,
            auth: selectedAuth,
            timeoutMs: args.timeoutMs,
          });
    const values = Array.isArray(json.values) ? json.values : [];
    pages.push({
      page,
      count: values.length,
      next: Boolean(json.next),
      ids: values.map((pr) => pr.id),
    });
    for (const pr of values) prs.push(compactPr(pr));
    next = json.next || null;
  }

  return {
    status: 'complete',
    checkedAt: new Date().toISOString(),
    method: 'bitbucket-api-token',
    workspace,
    author,
    state: args.bitbucketState,
    tokenSource: selectedAuth.label === 'bearer' ? 'BB_API_TOKEN bearer' : 'BB_API_TOKEN basic',
    count: prs.length,
    prIds: prs.map((pr) => pr.id),
    pagination: {
      complete: true,
      pageCount: pages.length,
      pages,
      endedBecause: 'no-next-url',
    },
    pullRequests: prs,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }
  if (!['all', 'jira', 'bitbucket'].includes(args.mode)) {
    throw new Error('--mode must be all, jira, or bitbucket');
  }
  requireInt('--jira-max-results', args.jiraMaxResults, 1, 100);
  requireInt('--bb-pagelen', args.bitbucketPagelen, 1, 100);
  requireInt('--max-pages', args.maxPages, 1, 500);
  requireInt('--timeout-ms', args.timeoutMs, 1000, 120000);

  const env = { ...loadDotEnv(args.envFile), ...process.env };
  const output = {
    status: 'complete',
    checkedAt: new Date().toISOString(),
    method: 'jira-bitbucket-api-token',
  };
  if (args.mode === 'all' || args.mode === 'jira') output.jira = await fetchJira({ env, args });
  if (args.mode === 'all' || args.mode === 'bitbucket') {
    output.bitbucket = await fetchBitbucket({ env, args });
  }

  const text = JSON.stringify(output, null, 2) + '\n';
  if (args.out) {
    const outPath = path.resolve(args.out);
    const tmp = `${outPath}.tmp-${randomUUID()}`;
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(tmp, text);
    JSON.parse(fs.readFileSync(tmp, 'utf8'));
    fs.renameSync(tmp, outPath);
  }
  process.stdout.write(text);
}

main().catch((error) => {
  const failure = {
    status: 'blocked',
    checkedAt: new Date().toISOString(),
    method: 'jira-bitbucket-api-token',
    reason: error.message,
  };
  process.stderr.write(`${JSON.stringify(failure, null, 2)}\n`);
  process.exitCode = 1;
});
