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

if (fs.existsSync(reportDir)) {
  fs.rmSync(reportDir, { recursive: true, force: true });
}

fs.mkdirSync(reportDir, { recursive: true });
copyDirectory(outDir, reportDir);
fs.writeFileSync(path.join(reportDir, '.nojekyll'), '');

const siteNojekyll = path.resolve(appDir, '..', '.nojekyll');
if (!fs.existsSync(siteNojekyll)) {
  fs.writeFileSync(siteNojekyll, '');
}

console.log(`Exported GitHub Pages build to ${reportDir}`);
