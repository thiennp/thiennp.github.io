import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.resolve(scriptDir, '..');
const outDir = path.join(appDir, 'out');
const reportDir = path.resolve(appDir, '..', 'report');

function copyDirectory(source, destination) {
  fs.mkdirSync(destination, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const sourcePath = path.join(source, entry.name);
    const destinationPath = path.join(destination, entry.name);
    if (entry.isDirectory()) {
      copyDirectory(sourcePath, destinationPath);
      continue;
    }
    fs.copyFileSync(sourcePath, destinationPath);
  }
}

if (!fs.existsSync(outDir)) {
  console.error(`Missing Next export directory: ${outDir}`);
  process.exit(1);
}

const preservedDashboardPath = path.join(reportDir, 'dashboard.json');
const preservedDashboard = fs.existsSync(preservedDashboardPath)
  ? fs.readFileSync(preservedDashboardPath, 'utf8')
  : null;

if (fs.existsSync(reportDir)) {
  for (const entry of fs.readdirSync(reportDir, { withFileTypes: true })) {
    if (entry.name === 'dashboard.json') {
      continue;
    }
    const entryPath = path.join(reportDir, entry.name);
    fs.rmSync(entryPath, { recursive: true, force: true });
  }
} else {
  fs.mkdirSync(reportDir, { recursive: true });
}

copyDirectory(outDir, reportDir);
fs.writeFileSync(path.join(reportDir, '.nojekyll'), '');

const siteNojekyll = path.resolve(appDir, '..', '.nojekyll');
if (!fs.existsSync(siteNojekyll)) {
  fs.writeFileSync(siteNojekyll, '');
}

if (preservedDashboard) {
  fs.writeFileSync(preservedDashboardPath, preservedDashboard);
} else if (!fs.existsSync(preservedDashboardPath)) {
  fs.writeFileSync(preservedDashboardPath, `${JSON.stringify({
    workStatus: {
      status: 'pending',
      title: 'Waiting for work status',
      message: 'Run npm run sync:pages while the local server is running, then rebuild and push.',
      source: 'automation-report',
      updatedAt: new Date().toISOString()
    },
    automations: [],
    recentEvents: [],
    report: {
      title: 'Check24 Sentry Issues',
      message: 'Waiting for the first Sentry refresh.',
      status: 'pending',
      updatedAt: new Date().toISOString(),
      issueCount: 0,
      issues: []
    }
  }, null, 2)}\n`);
}

console.log(`Exported GitHub Pages build to ${reportDir}`);
