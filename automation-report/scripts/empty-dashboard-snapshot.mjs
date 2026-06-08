export function createEmptyDashboardSnapshot() {
  const updatedAt = new Date().toISOString();
  return {
    workStatus: {
      status: 'pending',
      title: 'Waiting for work status',
      message: 'Paste work-status JSON into the Log work status field at https://thiennp.github.io/report/.',
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
