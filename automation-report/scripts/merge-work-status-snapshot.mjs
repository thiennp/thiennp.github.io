import { createEmptyDashboardSnapshot } from './empty-dashboard-snapshot.mjs';

const MAX_RECENT_EVENTS = 200;

export function mergeWorkStatusIntoSnapshot(baseInput, workStatusInput) {
  const base = baseInput || createEmptyDashboardSnapshot();
  const updatedAt = new Date().toISOString();
  const workStatus = {
    ...workStatusInput,
    title: workStatusInput.title || workStatusInput.message,
    updatedAt: workStatusInput.updatedAt || updatedAt
  };

  const automationId = workStatus.automationId || base.workStatus?.automationId || 'manual';
  const runId = workStatus.runId || base.workStatus?.runId || updatedAt.replace(/[:.]/g, '-');

  const event = {
    id: `evt-${updatedAt}`,
    title: workStatus.title,
    status: workStatus.status,
    message: workStatus.message,
    stepNumber: workStatus.step || undefined,
    nextStep: workStatus.nextStep || undefined,
    appName: workStatus.appName || workStatus.agentName || undefined,
    agentName: workStatus.appName || workStatus.agentName || undefined,
    llm: workStatus.llm || undefined,
    modelToken: workStatus.modelToken || undefined,
    tokensUsed: workStatus.tokensUsed || undefined,
    createdAt: updatedAt,
    automationId,
    runId
  };

  const automations = Array.isArray(base.automations) ? [...base.automations] : [];
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

  const recentEvents = [event, ...(Array.isArray(base.recentEvents) ? base.recentEvents : [])].slice(0, MAX_RECENT_EVENTS);

  return {
    ...base,
    workStatus,
    automations,
    recentEvents,
    report: base.report || createEmptyDashboardSnapshot().report
  };
}
