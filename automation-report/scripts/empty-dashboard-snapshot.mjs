export function createEmptyDashboardSnapshot() {
  const updatedAt = new Date().toISOString();
  return {
    workStatus: {
      status: 'pending',
      title: 'Waiting for work status',
      message: 'Agents should POST work status to https://thiennp.github.io/api/automation/work-status',
      source: 'automation-report',
      updatedAt
    },
    automations: [],
    recentEvents: [],
    report: {
      title: 'Check24 Sentry Issues',
      message: 'Waiting for the first Sentry refresh.',
      status: 'pending',
      updatedAt,
      issueCount: 0,
      issues: []
    }
  };
}
