#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const DEFAULT_ORG = 'check24-energie';
const DEFAULT_HOST = 'https://sentry.io';
const DEFAULT_MAX_PAGES = 50;
const DEFAULT_TIMEOUT_MS = 30000;
const SOURCES = {
  A: {
    label: 'unresolved unassigned',
    webUrl:
      'https://check24-energie.sentry.io/issues/?project=-1&query=is%3Aunresolved%20is%3Aunassigned&referrer=issue-list&statsPeriod=24h',
    query: 'is:unresolved is:unassigned',
  },
  B: {
    label: 'unresolved assigned_or_suggested:me',
    webUrl:
      'https://check24-energie.sentry.io/issues/?project=-1&query=is%3Aunresolved%20assigned_or_suggested%3Ame&referrer=issue-list&statsPeriod=24h',
    query: 'is:unresolved assigned_or_suggested:me',
  },
};

function parseArgs(argv) {
  const args = {
    limit: 100,
    sources: ['A', 'B'],
    maxPages: DEFAULT_MAX_PAGES,
    timeoutMs: DEFAULT_TIMEOUT_MS,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--out') args.out = argv[++i];
    else if (arg === '--env-file') args.envFile = argv[++i];
    else if (arg === '--org') args.org = argv[++i];
    else if (arg === '--host') args.host = argv[++i];
    else if (arg === '--limit') args.limit = Number(argv[++i]);
    else if (arg === '--max-pages') args.maxPages = Number(argv[++i]);
    else if (arg === '--timeout-ms') args.timeoutMs = Number(argv[++i]);
    else if (arg === '--source') args.sources = [String(argv[++i] || '').toUpperCase()];
    else if (arg === '--help' || arg === '-h') args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function usage() {
  return `Usage: node sentry-source-union.mjs [--out path] [--env-file ~/.env] [--org check24-energie] [--host https://sentry.io] [--source A|B]

Reads SENTRY_AUTH_TOKEN from ~/.env or the environment, fetches Source A and
Source B through the Sentry REST API, follows bounded pagination, deduplicates
by issue id, and prints sanitized JSON suitable for report-data.json
sentrySourceVerification.

No Sentry, Jira, Bitbucket, git, or report-data mutations are performed.`;
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

function linkHasNext(linkHeader) {
  if (!linkHeader) return false;
  return linkHeader
    .split(',')
    .some((part) => /rel="next"/.test(part) && /results="true"/.test(part));
}

function nextCursor(linkHeader) {
  if (!linkHeader) return null;
  for (const part of linkHeader.split(',')) {
    if (!/rel="next"/.test(part) || !/results="true"/.test(part)) continue;
    const cursor = part.match(/cursor="([^"]+)"/)?.[1];
    if (cursor) return cursor;
  }
  return null;
}

function normalizeHost(host) {
  return String(host || DEFAULT_HOST).replace(/\/+$/, '');
}

function issuePermalink(issue) {
  if (issue.permalink) return issue.permalink;
  if (issue.project?.slug && issue.id) {
    return `https://check24-energie.sentry.io/issues/${issue.id}/?project=${issue.project.id || ''}`;
  }
  return issue.id ? `https://check24-energie.sentry.io/issues/${issue.id}/` : null;
}

function compactIssue(issue, sourceKey) {
  return {
    id: String(issue.id),
    shortId: issue.shortId || issue.short_id || issue.culprit || null,
    title: issue.title || issue.metadata?.title || issue.culprit || null,
    culprit: issue.culprit || null,
    level: issue.level || null,
    status: issue.status || null,
    substatus: issue.substatus || null,
    count: issue.count || issue.userCount || null,
    userCount: issue.userCount || null,
    firstSeen: issue.firstSeen || null,
    lastSeen: issue.lastSeen || null,
    project: issue.project
      ? { id: String(issue.project.id), slug: issue.project.slug, name: issue.project.name }
      : null,
    permalink: issuePermalink(issue),
    assignedTo: issue.assignedTo
      ? {
          type: issue.assignedTo.type || null,
          name: issue.assignedTo.name || null,
          email: issue.assignedTo.email || null,
        }
      : null,
    sourceKeys: [sourceKey],
  };
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
    .replace(/"token"\s*:\s*"[^"]+"/gi, '"token":"[redacted]"')
    .slice(0, 1000);
}

async function fetchSource({ host, org, token, sourceKey, source, limit, maxPages, timeoutMs }) {
  const startedAt = new Date().toISOString();
  const items = [];
  const pages = [];
  let cursor = null;
  let page = 0;
  do {
    page += 1;
    if (page > maxPages) {
      throw new Error(`${sourceKey} exceeded max pagination pages (${maxPages})`);
    }
    const url = new URL(`${host}/api/0/organizations/${encodeURIComponent(org)}/issues/`);
    url.searchParams.set('project', '-1');
    url.searchParams.set('query', source.query);
    url.searchParams.set('statsPeriod', '24h');
    url.searchParams.set('limit', String(limit));
    if (cursor) url.searchParams.set('cursor', cursor);

    const response = await fetchWithTimeout(
      url,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      },
      timeoutMs,
    );
    const text = await response.text();
    if (!response.ok) {
      const body = safeErrorBody(text);
      throw new Error(
        `${sourceKey} API request failed: HTTP ${response.status} ${response.statusText}; ${body}`,
      );
    }
    const json = JSON.parse(text);
    if (!Array.isArray(json)) {
      throw new Error(`${sourceKey} API response was not an issue array`);
    }
    const link = response.headers.get('link');
    const ids = json.map((issue) => String(issue.id));
    pages.push({
      page,
      count: json.length,
      ids,
      hasNext: linkHasNext(link),
      cursorUsed: cursor,
      nextCursor: nextCursor(link),
    });
    for (const issue of json) {
      const compact = compactIssue(issue, sourceKey);
      items.push(compact);
    }
    cursor = nextCursor(link);
  } while (cursor);

  return {
    key: sourceKey,
    label: source.label,
    webUrl: source.webUrl,
    query: source.query,
    status: 'complete',
    checkedAt: new Date().toISOString(),
    startedAt,
    count: items.length,
    ids: items.map((issue) => issue.id),
    pagination: {
      complete: true,
      pageCount: pages.length,
      pages,
      endedBecause: 'no-next-cursor',
    },
    items,
  };
}

function dedupeSources(sourceResults) {
  const union = new Map();
  for (const result of sourceResults) {
    for (const item of result.items) {
      const existing = union.get(item.id);
      if (!existing) {
        union.set(item.id, { ...item });
      } else {
        existing.sourceKeys = Array.from(new Set([...existing.sourceKeys, ...item.sourceKeys])).sort();
      }
    }
  }
  return Array.from(union.values()).sort((a, b) => {
    const aCount = Number(a.count || 0);
    const bCount = Number(b.count || 0);
    if (bCount !== aCount) return bCount - aCount;
    return String(a.id).localeCompare(String(b.id));
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }
  if (!Number.isInteger(args.limit) || args.limit < 1 || args.limit > 100) {
    throw new Error('--limit must be an integer between 1 and 100');
  }
  if (!Number.isInteger(args.maxPages) || args.maxPages < 1 || args.maxPages > 500) {
    throw new Error('--max-pages must be an integer between 1 and 500');
  }
  if (!Number.isInteger(args.timeoutMs) || args.timeoutMs < 1000 || args.timeoutMs > 120000) {
    throw new Error('--timeout-ms must be an integer between 1000 and 120000');
  }
  const env = { ...loadDotEnv(args.envFile), ...process.env };
  const token = env.SENTRY_AUTH_TOKEN || env.SENTRY_TOKEN;
  if (!token) {
    throw new Error('Missing SENTRY_AUTH_TOKEN in ~/.env or environment');
  }
  const org = args.org || env.SENTRY_ORG_SLUG || DEFAULT_ORG;
  const host = normalizeHost(args.host || env.SENTRY_HOST || DEFAULT_HOST);
  const requestedSources = args.sources.map((source) => source.toUpperCase());
  for (const source of requestedSources) {
    if (!SOURCES[source]) throw new Error(`Unknown source ${source}; expected A or B`);
  }

  const checkedAt = new Date().toISOString();
  const sourceResults = [];
  for (const sourceKey of requestedSources) {
    sourceResults.push(
      await fetchSource({
        host,
        org,
        token,
        sourceKey,
        source: SOURCES[sourceKey],
        limit: args.limit,
        maxPages: args.maxPages,
        timeoutMs: args.timeoutMs,
      }),
    );
  }
  const unionItems = dedupeSources(sourceResults);
  const output = {
    status: 'complete',
    checkedAt,
    method: 'sentry-api-token',
    org,
    host,
    tokenSource: env.SENTRY_AUTH_TOKEN ? 'SENTRY_AUTH_TOKEN' : 'SENTRY_TOKEN',
    sources: Object.fromEntries(sourceResults.map((source) => [source.key, source])),
    unionCount: unionItems.length,
    unionIds: unionItems.map((issue) => issue.id),
    unionItems,
  };

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
    method: 'sentry-api-token',
    reason: error.message,
  };
  process.stderr.write(`${JSON.stringify(failure, null, 2)}\n`);
  process.exitCode = 1;
});
