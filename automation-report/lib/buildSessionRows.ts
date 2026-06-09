import type { DashboardSnapshot, ReportEvent, Status } from './types';

export type SessionAutomation = {
  automationId: string;
  latestRunId?: string;
  latestStatus?: Status;
  latestUpdateTime?: string;
  activeBlockerCount: number;
};

export type SessionEvent = ReportEvent & {
  automationId: string;
  runId: string;
};

export type SessionRow = {
  id: string;
  automationId: string;
  runId: string;
  title: string;
  message: string;
  status: Status;
  appName?: string;
  llm?: string;
  modelToken?: string;
  updatedAt: string;
  eventCount: number;
  blockedCount: number;
  isCurrent: boolean;
  events: SessionEvent[];
  automation?: SessionAutomation;
};

function sessionKey(automationId: string, runId: string) {
  return `${automationId}::${runId}`;
}

function compareDates(left?: string, right?: string) {
  const leftTime = left ? new Date(left).getTime() : 0;
  const rightTime = right ? new Date(right).getTime() : 0;
  return rightTime - leftTime;
}

export function buildSessionRows(dashboard: DashboardSnapshot): SessionRow[] {
  const work = dashboard.workStatus;
  const currentKey =
    work.automationId && work.runId ? sessionKey(work.automationId, work.runId) : undefined;
  const grouped = new Map<string, SessionEvent[]>();

  for (const event of dashboard.recentEvents) {
    const key = sessionKey(event.automationId, event.runId);
    const bucket = grouped.get(key) || [];
    bucket.push(event);
    grouped.set(key, bucket);
  }

  if (currentKey && !grouped.has(currentKey)) {
    grouped.set(currentKey, []);
  }

  const automationById = new Map(dashboard.automations.map((automation) => [automation.automationId, automation]));
  const rows: SessionRow[] = [];

  for (const [key, events] of grouped.entries()) {
    const separatorIndex = key.indexOf('::');
    const automationId = key.slice(0, separatorIndex);
    const runId = key.slice(separatorIndex + 2);
    const sortedEvents = [...events].sort((left, right) => compareDates(left.createdAt, right.createdAt));
    const latestEvent = sortedEvents[0];
    const isCurrent = key === currentKey;
    const automation = automationById.get(automationId);

    rows.push({
      id: key,
      automationId,
      runId,
      title: isCurrent ? work.title : latestEvent?.title || automationId,
      message: isCurrent ? work.message : latestEvent?.message || 'No activity logged yet.',
      status: isCurrent ? work.status : latestEvent?.status || automation?.latestStatus || 'info',
      appName: isCurrent
        ? work.appName || work.agentName || latestEvent?.appName || latestEvent?.agentName
        : latestEvent?.appName || latestEvent?.agentName,
      llm: isCurrent ? work.llm || latestEvent?.llm : latestEvent?.llm,
      modelToken: isCurrent ? work.modelToken || latestEvent?.modelToken : latestEvent?.modelToken,
      updatedAt: isCurrent
        ? work.updatedAt
        : latestEvent?.createdAt || automation?.latestUpdateTime || work.updatedAt,
      eventCount: sortedEvents.length,
      blockedCount: automation?.activeBlockerCount || 0,
      isCurrent,
      events: sortedEvents,
      automation
    });
  }

  rows.sort((left, right) => {
    if (left.isCurrent !== right.isCurrent) {
      return left.isCurrent ? -1 : 1;
    }
    return compareDates(left.updatedAt, right.updatedAt);
  });

  return rows;
}
