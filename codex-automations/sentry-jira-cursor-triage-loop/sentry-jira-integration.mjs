#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const DEFAULT_HOST = 'https://check24-energie.sentry.io';
const DEFAULT_ORG = 'check24-energie';
const DEFAULT_JIRA_INTEGRATION_ID = '404933';
const THIEN_ACCOUNT_ID = '712020:98c2de13-71c4-48ae-a98a-3baa7fa11ba2';

function usage() {
  return `Usage:
  node sentry-jira-integration.mjs inspect --issue-id ID
  node sentry-jira-integration.mjs fields --issue-id ID --action create|link
  node sentry-jira-integration.mjs search-field --field assignee --query Thien [--project 10004] [--issuetype 10004]
  node sentry-jira-integration.mjs create --issue-id ID [--execute] [--title text] [--description text]
  node sentry-jira-integration.mjs link --issue-id ID --external-issue KEY_OR_ID [--execute]

Read-only by default for create/link. Add --execute to mutate Sentry/Jira integration state.
Reads SENTRY_AUTH_TOKEN from ~/.env or the process environment.`;
}

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') args.help = true;
    else if (arg === '--execute') args.execute = true;
    else if (arg === '--confirmed-no-existing-jira') args.confirmedNoExistingJira = true;
    else if (arg === '--confirmed-same-issue') args.confirmedSameIssue = true;
    else if (arg.startsWith('--')) {
      const key = arg.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      const value = argv[i + 1];
      if (value === undefined || value.startsWith('--')) throw new Error(`Missing value for ${arg}`);
      args[key] = value;
      i += 1;
    } else args._.push(arg);
  }
  args.command = args._[0];
  return args;
}

function loadEnv(file = path.join(os.homedir(), '.env')) {
  const env = {};
  if (fs.existsSync(file)) {
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
      if (!line.trim() || line.trim().startsWith('#')) continue;
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!match) continue;
      let value = match[2];
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      env[match[1]] = value;
    }
  }
  return { ...env, ...process.env };
}

function required(name, value) {
  if (!value) throw new Error(`Missing required ${name}`);
  return value;
}

function buildClient(env) {
  const token = required('SENTRY_AUTH_TOKEN', env.SENTRY_AUTH_TOKEN);
  const host = (env.SENTRY_HOST || DEFAULT_HOST).replace(/\/$/, '');
  const org = env.SENTRY_ORG_SLUG || DEFAULT_ORG;
  async function request(endpoint, options = {}) {
    const response = await fetch(host + endpoint, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
    const text = await response.text();
    let body;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = text;
    }
    if (!response.ok) {
      const reason =
        body && typeof body === 'object'
          ? JSON.stringify(body)
          : String(body || response.statusText);
      const error = new Error(`Sentry API ${response.status} for ${endpoint}: ${reason}`);
      error.status = response.status;
      error.body = body;
      throw error;
    }
    return body;
  }
  return { host, org, request };
}

function fieldSummary(field) {
  return {
    name: field.name,
    label: field.label,
    type: field.type,
    required: field.required,
    default: field.default,
    multiple: field.multiple,
    updatesForm: field.updatesForm,
    choicesCount: Array.isArray(field.choices) ? field.choices.length : undefined,
    choices: Array.isArray(field.choices)
      ? field.choices.slice(0, 20).map((choice) =>
          Array.isArray(choice) ? { value: choice[0], label: choice[1] } : choice,
        )
      : undefined,
    url: field.url,
  };
}

function issueEndpoint(args, action) {
  const issueId = required('--issue-id', args.issueId);
  const integrationId = args.integrationId || DEFAULT_JIRA_INTEGRATION_ID;
  const actionSuffix = action ? `?action=${encodeURIComponent(action)}` : '';
  return `/api/0/issues/${encodeURIComponent(issueId)}/integrations/${encodeURIComponent(
    integrationId,
  )}/${actionSuffix}`;
}

async function inspect(args, client) {
  const issueId = required('--issue-id', args.issueId);
  const integrations = await client.request(`/api/0/issues/${encodeURIComponent(issueId)}/integrations/`);
  return {
    issueId,
    integrations: integrations.map((integration) => ({
      id: integration.id,
      name: integration.name,
      domainName: integration.domainName,
      status: integration.status,
      providerKey: integration.provider?.key,
      features: integration.provider?.features,
      externalIssues: (integration.externalIssues || []).map((issue) => ({
        id: issue.id,
        key: issue.key,
        title: issue.title,
        url: issue.url,
      })),
    })),
  };
}

