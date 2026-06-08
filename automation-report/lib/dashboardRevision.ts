import type { DashboardSnapshot } from './types';

export function getSnapshotRevision(snapshot: DashboardSnapshot) {
  const timestamps = [
    snapshot.workStatus?.updatedAt,
    snapshot.report?.updatedAt,
    ...snapshot.recentEvents.map((event) => event.createdAt),
    ...snapshot.automations.map((automation) => automation.latestUpdateTime).filter(Boolean)
  ].filter((value): value is string => Boolean(value));

  if (timestamps.length === 0) {
    return '';
  }

  return timestamps.sort((left, right) => right.localeCompare(left))[0];
}

export function isEmptyDashboardSnapshot(snapshot: DashboardSnapshot) {
  const waitingForWork = snapshot.workStatus?.title === 'Waiting for work status';
  const noAutomations = snapshot.automations.length === 0;
  const noEvents = snapshot.recentEvents.length === 0;
  const noIssues = (snapshot.report?.issueCount ?? 0) === 0;
  return waitingForWork && noAutomations && noEvents && noIssues;
}
