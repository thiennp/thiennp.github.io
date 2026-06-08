#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createEmptyDashboardSnapshot } from './empty-dashboard-snapshot.mjs';
import { mergeWorkStatusIntoSnapshot } from './merge-work-status-snapshot.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const dashboardPath = path.join(repoRoot, 'api', 'automation', 'dashboard.json');

function readCurrentDashboard() {
  if (!fs.existsSync(dashboardPath)) {
    return createEmptyDashboardSnapshot();
  }
  return JSON.parse(fs.readFileSync(dashboardPath, 'utf8'));
}

function writeDashboard(snapshot) {
  fs.mkdirSync(path.dirname(dashboardPath), { recursive: true });
  fs.writeFileSync(dashboardPath, `${JSON.stringify(snapshot, null, 2)}\n`);
}

function readEventPayload() {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath || !fs.existsSync(eventPath)) {
    throw new Error('GITHUB_EVENT_PATH is required');
  }
  const event = JSON.parse(fs.readFileSync(eventPath, 'utf8'));
  return {
    action: event.action,
    payload: event.client_payload || {}
  };
}

const { action, payload } = readEventPayload();
const current = readCurrentDashboard();

if (action === 'automation-dashboard-clear') {
  writeDashboard(createEmptyDashboardSnapshot());
  console.log('Cleared automation dashboard API snapshot');
} else if (action === 'automation-dashboard') {
  const snapshot = payload.snapshot || payload;
  writeDashboard(snapshot);
  console.log('Replaced automation dashboard API snapshot');
} else if (action === 'automation-work-status') {
  const snapshot = mergeWorkStatusIntoSnapshot(current, payload);
  writeDashboard(snapshot);
  console.log(`Merged work status: ${payload.status || 'unknown'}`);
} else {
  throw new Error(`Unsupported repository_dispatch action: ${action}`);
}
