import { PENDING_HOOK_MESSAGE } from './constants';

export function createEmptyStoredDashboard() {
  const updatedAt = new Date().toISOString();
  return {
    workStatus: {
      status: 'pending',
      title: '',
      message: PENDING_HOOK_MESSAGE,
      source: 'automation-report',
      updatedAt
    },
    automations: [] as Array<Record<string, unknown>>,
    recentEvents: [] as Array<Record<string, unknown>>,
    report: {
      title: 'Report',
      message: 'No external report connected.',
      status: 'pending',
      updatedAt,
      issueCount: 0,
      issues: [] as Array<Record<string, unknown>>
    }
  };
}
