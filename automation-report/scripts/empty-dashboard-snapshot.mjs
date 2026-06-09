const PENDING_HOOK_MESSAGE =
  'Waiting for the agent to call window.__AUTOMATION_REPORT__.pushWorkStatus(...) in this browser tab.';

export function createEmptyDashboardSnapshot() {
  const updatedAt = new Date().toISOString();
  return {
    workStatus: {
      status: 'pending',
      title: '',
      message: PENDING_HOOK_MESSAGE,
      source: 'automation-report',
      updatedAt
    },
    automations: [],
    recentEvents: [],
    report: {
      title: 'Report',
      message: 'No external report connected.',
      status: 'pending',
      updatedAt,
      issueCount: 0,
      issues: []
    }
  };
}
