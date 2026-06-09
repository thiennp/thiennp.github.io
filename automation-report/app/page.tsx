'use client';

import { useEffect, useMemo, useState } from 'react';
import { MAX_RECENT_EVENTS } from '../lib/constants';
import { clearDashboardEverywhere, pushDashboardSnapshot, syncDashboard } from '../lib/dashboardSync';
import { installDashboardIngest } from '../lib/dashboardStorage';
import { createEmptyStoredDashboard } from '../lib/emptyDashboard';
import type { DashboardSnapshot } from '../lib/types';
import { buildSessionRows, filterSessionRows } from '../lib/buildSessionRows';
import AgentUpdatePanel from './AgentUpdatePanel';
import SessionList from './SessionList';
import UsageInstructions from './UsageInstructions';

type Status = string;

type WorkStatus = {
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
  appName?: string;
  agentName?: string;
  agentRole?: string;
  llm?: string;
  modelToken?: string;
  tokensUsed?: number;
  nextStep?: string;
  updatedAt: string;
};

type Health = {
  status?: string;
  storePath?: string;
  storeVersion?: number;
  websocket?: { ready: boolean; clients: number };
};

const emptyWorkStatus: WorkStatus = {
  status: 'pending',
  title: 'Waiting for work status',
  message: 'Paste work-status JSON into the Log work status field at the bottom of this page.',
  source: 'automation-report',
  updatedAt: new Date().toISOString()
};

function createEmptyDashboard(): DashboardSnapshot {
  return createEmptyStoredDashboard() as unknown as DashboardSnapshot;
}

function statusClass(status?: string) {
  const value = (status || '').toLowerCase();
  if (value.includes('fatal') || value.includes('error') || value.includes('critical') || value.includes('blocked')) return 'danger';
  if (value.includes('warning') || value.includes('warn') || value.includes('pending')) return 'warn';
  if (value.includes('resolved') || value.includes('success') || value.includes('healthy') || value.includes('done')) return 'good';
  if (value.includes('running') || value.includes('info')) return 'neutral';
  return 'neutral';
}

function formatDate(value?: string) {
  if (!value) return 'n/a';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function sentryUrl(issueId?: string) {
  if (!issueId) return '';
  return `https://check24-energie.sentry.io/issues/${issueId}/`;
}

export default function Home() {
  const [health, setHealth] = useState<Health>({});
  const [dashboard, setDashboard] = useState<DashboardSnapshot>(createEmptyDashboard());
  const [dataSource, setDataSource] = useState('loading');
  const [query, setQuery] = useState('');
  const [isClearing, setIsClearing] = useState(false);

  const applyDashboard = (dashboardData: DashboardSnapshot, source: string) => {
    setDashboard({
      ...dashboardData,
      recentEvents: dashboardData.recentEvents.slice(0, MAX_RECENT_EVENTS)
    });
    setDataSource(source);
  };

  const loadDashboard = (force = false) => {
    const result = syncDashboard(force);
    applyDashboard(result.snapshot, result.source);
    setHealth(result.health);
  };

  const clearDashboardView = async () => {
    const confirmed = window.confirm(
      'Clear the dashboard? This removes current work, activities, automations, and issues from localStorage in this browser.'
    );
    if (!confirmed) {
      return;
    }

    setIsClearing(true);
    try {
      const result = await clearDashboardEverywhere();
      applyDashboard(result.snapshot, 'cleared');
      setHealth({ status: 'cleared-local', storeVersion: 0 });
    } catch {
      window.alert('Could not clear the dashboard cache in this browser.');
    } finally {
      setIsClearing(false);
    }
  };

  useEffect(() => {
    loadDashboard();

    return installDashboardIngest((snapshot) => {
      const result = pushDashboardSnapshot(snapshot);
      applyDashboard(result.snapshot, result.source);
    });
  }, []);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === 'automation-report-dashboard-v1') {
        loadDashboard();
      }
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const work = dashboard.workStatus || emptyWorkStatus;
  const sessionRows = useMemo(() => buildSessionRows(dashboard), [dashboard]);
  const filteredSessions = useMemo(() => filterSessionRows(sessionRows, query), [sessionRows, query]);
  const blockedCount = dashboard.automations.reduce((total, automation) => total + automation.activeBlockerCount, 0);
  const issueCount = dashboard.report.issues.length;

  return (
    <main>
      <header className="topbar">
        <div>
          <p className="eyebrow">{work.appName || work.agentName || work.source || 'current work'}</p>
          <h1>{work.title}</h1>
          <p className="lead">{work.message}</p>
        </div>
        <div className="status-grid">
          <span className={`pill ${statusClass(work.status)}`}>{work.status || 'unknown'}</span>
          <span className="pill neutral">localStorage</span>
          <span className={`pill ${statusClass(health.status)}`}>{health.status || 'health unknown'}</span>
        </div>
      </header>

      <section className="metrics">
        <div>
          <span>Sessions</span>
          <strong>{sessionRows.length}</strong>
        </div>
        <div>
          <span>Events</span>
          <strong>{dashboard.recentEvents.length}</strong>
        </div>
        <div>
          <span>Blocked</span>
          <strong>{blockedCount}</strong>
        </div>
        <div>
          <span>Sentry issues</span>
          <strong>{issueCount}</strong>
        </div>
      </section>

      <section className="toolbar">
        <label>
          Filter sessions
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Session title, automation, activity, Sentry issue..."
          />
        </label>
        <button onClick={() => loadDashboard(true)}>Refresh</button>
        <button
          className="button-danger"
          disabled={isClearing}
          onClick={() => {
            clearDashboardView().catch(() => undefined);
          }}
        >
          {isClearing ? 'Clearing…' : 'Clear report'}
        </button>
        {dashboard.report.url ? <a className="button-link" href={dashboard.report.url}>Open Sentry</a> : null}
      </section>

      <SessionList
        rows={filteredSessions}
        statusClass={statusClass}
        formatDate={formatDate}
        sentryUrl={sentryUrl}
      />

      <UsageInstructions />

      <AgentUpdatePanel
        dashboard={dashboard}
        onUpdated={(snapshot, source) => {
          applyDashboard(snapshot, source);
          setHealth({ status: 'localStorage', storeVersion: 0 });
        }}
      />

      <footer>
        <span>Storage localStorage · source {dataSource}</span>
        <span>Status {health.status || 'unknown'} · updated {formatDate(work.updatedAt)}</span>
      </footer>
    </main>
  );
}
