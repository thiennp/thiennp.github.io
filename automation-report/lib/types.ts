export type Status = 'running' | 'success' | 'warning' | 'error' | 'blocked' | 'pending' | 'info' | string;

export interface ReportEvent {
  id: string;
  stepNumber?: string;
  title: string;
  status: Status;
  message?: string;
  evidence?: unknown;
  nextStep?: string;
  agentName?: string;
  agentRole?: string;
  createdAt: string;
}

export interface ReportItem {
  itemId: string;
  type?: string;
  status?: Status;
  actionability?: string;
  blockReason?: string;
  repo?: string;
  branch?: string;
  filepath?: string;
  packageName?: string;
  advisoryIds?: string[];
  jiraUrl?: string;
  prUrl?: string;
  evidence?: unknown;
  nextAction?: string;
  updatedAt: string;
  [key: string]: unknown;
}

export interface CurrentReportIssue {
  id: string;
  shortId?: string;
  title: string;
  status?: Status;
  level?: string;
  project?: string;
  culprit?: string;
  issueUrl?: string;
  permalink?: string;
  firstSeen?: string;
  lastSeen?: string;
  count?: number | string;
  userCount?: number | string;
  metadata?: unknown;
  [key: string]: unknown;
}

export interface CurrentReport {
  title: string;
  message: string;
  status: Status;
  source?: string;
  url?: string;
  runId?: string;
  updatedAt: string;
  issueCount: number;
  issues: CurrentReportIssue[];
  [key: string]: unknown;
}

export interface ReportRun {
  runId: string;
  automationName?: string;
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
  status: Status;
  mode?: string;
  memorySnapshotPath?: string;
  delegationPlanPath?: string;
  finalSummary?: string;
  links?: Record<string, string>;
  events: ReportEvent[];
  items: Record<string, ReportItem>;
}

export interface AutomationState {
  automationId: string;
  activeRunId?: string;
  latestStatus?: Status;
  currentStepMap?: unknown;
  activeItems?: ReportItem[];
  blockedItems?: ReportItem[];
  waitingPrs?: ReportItem[];
  doneItems?: ReportItem[];
  links?: Record<string, string>;
  lastUpdatedAt: string;
  [key: string]: unknown;
}

export interface AutomationRecord {
  automationId: string;
  state: AutomationState;
  runs: Record<string, ReportRun>;
}

export interface WorkStatus {
  status: Status;
  step?: string;
  phase?: string;
  title: string;
  message: string;
  pre?: string;
  sentryKey?: string;
  sentryIssueId?: string;
  repo?: string;
  pr?: string;
  url?: string;
  source?: string;
  automationId?: string;
  runId?: string;
  agentName?: string;
  agentRole?: string;
  nextStep?: string;
  updatedAt: string;
  [key: string]: unknown;
}

export interface DashboardSnapshot {
  workStatus: WorkStatus;
  automations: Array<{
    automationId: string;
    latestRunId?: string;
    latestStatus?: Status;
    latestUpdateTime?: string;
    activeBlockerCount: number;
  }>;
  recentEvents: Array<ReportEvent & { automationId: string; runId: string }>;
  report: CurrentReport;
}

export interface ReportStore {
  version: number;
  automations: Record<string, AutomationRecord>;
  report?: CurrentReport;
  workStatus?: WorkStatus;
}

export interface WsMessage {
  type: string;
  automationId?: string;
  runId?: string;
  itemId?: string;
  status?: Status;
  version: number;
  createdAt: string;
  payload?: unknown;
}
