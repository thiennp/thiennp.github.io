'use client';

import { useEffect, useMemo, useState } from 'react';
import { MAX_RECENT_EVENTS } from '../lib/constants';
import { clearDashboardEverywhere, pushDashboardSnapshot, syncDashboard } from '../lib/dashboardSync';
import { installDashboardIngest } from '../lib/dashboardStorage';
import { createEmptyStoredDashboard } from '../lib/emptyDashboard';
import { PENDING_HOOK_MESSAGE } from '../lib/constants';
import type { DashboardSnapshot } from '../lib/types';
import { buildSessionRows } from '../lib/buildSessionRows';
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

const emptyWorkStatus: WorkStatus = {
  status: 'pending',
  title: '',
  message: PENDING_HOOK_MESSAGE,
  source: 'automation-report',
  updatedAt: ''
};

function createEmptyDashboard(): DashboardSnapshot {
  const empty = createEmptyStoredDashboard() as unknown as DashboardSnapshot;
  return {
    ...empty,
    workStatus: emptyWorkStatus,
    report: {
      ...empty.report,
      updatedAt: ''
    }
  };
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

export default function Home() {
  const [dashboard, setDashboard] = useState<DashboardSnapshot>(createEmptyDashboard());
  const [dataSource, setDataSource] = useState('loading');
  const [isClearing, setIsClearing] = useState(false);
  const [hookReady, setHookReady] = useState(false);

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
  };

  const clearDashboardView = async () => {
    const confirmed = window.confirm(
      'Clear the dashboard? This removes current work, sessions, and activity from localStorage in this browser.'
    );
    if (!confirmed) {
      return;
    }

    setIsClearing(true);
    try {
      const result = await clearDashboardEverywhere();
      applyDashboard(result.snapshot, 'cleared');
    } catch {
      window.alert('Could not clear the dashboard cache in this browser.');
    } finally {
      setIsClearing(false);
    }
  };

  useEffect(() => {
    loadDashboard();

    const cleanup = installDashboardIngest((snapshot) => {
      const result = pushDashboardSnapshot(snapshot);
      applyDashboard(result.snapshot, result.source);
    });
    setHookReady(Boolean((window as Window & { __AUTOMATION_REPORT__?: { ready?: boolean } }).__AUTOMATION_REPORT__?.ready));

    return cleanup;
  }, []);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === 'automation-report-dashboard-v1') {
        loadDashboard();
      }
    };
    const onBridgeUpdate = () => {
      loadDashboard();
      setHookReady(Boolean((window as Window & { __AUTOMATION_REPORT__?: { ready?: boolean } }).__AUTOMATION_REPORT__?.ready));
    };

    window.addEventListener('storage', onStorage);
    window.addEventListener('automation-report:updated', onBridgeUpdate);
    window.addEventListener('automation-report:ready', onBridgeUpdate);
    const pollDashboard = window.setInterval(() => {
      loadDashboard();
    }, 1000);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('automation-report:updated', onBridgeUpdate);
      window.removeEventListener('automation-report:ready', onBridgeUpdate);
      window.clearInterval(pollDashboard);
    };
  }, []);

  const work = dashboard.workStatus || emptyWorkStatus;
  const sessionRows = useMemo(() => buildSessionRows(dashboard), [dashboard]);
  const blockedCount = dashboard.automations.reduce((total, automation) => total + automation.activeBlockerCount, 0);

  return (
    <main>
      <header className="topbar">
        <div>
          {work.appName || work.agentName || work.title ? (
            <p className="eyebrow">{work.appName || work.agentName || work.source || 'current work'}</p>
          ) : null}
          {work.title ? <h1>{work.title}</h1> : null}
          {work.message ? <p className="lead">{work.message}</p> : null}
        </div>
        <div className="status-grid">
          <span className={`pill ${statusClass(work.status)}`} title="Current work status">
            {work.status || 'unknown'}
          </span>
          <span className={`pill ${hookReady ? 'good' : 'warn'}`} title="Browser hook on this tab">
            {hookReady ? 'hook ready' : 'hook loading'}
          </span>
          <span className="pill neutral" title="Data is stored in this browser only">
            browser storage
          </span>
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
      </section>

      <section className="toolbar">
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
      </section>

      <SessionList rows={sessionRows} statusClass={statusClass} formatDate={formatDate} />

      <UsageInstructions />

      <footer>
        <span>
          Agent hook {hookReady ? 'ready' : 'loading'} ·{' '}
          <code>window.__AUTOMATION_REPORT__.pushWorkStatus(...)</code>
        </span>
        <span>
          localStorage · source {dataSource} · updated {formatDate(work.updatedAt)}
        </span>
      </footer>
    </main>
  );
}
