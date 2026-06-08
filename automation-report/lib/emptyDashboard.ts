export function createEmptyStoredDashboard() {
  const updatedAt = new Date().toISOString();
  return {
    workStatus: {
      status: 'pending',
      title: 'Waiting for work status',
      message: 'Paste work-status JSON into the Log work status field at the bottom of this page.',
      source: 'automation-report',
      updatedAt
    },
    automations: [] as Array<Record<string, unknown>>,
    recentEvents: [] as Array<Record<string, unknown>>,
    report: {
      title: 'Check24 Sentry Issues',
      message: 'Waiting for the first Sentry refresh.',
      status: 'pending',
      updatedAt,
      issueCount: 0,
      issues: [] as Array<Record<string, unknown>>
    }
  };
}
