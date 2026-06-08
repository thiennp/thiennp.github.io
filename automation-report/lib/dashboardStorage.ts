const STORAGE_KEY = 'automation-report-dashboard-v1';

export type StoredDashboard = {
  readonly workStatus: {
    readonly status: string;
    readonly title: string;
    readonly message: string;
    readonly updatedAt: string;
    readonly [key: string]: unknown;
  };
  readonly automations: ReadonlyArray<Record<string, unknown>>;
  readonly recentEvents: ReadonlyArray<Record<string, unknown>>;
  readonly report: Record<string, unknown>;
};

function isStoredDashboard(value: unknown): value is StoredDashboard {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const record = value as Record<string, unknown>;
  return Boolean(record.workStatus && record.report);
}

export function readDashboardCache(): StoredDashboard | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed: unknown = JSON.parse(raw);
    if (isStoredDashboard(parsed)) {
      return parsed;
    }
  } catch {
    return null;
  }
  return null;
}

export function writeDashboardCache(snapshot: StoredDashboard) {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
}

export function installDashboardIngest(handler: (snapshot: StoredDashboard) => void) {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  const globalTarget = window as Window & {
    __AUTOMATION_REPORT__?: {
      pushDashboard?: (snapshot: StoredDashboard) => void;
    };
  };

  const pushDashboard = (snapshot: StoredDashboard) => {
    if (!isStoredDashboard(snapshot)) {
      return;
    }
    writeDashboardCache(snapshot);
    handler(snapshot);
  };

  globalTarget.__AUTOMATION_REPORT__ = {
    ...globalTarget.__AUTOMATION_REPORT__,
    pushDashboard
  };

  const onMessage = (event: MessageEvent) => {
    const data = event.data as { type?: string; payload?: unknown } | null;
    if (data?.type === 'dashboard.update' && isStoredDashboard(data.payload)) {
      pushDashboard(data.payload);
    }
  };

  window.addEventListener('message', onMessage);
  return () => {
    window.removeEventListener('message', onMessage);
    if (globalTarget.__AUTOMATION_REPORT__?.pushDashboard === pushDashboard) {
      delete globalTarget.__AUTOMATION_REPORT__?.pushDashboard;
    }
  };
}
