#!/usr/bin/env node
import fs from 'node:fs';
import https from 'node:https';
import { fileURLToPath } from 'node:url';

const REPO = process.env.AUTOMATION_REPORT_GITHUB_REPO || 'thiennp/thiennp.github.io';
const DISPATCH_URL = `https://api.github.com/repos/${REPO}/dispatches`;

function getToken() {
  return process.env.GITHUB_TOKEN || process.env.AUTOMATION_REPORT_GITHUB_TOKEN || '';
}

function requestJson(url, { method = 'GET', body, token }) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : '';
    const request = https.request(
      url,
      {
        method,
        headers: {
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
          'User-Agent': 'automation-report-publish',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {})
        }
      },
      (response) => {
        let responseBody = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => {
          responseBody += chunk;
        });
        response.on('end', () => {
          if (response.statusCode && response.statusCode >= 200 && response.statusCode < 300) {
            resolve(responseBody ? JSON.parse(responseBody) : null);
            return;
          }
          reject(new Error(`GitHub API ${response.statusCode || 'error'}: ${responseBody}`));
        });
      }
    );
    request.on('error', reject);
    if (payload) {
      request.write(payload);
    }
    request.end();
  });
}

export async function publishDashboardSnapshot(snapshot) {
  const token = getToken();
  if (!token) {
    throw new Error('Set GITHUB_TOKEN or AUTOMATION_REPORT_GITHUB_TOKEN before publishing');
  }

  await requestJson(DISPATCH_URL, {
    method: 'POST',
    token,
    body: {
      event_type: 'automation-dashboard',
      client_payload: { snapshot }
    }
  });
}

export async function publishWorkStatus(workStatus) {
  const token = getToken();
  if (!token) {
    throw new Error('Set GITHUB_TOKEN or AUTOMATION_REPORT_GITHUB_TOKEN before publishing');
  }

  await requestJson(DISPATCH_URL, {
    method: 'POST',
    token,
    body: {
      event_type: 'automation-work-status',
      client_payload: workStatus
    }
  });
}

export async function clearPublishedDashboard() {
  const token = getToken();
  if (!token) {
    throw new Error('Set GITHUB_TOKEN or AUTOMATION_REPORT_GITHUB_TOKEN before publishing');
  }

  await requestJson(DISPATCH_URL, {
    method: 'POST',
    token,
    body: {
      event_type: 'automation-dashboard-clear',
      client_payload: { clearedAt: new Date().toISOString() }
    }
  });
}

async function runCli() {
  const mode = process.argv[2];
  const fileFlagIndex = process.argv.indexOf('--file');
  const filePath = fileFlagIndex >= 0 ? process.argv[fileFlagIndex + 1] : '';

  if (mode === 'clear') {
    await clearPublishedDashboard();
    console.error('Requested dashboard clear via automation API');
    return;
  }

  if (!filePath) {
    console.error('Usage: publish-automation-api.mjs dashboard --file snapshot.json');
    console.error('       publish-automation-api.mjs work-status --file work-status.json');
    console.error('       publish-automation-api.mjs clear');
    process.exit(1);
  }

  const payload = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (mode === 'work-status') {
    await publishWorkStatus(payload);
    console.error('Published work status to automation API');
    return;
  }

  await publishDashboardSnapshot(payload);
  console.error('Published dashboard snapshot to automation API');
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  runCli().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
