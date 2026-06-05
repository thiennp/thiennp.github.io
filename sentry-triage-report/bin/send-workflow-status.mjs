#!/usr/bin/env node
import http from 'node:http';
import https from 'node:https';

const options = {
  status: '',
  step: '',
  phase: '',
  title: '',
  message: '',
  pre: '',
  sentryKey: '',
  sentryIssueId: '',
  repo: '',
  pr: '',
  url: '',
  source: 'automation',
};
const messageParts = [];

for (let index = 2; index < process.argv.length; index += 1) {
  const argument = process.argv[index];
  const assign = argument.match(/^--([^=]+)=(.*)$/);
  if (assign) {
    const key = assign[1].replace(/-([a-z])/g, (_, char) => char.toUpperCase());
    if (key in options) {
      options[key] = assign[2];
      continue;
    }
  }
  if (argument.startsWith('--')) {
    const key = argument.slice(2).replace(/-([a-z])/g, (_, char) => char.toUpperCase());
    if (key in options) {
      options[key] = process.argv[index + 1] || '';
      index += 1;
      continue;
    }
  }
  messageParts.push(argument);
}

if (!options.message && messageParts.length) {
  options.message = messageParts.join(' ').trim();
}

if (!options.status || !options.message) {
  console.error('Usage: node send-workflow-status.mjs --step 2.3 --phase "review" --title "Bitbucket PR" --status running --pre PRE-4309 "Checking PR state"');
  process.exit(1);
}

const endpoint = new URL(process.env.SENTRY_TRIAGE_WORKFLOW_STATUS_URL || 'http://127.0.0.1:8766/api/workflow-status');
const transport = endpoint.protocol === 'https:' ? https : http;
const body = JSON.stringify(options);
const request = transport.request(endpoint, {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    'content-length': Buffer.byteLength(body),
  },
}, (response) => {
  let responseBody = '';
  response.setEncoding('utf8');
  response.on('data', (chunk) => {
    responseBody += chunk;
  });
  response.on('end', () => {
    if (response.statusCode < 200 || response.statusCode >= 300) {
      console.error(`workflow status failed: HTTP ${response.statusCode} ${responseBody}`);
      process.exit(1);
    }
    console.log(`sent workflow status: ${options.step || 'step'} ${options.status}`);
  });
});

request.on('error', (error) => {
  console.error(`workflow status failed: ${error.message}`);
  process.exit(1);
});

request.end(body);
