import { createEmptyStoredDashboard } from './emptyDashboard';
import { isDashboardSnapshot, isWorkStatusPayload, toStoredDashboard } from './dashboardIngestApi';
import { mergeWorkStatusIntoSnapshot } from './mergeWorkStatusSnapshot';
import type { DashboardSnapshot } from './types';

const STORAGE_KEY = 'automation-report-dashboard-v1';
const CLEARED_FLAG_KEY = 'automation-report-cleared-v1';

export type StoredDashboard = {
  readonly workStatus: {
    readonly status: string;
    readonly title: string;
    readonly message: string;
    readonly updatedAt: string;
    readonly [key: string]: unknown;
  };
  readonly automations: ReadonlyArray<Record<string, unknown>>;
  readonly recentEvents: ReadonlyArray<Record<string, unknown>>;
  readonly report: Record<string, unknown>;
};

export type AutomationReportBridge = {
  pushDashboard: (snapshot: StoredDashboard | DashboardSnapshot) => boolean;
  pushWorkStatus: (workStatus: Record<string, unknown>) => boolean;
  getDashboard: () => StoredDashboard | null;
  ready: boolean;
};

function isStoredDashboard(value: unknown): value is StoredDashboard {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const record = value as Record<string, unknown>;
  return Boolean(record.workStatus && record.report);
}

export function readDashboardCache(): StoredDashboard | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed: unknown = JSON.parse(raw);
    if (isStoredDashboard(parsed)) {
      return parsed;
    }
  } catch {
    return null;
  }
  return null;
}

export function writeDashboardCache(snapshot: StoredDashboard) {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
}

export function isDashboardCleared() {
  if (typeof window === 'undefined') {
    return false;
  }
  return window.localStorage.getItem(CLEARED_FLAG_KEY) === '1';
}

export function markDashboardCleared() {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(CLEARED_FLAG_KEY, '1');
  writeDashboardCache(createEmptyStoredDashboard());
}

export function clearDashboardClearedMark() {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.removeItem(CLEARED_FLAG_KEY);
}

export function clearDashboardCache() {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.removeItem(STORAGE_KEY);
  clearDashboardClearedMark();
}

export function installDashboardIngest(handler: (snapshot: StoredDashboard) => void) {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  const globalTarget = window as Window & {
    __AUTOMATION_REPORT__?: AutomationReportBridge;
  };

  const pushDashboard = (snapshot: StoredDashboard | DashboardSnapshot) => {
    const normalized = isDashboardSnapshot(snapshot) ? toStoredDashboard(snapshot) : snapshot;
    if (!isStoredDashboard(normalized)) {
      return false;
    }
    clearDashboardClearedMark();
    writeDashboardCache(normalized);
    handler(normalized);
    return true;
  };

  const pushWorkStatus = (workStatus: Record<string, unknown>) => {
    if (!isWorkStatusPayload(workStatus)) {
      return false;
    }
    const base = (readDashboardCache() || createEmptyStoredDashboard()) as unknown as DashboardSnapshot;
    const merged = mergeWorkStatusIntoSnapshot(
      base,
      workStatus as Parameters<typeof mergeWorkStatusIntoSnapshot>[1]
    );
    return pushDashboard(toStoredDashboard(merged));
  };

  globalTarget.__AUTOMATION_REPORT__ = {
    pushDashboard,
    pushWorkStatus,
    getDashboard: () => readDashboardCache(),
    ready: true
  };

  const onMessage = (event: MessageEvent) => {
    const data = event.data as { type?: string; payload?: unknown } | null;
    if (data?.type === 'dashboard.update' && isStoredDashboard(data.payload)) {
      pushDashboard(data.payload);
    }
    if (data?.type === 'work-status.update' && isWorkStatusPayload(data.payload)) {
      pushWorkStatus(data.payload as Record<string, unknown>);
    }
  };

  window.addEventListener('message', onMessage);
  return () => {
    window.removeEventListener('message', onMessage);
    if (globalTarget.__AUTOMATION_REPORT__?.pushDashboard === pushDashboard) {
      delete globalTarget.__AUTOMATION_REPORT__;
    }
  };
}
