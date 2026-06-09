import { PENDING_HOOK_MESSAGE } from './constants';
import type { DashboardSnapshot } from './types';

function isDefaultEmptyWorkStatus(workStatus: DashboardSnapshot['workStatus'] | undefined) {
  if (!workStatus) {
    return true;
  }

  const legacyEmptyTitle = workStatus.title === 'Waiting for work status';
  const message = workStatus.message?.trim() || '';
  const defaultEmptyWorkStatus =
    workStatus.status === 'pending' &&
    workStatus.source === 'automation-report' &&
    !workStatus.title?.trim() &&
    (!message || message === PENDING_HOOK_MESSAGE);

  return legacyEmptyTitle || defaultEmptyWorkStatus;
}

export function isEmptyDashboardSnapshot(snapshot: DashboardSnapshot) {
  const waitingForWork = isDefaultEmptyWorkStatus(snapshot.workStatus);
  const noAutomations = snapshot.automations.length === 0;
  const noEvents = snapshot.recentEvents.length === 0;
  const noIssues = (snapshot.report?.issueCount ?? 0) === 0;
  return waitingForWork && noAutomations && noEvents && noIssues;
}
