#!/usr/bin/env node
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const pagesUrl = process.env.AUTOMATION_REPORT_PAGES_URL || 'https://thiennp.github.io/report/';
const dashboardUrl = new URL(process.env.AUTOMATION_REPORT_DASHBOARD_URL || 'http://127.0.0.1:3120/api/dashboard');

function fetchDashboard() {
  return new Promise((resolve, reject) => {
    const request = http.get(dashboardUrl, (response) => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => {
        body += chunk;
      });
      response.on('end', () => {
        if (response.statusCode < 200 || response.statusCode >= 300) {
          reject(new Error(`HTTP ${response.statusCode} ${body}`));
          return;
        }
        resolve(body);
      });
    });
    request.on('error', reject);
  });
}

const snapshot = JSON.parse(await fetchDashboard());
const scriptPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'pages-ingest.js');
const ingestScript = `(() => {
  const snapshot = ${JSON.stringify(snapshot)};
  if (window.__AUTOMATION_REPORT__?.pushDashboard) {
    window.__AUTOMATION_REPORT__.pushDashboard(snapshot);
    return 'ingested';
  }
  localStorage.setItem('automation-report-dashboard-v1', JSON.stringify(snapshot));
  location.reload();
  return 'stored';
})();`;

fs.writeFileSync(scriptPath, `${ingestScript}\n`);
console.log(`Wrote ${scriptPath}`);
console.log(`Open ${pagesUrl} and paste pages-ingest.js into the browser console.`);

if (process.platform === 'darwin') {
  spawn('open', [pagesUrl], { stdio: 'ignore', detached: true }).unref();
}
