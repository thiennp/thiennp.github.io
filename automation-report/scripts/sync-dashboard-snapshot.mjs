import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const reportDir = path.resolve(scriptDir, '..', '..', 'report');
const dashboardPath = path.join(reportDir, 'dashboard.json');
const endpoint = new URL(process.env.AUTOMATION_REPORT_DASHBOARD_URL || 'http://127.0.0.1:3120/api/dashboard');

function fetchDashboard() {
  return new Promise((resolve, reject) => {
    const request = http.get(endpoint, (response) => {
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
    request.setTimeout(5000, () => {
      request.destroy(new Error('dashboard request timed out'));
    });
  });
}

fs.mkdirSync(reportDir, { recursive: true });

try {
  const body = await fetchDashboard();
  JSON.parse(body);
  fs.writeFileSync(dashboardPath, `${body.trim()}\n`);
  console.log(`Wrote dashboard snapshot to ${dashboardPath}`);
} catch (error) {
  if (fs.existsSync(dashboardPath)) {
    console.warn(`Dashboard sync skipped: ${error.message}`);
    console.warn(`Keeping existing snapshot at ${dashboardPath}`);
    process.exit(0);
  }
  throw error;
}
