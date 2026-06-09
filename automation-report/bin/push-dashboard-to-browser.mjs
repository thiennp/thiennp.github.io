#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const pagesUrl = process.env.AUTOMATION_REPORT_PAGES_URL || 'https://thiennp.github.io/report/';

function readSnapshotFromArgs() {
  const fileFlagIndex = process.argv.indexOf('--file');
  if (fileFlagIndex >= 0) {
    const filePath = process.argv[fileFlagIndex + 1];
    if (!filePath) {
      throw new Error('Missing path after --file');
    }
    return fs.readFileSync(path.resolve(filePath), 'utf8');
  }

  if (!process.stdin.isTTY) {
    return fs.readFileSync(0, 'utf8');
  }

  throw new Error('Provide --file <snapshot.json> or pipe snapshot JSON on stdin');
}

const payload = JSON.parse(readSnapshotFromArgs());
const isWorkStatus =
  payload &&
  typeof payload === 'object' &&
  typeof payload.status === 'string' &&
  typeof payload.message === 'string' &&
  !payload.workStatus;
const scriptPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'pages-ingest.js');
const ingestScript = `(() => {
  const payload = ${JSON.stringify(payload)};
  const bridge = window.__AUTOMATION_REPORT__;
  if (bridge?.pushWorkStatus && ${isWorkStatus ? 'true' : 'false'}) {
    return bridge.pushWorkStatus(payload) ? 'work-status-ingested' : 'work-status-rejected';
  }
  if (bridge?.pushDashboard) {
    bridge.pushDashboard(payload);
    return 'dashboard-ingested';
  }
  localStorage.setItem('automation-report-dashboard-v1', JSON.stringify(payload));
  location.reload();
  return 'stored';
})();`;

fs.writeFileSync(scriptPath, `${ingestScript}\n`);
console.log(`Wrote ${scriptPath}`);
console.log(`Open ${pagesUrl} and run pages-ingest.js in the browser console, or use browser automation to call window.__AUTOMATION_REPORT__.pushWorkStatus(...) / pushDashboard(...) on the report tab.`);

if (process.platform === 'darwin') {
  spawn('open', [pagesUrl], { stdio: 'ignore', detached: true }).unref();
}
