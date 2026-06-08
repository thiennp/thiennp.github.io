import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.resolve(scriptDir, '..');
const apiDir = path.join(appDir, 'app', 'api');
const apiBackupDir = path.join(appDir, '.api-pages-build-backup');

function restoreApiDir() {
  if (fs.existsSync(apiBackupDir)) {
    if (fs.existsSync(apiDir)) {
      fs.rmSync(apiDir, { recursive: true, force: true });
    }
    fs.renameSync(apiBackupDir, apiDir);
  }
}

try {
  if (fs.existsSync(apiDir)) {
    if (fs.existsSync(apiBackupDir)) {
      fs.rmSync(apiBackupDir, { recursive: true, force: true });
    }
    fs.renameSync(apiDir, apiBackupDir);
  }

  execSync('BUILD_TARGET=github-pages next build', {
    cwd: appDir,
    stdio: 'inherit',
    env: {
      ...process.env,
      BUILD_TARGET: 'github-pages'
    }
  });

  execSync('node scripts/export-to-report-dir.mjs', {
    cwd: appDir,
    stdio: 'inherit'
  });
} finally {
  restoreApiDir();
}
