import type { CurrentReportIssue, DashboardSnapshot, ReportEvent, Status } from './types';

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
  issueCount: number;
  isCurrent: boolean;
  events: SessionEvent[];
  automation?: SessionAutomation;
  issues: CurrentReportIssue[];
};

function sessionKey(automationId: string, runId: string) {
  return `${automationId}::${runId}`;
}

function compareDates(left?: string, right?: string) {
  const leftTime = left ? new Date(left).getTime() : 0;
  const rightTime = right ? new Date(right).getTime() : 0;
  return rightTime - leftTime;
}

function collectSentryRefs(events: SessionEvent[], workStatus: DashboardSnapshot['workStatus'], isCurrent: boolean) {
  const refs = new Set<string>();
  if (isCurrent && workStatus.sentryIssueId) {
    refs.add(workStatus.sentryIssueId);
  }
  if (isCurrent && workStatus.sentryKey) {
    refs.add(workStatus.sentryKey.toLowerCase());
  }
  if (isCurrent && workStatus.pre) {
    refs.add(workStatus.pre.toLowerCase());
  }
  return refs;
}

function issueMatchesSession(issue: CurrentReportIssue, refs: Set<string>) {
  if (refs.has(issue.id)) {
    return true;
  }
  if (issue.shortId && refs.has(issue.shortId.toLowerCase())) {
    return true;
  }
  const haystack = `${issue.title} ${issue.culprit || ''} ${issue.project || ''}`.toLowerCase();
  for (const ref of refs) {
    if (ref.length >= 4 && haystack.includes(ref)) {
      return true;
    }
  }
  return false;
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
  const assignedIssueIds = new Set<string>();
  const rows: SessionRow[] = [];

  for (const [key, events] of grouped.entries()) {
    const separatorIndex = key.indexOf('::');
    const automationId = key.slice(0, separatorIndex);
    const runId = key.slice(separatorIndex + 2);
    const sortedEvents = [...events].sort((left, right) => compareDates(left.createdAt, right.createdAt));
    const latestEvent = sortedEvents[0];
    const isCurrent = key === currentKey;
    const automation = automationById.get(automationId);
    const refs = collectSentryRefs(sortedEvents, work, isCurrent);
    const issues = dashboard.report.issues.filter((issue) => {
      if (assignedIssueIds.has(issue.id)) {
        return false;
      }
      if (!issueMatchesSession(issue, refs)) {
        return false;
      }
      assignedIssueIds.add(issue.id);
      return true;
    });

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
      issueCount: issues.length,
      isCurrent,
      events: sortedEvents,
      automation,
      issues
    });
  }

  const orphanIssues = dashboard.report.issues.filter((issue) => !assignedIssueIds.has(issue.id));
  if (orphanIssues.length > 0) {
    const fallbackRow = rows.find((row) => row.isCurrent) || rows[0];
    if (fallbackRow) {
      fallbackRow.issues = [...fallbackRow.issues, ...orphanIssues];
      fallbackRow.issueCount = fallbackRow.issues.length;
    } else {
      rows.push({
        id: 'sentry-report',
        automationId: 'sentry',
        runId: dashboard.report.updatedAt || 'report',
        title: dashboard.report.title || 'Sentry issues',
        message: dashboard.report.message || 'Sentry report snapshot',
        status: dashboard.report.status || 'info',
        updatedAt: dashboard.report.updatedAt,
        eventCount: 0,
        blockedCount: 0,
        issueCount: orphanIssues.length,
        isCurrent: false,
        events: [],
        issues: orphanIssues
      });
    }
  }

  rows.sort((left, right) => {
    if (left.isCurrent !== right.isCurrent) {
      return left.isCurrent ? -1 : 1;
    }
    return compareDates(left.updatedAt, right.updatedAt);
  });

  return rows;
}

export function filterSessionRows(rows: SessionRow[], query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return rows;
  }

  return rows.filter((row) => {
    const searchable = [
      row.title,
      row.message,
      row.automationId,
      row.runId,
      row.appName,
      row.llm,
      row.modelToken,
      row.automation?.latestStatus,
      ...row.events.map((event) => `${event.title} ${event.message || ''}`),
      ...row.issues.map((issue) => `${issue.title} ${issue.culprit || ''} ${issue.project || ''} ${issue.shortId || ''}`)
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return searchable.includes(needle);
  });
}
