import type { DashboardSnapshot, WorkStatus } from './types';
import type { StoredDashboard } from './dashboardStorage';

export function isWorkStatusPayload(value: unknown): value is Pick<WorkStatus, 'status' | 'message'> & Record<string, unknown> {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const record = value as { status?: unknown; message?: unknown };
  return typeof record.status === 'string' && typeof record.message === 'string';
}

export function isDashboardSnapshot(value: unknown): value is DashboardSnapshot {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const record = value as DashboardSnapshot;
  return Boolean(record.workStatus && record.report && Array.isArray(record.automations) && Array.isArray(record.recentEvents));
}

export function toStoredDashboard(snapshot: DashboardSnapshot): StoredDashboard {
  return snapshot as unknown as StoredDashboard;
}
