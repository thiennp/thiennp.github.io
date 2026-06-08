#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createEmptyDashboardSnapshot } from '../scripts/empty-dashboard-snapshot.mjs';
import { mergeWorkStatusIntoSnapshot } from '../scripts/merge-work-status-snapshot.mjs';
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
  if (argument === '--inject') {
    continue;
  }
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
    if (key === 'file' || key === 'out') {
      continue;
    }
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
  console.error('Optional: --file snapshot.json --out snapshot.json --inject');
  process.exit(1);
}

function readBaseSnapshot() {
  const fileFlagIndex = process.argv.indexOf('--file');
  if (fileFlagIndex >= 0) {
    const filePath = process.argv[fileFlagIndex + 1];
    if (!filePath) {
      throw new Error('Missing path after --file');
    }
    return JSON.parse(fs.readFileSync(path.resolve(filePath), 'utf8'));
  }

  if (!process.stdin.isTTY) {
    return JSON.parse(fs.readFileSync(0, 'utf8'));
  }

  return null;
}

const updatedAt = new Date().toISOString();
const workStatus = {
  ...options,
  title: options.title || options.message,
  updatedAt
};

const base = readBaseSnapshot() || createEmptyDashboardSnapshot();
const snapshot = mergeWorkStatusIntoSnapshot(base, workStatus);

const outFlagIndex = process.argv.indexOf('--out');
const outPath = outFlagIndex >= 0 ? process.argv[outFlagIndex + 1] : '';
const shouldInject = process.argv.includes('--inject');
const serialized = `${JSON.stringify(snapshot, null, 2)}\n`;
const targetPath = outPath ? path.resolve(outPath) : path.join(process.cwd(), 'automation-report-snapshot.json');

if (outPath || shouldInject) {
  fs.writeFileSync(targetPath, serialized);
  if (outPath) {
    console.error(`Wrote ${targetPath}`);
  }
} else if (!process.stdin.isTTY || process.argv.includes('--file')) {
  process.stdout.write(serialized);
}

if (shouldInject) {
  const pushScript = path.join(path.dirname(fileURLToPath(import.meta.url)), 'push-dashboard-to-browser.mjs');
  const result = spawnSync(process.execPath, [pushScript, '--file', targetPath], { stdio: 'inherit' });
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

console.error(`work status prepared: ${workStatus.step || 'step'} ${workStatus.status}`);
