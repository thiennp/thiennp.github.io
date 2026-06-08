import { MAX_RECENT_EVENTS } from './constants';
import { createEmptyStoredDashboard } from './emptyDashboard';
import type { DashboardSnapshot, WorkStatus } from './types';

export function mergeWorkStatusIntoSnapshot(
  baseInput: DashboardSnapshot | null,
  workStatusInput: Partial<WorkStatus> & Pick<WorkStatus, 'status' | 'message'>
): DashboardSnapshot {
  const base = baseInput || (createEmptyStoredDashboard() as unknown as DashboardSnapshot);
  const updatedAt = new Date().toISOString();
  const workStatus: WorkStatus = {
    ...workStatusInput,
    title: workStatusInput.title || workStatusInput.message,
    updatedAt: workStatusInput.updatedAt || updatedAt
  } as WorkStatus;

  const automationId = workStatus.automationId || base.workStatus?.automationId || 'manual';
  const runId = workStatus.runId || base.workStatus?.runId || updatedAt.replace(/[:.]/g, '-');

  const event = {
    id: `evt-${updatedAt}`,
    title: workStatus.title,
    status: workStatus.status,
    message: workStatus.message,
    stepNumber: workStatus.step,
    nextStep: workStatus.nextStep,
    agentName: workStatus.agentName,
    createdAt: updatedAt,
    automationId,
    runId
  };

  const automations = [...base.automations];
  const existingAutomationIndex = automations.findIndex((item) => item.automationId === automationId);
  const automationSummary = {
    automationId,
    latestRunId: runId,
    latestStatus: workStatus.status,
    latestUpdateTime: updatedAt,
    activeBlockerCount: workStatus.status === 'blocked' ? 1 : 0
  };

  if (existingAutomationIndex >= 0) {
    automations[existingAutomationIndex] = {
      ...automations[existingAutomationIndex],
      ...automationSummary,
      activeBlockerCount:
        workStatus.status === 'blocked'
          ? (automations[existingAutomationIndex].activeBlockerCount || 0) + 1
          : automations[existingAutomationIndex].activeBlockerCount || 0
    };
  } else {
    automations.unshift(automationSummary);
  }

  const recentEvents = [event, ...base.recentEvents].slice(0, MAX_RECENT_EVENTS);

  return {
    ...base,
    workStatus,
    automations,
    recentEvents,
    report: base.report
  };
}
