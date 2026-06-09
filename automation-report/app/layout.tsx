import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Work Status Dashboard',
  description: 'Live dashboard for agent work status, sessions, and automation activity'
};

const automationReportBridgeScript = `
(() => {
  const STORAGE_KEY = 'automation-report-dashboard-v1';
  const CLEARED_FLAG_KEY = 'automation-report-cleared-v1';
  const MAX_RECENT_EVENTS = 200;
  const PENDING_MESSAGE = 'Waiting for the agent to call window.__AUTOMATION_REPORT__.pushWorkStatus(...) in this browser tab.';

  const emptyDashboard = () => {
    const updatedAt = new Date().toISOString();
    return {
      workStatus: {
        status: 'pending',
        title: '',
        message: PENDING_MESSAGE,
        source: 'automation-report',
        updatedAt
      },
      automations: [],
      recentEvents: [],
      report: {
        title: 'Report',
        message: 'No external report connected.',
        status: 'pending',
        updatedAt,
        issueCount: 0,
        issues: []
      }
    };
  };

  const isDashboard = (value) =>
    Boolean(value && typeof value === 'object' && value.workStatus && value.report);

  const isWorkStatus = (value) =>
    Boolean(value && typeof value === 'object' && typeof value.status === 'string' && typeof value.message === 'string');

  const readDashboard = () => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return isDashboard(parsed) ? parsed : null;
    } catch {
      return null;
    }
  };

  const writeDashboard = (snapshot) => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    window.dispatchEvent(new CustomEvent('automation-report:updated'));
  };

  const normalizeSnapshot = (snapshot) => ({
    ...snapshot,
    automations: snapshot.automations || [],
    recentEvents: snapshot.recentEvents || [],
    report: snapshot.report || emptyDashboard().report,
    workStatus: snapshot.workStatus || emptyDashboard().workStatus
  });

  const resolveAppName = (workStatus) => {
    const value = workStatus.appName || workStatus.app || workStatus.agentName || workStatus.agent;
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const known = {
      antigravity: 'Antigravity',
      'claude code': 'Claude',
      claude: 'Claude',
      codex: 'Codex',
      cursor: 'Cursor'
    };
    return known[trimmed.toLowerCase()] || trimmed;
  };

  const numericToken = (value) => {
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0) return Math.round(value);
    if (typeof value === 'string' && /^\\d+$/.test(value.trim())) return Number(value.trim());
    return undefined;
  };

  const text = (value, maxLength = 120) => {
    if (value == null) return undefined;
    const normalized = String(value).replace(/\\s+/g, ' ').trim();
    return normalized ? normalized.slice(0, maxLength) : undefined;
  };

  const resolveModelFields = (workStatus) => {
    const llm = text(workStatus.llm || workStatus.model || workStatus.modelName);
    const explicitModelToken = text(workStatus.modelToken);
    const tokenValue = workStatus.token;
    const tokenText = typeof tokenValue === 'string' && !/^\\d+$/.test(tokenValue.trim()) ? text(tokenValue) : undefined;
    const modelToken = explicitModelToken || tokenText;
    const tokensUsed = numericToken(workStatus.tokensUsed ?? workStatus.tokenUsed ?? workStatus.tokens);
    const tokenCount = numericToken(tokenValue);
    return {
      ...(llm || modelToken ? { llm: llm || modelToken } : {}),
      ...(modelToken ? { modelToken } : {}),
      ...(tokensUsed ?? tokenCount ? { tokensUsed: tokensUsed ?? tokenCount } : {})
    };
  };

  const mergeWorkStatus = (baseInput, workStatusInput) => {
    const base = normalizeSnapshot(baseInput || emptyDashboard());
    const updatedAt = new Date().toISOString();
    const appName = resolveAppName(workStatusInput);
    const modelFields = resolveModelFields(workStatusInput);
    const workStatus = {
      ...workStatusInput,
      title: workStatusInput.title || workStatusInput.message,
      updatedAt: workStatusInput.updatedAt || updatedAt,
      ...(appName ? { appName, agentName: appName } : {}),
      ...modelFields
    };
    const automationId = workStatus.automationId || base.workStatus?.automationId || 'manual';
    const runId = workStatus.runId || base.workStatus?.runId || updatedAt.replace(/[:.]/g, '-');
    const event = {
      id: \`evt-\${updatedAt}\`,
      title: workStatus.title,
      status: workStatus.status,
      message: workStatus.message,
      stepNumber: workStatus.step,
      nextStep: workStatus.nextStep,
      appName: workStatus.appName || workStatus.agentName,
      agentName: workStatus.appName || workStatus.agentName,
      llm: workStatus.llm,
      modelToken: workStatus.modelToken,
      tokensUsed: workStatus.tokensUsed,
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
    return {
      ...base,
      workStatus,
      automations,
      recentEvents: [event, ...base.recentEvents].slice(0, MAX_RECENT_EVENTS),
      report: base.report
    };
  };

  const pushDashboard = (snapshot) => {
    if (!isDashboard(snapshot)) return false;
    window.localStorage.removeItem(CLEARED_FLAG_KEY);
    writeDashboard(normalizeSnapshot(snapshot));
    return true;
  };

  const pushWorkStatus = (workStatus) => {
    if (!isWorkStatus(workStatus)) return false;
    return pushDashboard(mergeWorkStatus(readDashboard(), workStatus));
  };

  const onMessage = (event) => {
    const data = event.data;
    if (data?.type === 'dashboard.update') pushDashboard(data.payload);
    if (data?.type === 'work-status.update') pushWorkStatus(data.payload);
  };

  window.__AUTOMATION_REPORT__ = {
    pushDashboard,
    pushWorkStatus,
    getDashboard: readDashboard,
    ready: true
  };
  window.addEventListener('message', onMessage);
  window.dispatchEvent(new CustomEvent('automation-report:ready'));
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <script dangerouslySetInnerHTML={{ __html: automationReportBridgeScript }} />
        {children}
      </body>
    </html>
  );
}
