import {
  clearDashboardCache,
  clearDashboardClearedMark,
  isDashboardCleared,
  markDashboardCleared,
  readDashboardCache,
  type StoredDashboard,
  writeDashboardCache
} from './dashboardStorage';
import { createEmptyStoredDashboard } from './emptyDashboard';
import { isEmptyDashboardSnapshot } from './dashboardRevision';
import type { DashboardSnapshot } from './types';

type HealthResponse = {
  status?: string;
  storeVersion?: number;
};

export type DashboardSyncResult = {
  snapshot: DashboardSnapshot;
  source: string;
  health: HealthResponse;
};

function normalizeSnapshot(snapshot: DashboardSnapshot): DashboardSnapshot {
  return {
    ...snapshot,
    automations: snapshot.automations || [],
    recentEvents: snapshot.recentEvents || [],
    report: snapshot.report || (createEmptyStoredDashboard().report as DashboardSnapshot['report']),
    workStatus: snapshot.workStatus || (createEmptyStoredDashboard().workStatus as DashboardSnapshot['workStatus'])
  };
}

function cacheToSnapshot(cache: StoredDashboard): DashboardSnapshot {
  return normalizeSnapshot(cache as unknown as DashboardSnapshot);
}

function persistSnapshot(snapshot: DashboardSnapshot) {
  writeDashboardCache(snapshot as unknown as StoredDashboard);
}

export function syncDashboard(force = false): DashboardSyncResult {
  const emptySnapshot = normalizeSnapshot(createEmptyStoredDashboard() as unknown as DashboardSnapshot);

  if (force) {
    clearDashboardClearedMark();
  }

  if (isDashboardCleared() && !force) {
    const cached = readDashboardCache();
    return {
      snapshot: cached ? cacheToSnapshot(cached) : emptySnapshot,
      source: 'cleared',
      health: { status: 'cleared-local', storeVersion: 0 }
    };
  }

  const cached = readDashboardCache();
  const snapshot = cached ? cacheToSnapshot(cached) : emptySnapshot;

  if (!isEmptyDashboardSnapshot(snapshot) || cached) {
    persistSnapshot(snapshot);
  }

  return {
    snapshot,
    source: cached ? 'localStorage' : 'empty',
    health: { status: 'localStorage', storeVersion: 0 }
  };
}

export function clearDashboardEverywhere() {
  markDashboardCleared();
  const emptySnapshot = normalizeSnapshot(createEmptyStoredDashboard() as unknown as DashboardSnapshot);
  clearDashboardCache();
  writeDashboardCache(emptySnapshot as unknown as StoredDashboard);
  return { snapshot: emptySnapshot };
}

export function pushDashboardSnapshot(snapshot: StoredDashboard | DashboardSnapshot) {
  const normalized = normalizeSnapshot(snapshot as unknown as DashboardSnapshot);
  clearDashboardClearedMark();
  persistSnapshot(normalized);
  return { snapshot: normalized, source: 'ingest' as const };
}
