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
  automationId: '',
  runId: '',
  agentName: '',
  nextStep: ''
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
  console.error('Usage: node send-work-status.mjs --status running --step 2.3 --phase cursor --title "Cursor fix" --pre PRE-4309 "Applying the bug fix"');
  process.exit(1);
}

const endpoint = new URL(process.env.AUTOMATION_REPORT_WORK_STATUS_URL || 'http://127.0.0.1:3120/api/work-status');
const transport = endpoint.protocol === 'https:' ? https : http;
const body = JSON.stringify(options);
const headers = {
  'content-type': 'application/json',
  'content-length': Buffer.byteLength(body)
};

if (process.env.AUTOMATION_REPORT_TOKEN) {
  headers['x-automation-report-token'] = process.env.AUTOMATION_REPORT_TOKEN;
}

const request = transport.request(endpoint, {
  method: 'POST',
  headers
}, (response) => {
  let responseBody = '';
  response.setEncoding('utf8');
  response.on('data', (chunk) => {
    responseBody += chunk;
  });
  response.on('end', () => {
    if (response.statusCode < 200 || response.statusCode >= 300) {
      console.error(`work status failed: HTTP ${response.statusCode} ${responseBody}`);
      process.exit(1);
    }
    console.log(`sent work status: ${options.step || 'step'} ${options.status}`);
  });
});

request.on('error', (error) => {
  console.error(`work status failed: ${error.message}`);
  process.exit(1);
});

request.end(body);