async function fields(args, client) {
  const action = args.action || 'create';
  if (!['create', 'link'].includes(action)) throw new Error('--action must be create or link');
  const config = await client.request(issueEndpoint(args, action));
  const key = action === 'create' ? 'createIssueConfig' : 'linkIssueConfig';
  return {
    issueId: args.issueId,
    integrationId: args.integrationId || DEFAULT_JIRA_INTEGRATION_ID,
    action,
    fields: (config[key] || []).map(fieldSummary),
  };
}

async function searchField(args, client) {
  const field = required('--field', args.field);
  const query = args.query || '';
  const params = new URLSearchParams({
    field,
    query,
    project: args.project || '10004',
    issuetype: args.issuetype || '10004',
  });
  const integrationId = args.integrationId || DEFAULT_JIRA_INTEGRATION_ID;
  const result = await client.request(
    `/extensions/jira/search/${client.org}/${encodeURIComponent(integrationId)}/?${params}`,
  );
  return {
    field,
    query,
    results: Array.isArray(result)
      ? result.map((choice) =>
          Array.isArray(choice) ? { value: choice[0], label: choice[1] } : choice,
        )
      : result,
  };
}

function createPayload(args) {
  return {
    project: args.project || '10004',
    issuetype: args.issuetype || '10004',
    title: args.title,
    description: args.description,
    priority: args.priority || '3',
    assignee: args.assignee || THIEN_ACCOUNT_ID,
    reporter: args.reporter || THIEN_ACCOUNT_ID,
    customfield_10034: args.developer || THIEN_ACCOUNT_ID,
    labels: args.labels || 'sentry',
  };
}

async function mountedJiraIssues(args, client) {
  const issueId = required('--issue-id', args.issueId);
  const integrations = await client.request(`/api/0/issues/${encodeURIComponent(issueId)}/integrations/`);
  return integrations
    .filter((integration) => String(integration.id) === String(args.integrationId || DEFAULT_JIRA_INTEGRATION_ID))
    .flatMap((integration) => integration.externalIssues || [])
    .map((issue) => ({
      id: issue.id,
      key: issue.key,
      title: issue.title,
      url: issue.url,
    }));
}

async function createIssue(args, client) {
  if (args.execute && !args.confirmedNoExistingJira) {
    throw new Error('Refusing create: pass --confirmed-no-existing-jira after inspect/idempotency checks');
  }
  if (args.execute && (!args.title || !args.description)) {
    throw new Error('Refusing create: --title and --description are required with --execute');
  }
  const payload = createPayload(args);
  if (!args.execute) {
    return {
      dryRun: true,
      message: 'Add --execute to create the Jira issue through Sentry.',
      endpoint: issueEndpoint(args, 'create'),
      payloadKeys: Object.keys(payload).filter((key) => payload[key] !== undefined),
      payloadPreview: {
        project: payload.project,
        issuetype: payload.issuetype,
        title: payload.title,
        priority: payload.priority,
        assignee: payload.assignee,
        reporter: payload.reporter,
        developer: payload.customfield_10034,
        labels: payload.labels,
      },
    };
  }
  const mounted = await mountedJiraIssues(args, client);
  if (mounted.length > 0) {
    throw new Error(`Refusing create: Sentry issue already has mounted Jira issue(s): ${mounted.map((issue) => issue.key || issue.id).join(', ')}`);
  }
  return client.request(issueEndpoint(args, 'create'), {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

async function linkIssue(args, client) {
  const externalIssue = required('--external-issue', args.externalIssue);
  if (args.execute && !args.confirmedSameIssue) {
    throw new Error('Refusing link: pass --confirmed-same-issue after Jira/Sentry evidence verifies the same issue');
  }
  const payload = {
    externalIssue,
    issuetype: args.issuetype || '10004',
  };
  if (!args.execute) {
    return {
      dryRun: true,
      message: 'Add --execute to link the Jira issue through Sentry.',
      endpoint: issueEndpoint(args, 'link'),
      payload,
    };
  }
  const mounted = await mountedJiraIssues(args, client);
  if (mounted.some((issue) => String(issue.key || issue.id) === String(externalIssue))) {
    return {
      alreadyLinked: true,
      issueId: args.issueId,
      externalIssue,
      mounted,
    };
  }
  return client.request(issueEndpoint(args, 'link'), {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.command) {
    console.log(usage());
    return;
  }
  const client = buildClient(loadEnv(args.envFile));
  const commands = {
    inspect,
    fields,
    searchField,
    'search-field': searchField,
    create: createIssue,
    link: linkIssue,
  };
  const command = commands[args.command];
  if (!command) throw new Error(`Unknown command: ${args.command}`);
  const result = await command(args, client);
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
