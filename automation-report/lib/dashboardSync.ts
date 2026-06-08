import {
  clearDashboardCache,
  clearDashboardClearedMark,
  isDashboardCleared,
  markDashboardCleared,
  readDashboardCache,
  type StoredDashboard,
  writeDashboardCache
} from './dashboardStorage';
import {
  clearDashboardIndexedDb,
  readDashboardIndexedDb,
  writeDashboardIndexedDb
} from './dashboardIndexedDb';
import { createEmptyStoredDashboard } from './emptyDashboard';
import { getSnapshotRevision, isEmptyDashboardSnapshot } from './dashboardRevision';
import { getAutomationDashboardUrl } from './publicApi';
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

function pickNewerSnapshot(
  localSnapshot: DashboardSnapshot | null,
  indexedSnapshot: DashboardSnapshot | null
): DashboardSnapshot | null {
  if (!localSnapshot) {
    return indexedSnapshot;
  }
  if (!indexedSnapshot) {
    return localSnapshot;
  }

  const localRevision = getSnapshotRevision(localSnapshot);
  const indexedRevision = getSnapshotRevision(indexedSnapshot);
  if (indexedRevision.localeCompare(localRevision) > 0) {
    return indexedSnapshot;
  }
  return localSnapshot;
}

function resolveSource(
  winner: DashboardSnapshot,
  localSnapshot: DashboardSnapshot | null,
  indexedSnapshot: DashboardSnapshot | null
) {
  if (!localSnapshot && !indexedSnapshot) {
    return 'empty';
  }
  if (!localSnapshot) {
    return 'indexedDB';
  }
  if (!indexedSnapshot) {
    return 'localStorage';
  }

  const localRevision = getSnapshotRevision(localSnapshot);
  const indexedRevision = getSnapshotRevision(indexedSnapshot);
  if (localRevision === indexedRevision) {
    return 'localStorage+indexedDB';
  }
  if (winner === indexedSnapshot) {
    return 'indexedDB-synced';
  }
  return 'localStorage-synced';
}

async function persistEverywhere(snapshot: DashboardSnapshot) {
  const stored = snapshot as unknown as StoredDashboard;
  writeDashboardCache(stored);
  await writeDashboardIndexedDb(stored);
}

async function fetchRemoteDashboard(): Promise<DashboardSnapshot | null> {
  try {
    const response = await fetch(getAutomationDashboardUrl(true));
    if (!response.ok) {
      return null;
    }
    return normalizeSnapshot((await response.json()) as DashboardSnapshot);
  } catch {
    return null;
  }
}

export async function syncDashboard(force = false): Promise<DashboardSyncResult> {
  const emptySnapshot = normalizeSnapshot(createEmptyStoredDashboard() as unknown as DashboardSnapshot);

  if (force) {
    clearDashboardClearedMark();
  }

  if (isDashboardCleared() && !force) {
    const cached = readDashboardCache();
    const indexed = await readDashboardIndexedDb();
    const clearedSnapshot = pickNewerSnapshot(
      cached ? cacheToSnapshot(cached) : null,
      indexed ? cacheToSnapshot(indexed) : null
    ) || emptySnapshot;
    return {
      snapshot: clearedSnapshot,
      source: 'cleared',
      health: { status: 'cleared-local', storeVersion: 0 }
    };
  }

  const cached = readDashboardCache();
  const indexed = await readDashboardIndexedDb();
  const remoteSnapshot = await fetchRemoteDashboard();
  const localSnapshot = cached ? cacheToSnapshot(cached) : null;
  const indexedSnapshot = indexed ? cacheToSnapshot(indexed) : null;
  const localWinner = pickNewerSnapshot(localSnapshot, indexedSnapshot);
  const winner = pickNewerSnapshot(localWinner, remoteSnapshot) || emptySnapshot;

  if (!isEmptyDashboardSnapshot(winner) || localSnapshot || indexedSnapshot || remoteSnapshot) {
    await persistEverywhere(winner);
  }

  const source = remoteSnapshot && winner === remoteSnapshot
    ? 'api/automation/dashboard.json'
    : resolveSource(winner, localSnapshot, indexedSnapshot);

  return {
    snapshot: winner,
    source,
    health: { status: remoteSnapshot ? 'api-synced' : 'client-cache', storeVersion: 0 }
  };
}

export async function clearDashboardEverywhere() {
  markDashboardCleared();
  const emptySnapshot = normalizeSnapshot(createEmptyStoredDashboard() as unknown as DashboardSnapshot);
  clearDashboardCache();
  await clearDashboardIndexedDb();
  writeDashboardCache(emptySnapshot as unknown as StoredDashboard);
  await writeDashboardIndexedDb(emptySnapshot as unknown as StoredDashboard);
  return { snapshot: emptySnapshot };
}

export async function pushDashboardSnapshot(snapshot: StoredDashboard | DashboardSnapshot) {
  const normalized = normalizeSnapshot(snapshot as unknown as DashboardSnapshot);
  clearDashboardClearedMark();
  await persistEverywhere(normalized);
  return { snapshot: normalized, source: 'ingest' as const };
}
