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

const snapshot = JSON.parse(readSnapshotFromArgs());
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
