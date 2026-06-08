'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  getDashboardUrl,
  getHealthUrl,
  getRuntimeMode,
  getWebSocketUrl,
  type RuntimeMode
} from '../lib/clientRuntime';

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
  agentName?: string;
  agentRole?: string;
  nextStep?: string;
  updatedAt: string;
};

type ReportEvent = {
  id: string;
  stepNumber?: string;
  title: string;
  status?: Status;
  message?: string;
  nextStep?: string;
  agentName?: string;
  createdAt: string;
  automationId: string;
  runId: string;
};

type ReportIssue = {
  id: string;
  shortId?: string;
  title: string;
  status?: string;
  level?: string;
  project?: string;
  culprit?: string;
  issueUrl?: string;
  lastSeen?: string;
};

type CurrentReport = {
  title: string;
  message: string;
  status: string;
  source?: string;
  url?: string;
  updatedAt: string;
  issueCount: number;
  issues: ReportIssue[];
};

type AutomationSummary = {
  automationId: string;
  latestRunId?: string;
  latestStatus?: string;
  latestUpdateTime?: string;
  activeBlockerCount: number;
};

type DashboardSnapshot = {
  workStatus: WorkStatus;
  automations: AutomationSummary[];
  recentEvents: ReportEvent[];
  report: CurrentReport;
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
  message: 'Send a workflow update over HTTP or WebSocket to show what you are working on.',
  source: 'automation-report',
  updatedAt: new Date().toISOString()
};

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

function jiraUrl(pre?: string) {
  if (!pre || !/^PRE-\d+$/i.test(pre)) return '';
  return `https://c24-energie.atlassian.net/browse/${pre.toUpperCase()}`;
}

function prUrl(repo?: string, pr?: string) {
  if (!repo || !pr) return '';
  return `https://bitbucket.org/check24/${repo}/pull-requests/${pr}`;
}

function sentryUrl(issueId?: string) {
  if (!issueId) return '';
  return `https://check24-energie.sentry.io/issues/${issueId}/`;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }
  return response.json();
}

export default function Home() {
  const [runtimeMode, setRuntimeMode] = useState<RuntimeMode>('static');
  const [health, setHealth] = useState<Health>({});
  const [dashboard, setDashboard] = useState<DashboardSnapshot>({
    workStatus: emptyWorkStatus,
    automations: [],
    recentEvents: [],
    report: {
      title: 'Check24 Sentry Issues',
      message: 'Waiting for the first Sentry refresh.',
      status: 'pending',
      updatedAt: new Date().toISOString(),
      issueCount: 0,
      issues: []
    }
  });
  const [wsState, setWsState] = useState('static');
  const [lastWsEvent, setLastWsEvent] = useState('none');
  const [query, setQuery] = useState('');

  const loadDashboard = async (mode = runtimeMode) => {
    const dashboardData = await fetchJson<DashboardSnapshot>(getDashboardUrl(mode));
    setDashboard(dashboardData);

    const healthUrl = getHealthUrl(mode);
    if (healthUrl) {
      const healthData = await fetchJson<Health>(healthUrl);
      setHealth(healthData);
      return;
    }

    setHealth({
      status: 'github-pages',
      storeVersion: 0,
      websocket: { ready: false, clients: 0 }
    });
  };

  useEffect(() => {
    const mode = getRuntimeMode();
    setRuntimeMode(mode);
    setWsState(mode === 'live' ? 'connecting' : 'snapshot');
    loadDashboard(mode).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (runtimeMode !== 'live') {
      const pollTimer = setInterval(() => {
        loadDashboard('static').catch(() => undefined);
      }, 60000);
      return () => clearInterval(pollTimer);
    }

    let socket: WebSocket | null = null;
    let closed = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    const wsUrl = getWebSocketUrl('live');

    const connect = () => {
      if (!wsUrl) {
        return;
      }
      socket = new WebSocket(wsUrl);
      socket.onopen = () => setWsState('connected');
      socket.onclose = () => {
        setWsState('reconnecting');
        if (!closed) {
          reconnectTimer = setTimeout(connect, 1200);
        }
      };
      socket.onerror = () => setWsState('error');
      socket.onmessage = (message) => {
        setLastWsEvent(message.data);
        loadDashboard('live').catch(() => undefined);
      };
    };

    connect();
    return () => {
      closed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, [runtimeMode]);

  const work = dashboard.workStatus || emptyWorkStatus;
  const issues = dashboard.report.issues || [];
  const filteredIssues = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return issues;
    return issues.filter((issue) => JSON.stringify(issue).toLowerCase().includes(needle));
  }, [issues, query]);

  const workLinks = [
    work.url ? { label: 'Evidence', href: work.url } : null,
    work.pre ? { label: work.pre, href: jiraUrl(work.pre) } : null,
    work.repo && work.pr ? { label: `${work.repo} #${work.pr}`, href: prUrl(work.repo, work.pr) } : null,
    work.sentryIssueId ? { label: `Sentry ${work.sentryIssueId}`, href: sentryUrl(work.sentryIssueId) } : null
  ].filter((link): link is { label: string; href: string } => Boolean(link?.href));

  const blockedCount = dashboard.automations.reduce((total, automation) => total + automation.activeBlockerCount, 0);

  return (
    <main>
      <header className="topbar">
        <div>
          <p className="eyebrow">{work.source || 'current work'}</p>
          <h1>{work.title}</h1>
          <p className="lead">{work.message}</p>
        </div>
        <div className="status-grid">
          <span className={`pill ${statusClass(work.status)}`}>{work.status || 'unknown'}</span>
          <span className={`pill ${wsState === 'connected' ? 'good' : 'warn'}`}>
            {runtimeMode === 'live' ? `WS ${wsState}` : 'GitHub Pages snapshot'}
          </span>
          <span className={`pill ${statusClass(health.status)}`}>{health.status || 'health unknown'}</span>
        </div>
      </header>

      <section className="work-hero">
        <div className="work-hero_main">
          <div className="work-hero_meta">
            {work.step ? <span className="pill neutral">Step {work.step}</span> : null}
            {work.phase ? <span className="pill neutral">{work.phase}</span> : null}
            {work.nextStep ? <span className="pill warn">Next {work.nextStep}</span> : null}
            {work.agentName ? <span className="pill neutral">{work.agentName}</span> : null}
          </div>
          <p className="work-hero_target">
            {work.pre || work.sentryKey || (work.repo && work.pr ? `${work.repo} #${work.pr}` : 'No active target yet')}
          </p>
          {work.automationId ? (
            <p className="muted">
              {work.automationId}
              {work.runId ? ` · ${work.runId}` : ''}
            </p>
          ) : null}
        </div>
        <div className="work-hero_links">
          {workLinks.length === 0 ? <span className="muted">No linked evidence yet.</span> : null}
          {workLinks.map((link) => (
            <a key={link.href} className="button-link" href={link.href}>
              {link.label}
            </a>
          ))}
        </div>
      </section>

      <section className="metrics">
        <div>
          <span>Automations</span>
          <strong>{dashboard.automations.length}</strong>
        </div>
        <div>
          <span>Blocked Items</span>
          <strong>{blockedCount}</strong>
        </div>
        <div>
          <span>Recent Events</span>
          <strong>{dashboard.recentEvents.length}</strong>
        </div>
        <div>
          <span>Updated</span>
          <strong className="metric-time">{formatDate(work.updatedAt)}</strong>
        </div>
      </section>

      <section className="toolbar">
        <label>
          Filter Sentry issues
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Project, title, culprit, status..." />
        </label>
        <button onClick={() => loadDashboard().catch(() => undefined)}>Refresh</button>
        {dashboard.report.url ? <a className="button-link" href={dashboard.report.url}>Open Sentry</a> : null}
      </section>

      <section className="dashboard-grid">
        <section className="panel">
          <div className="panel-head">
            <h2>Recent Activity</h2>
            <span className="muted">{dashboard.recentEvents.length} events</span>
          </div>
          <div className="timeline">
            {dashboard.recentEvents.length === 0 ? <p className="muted">No automation events yet.</p> : null}
            {dashboard.recentEvents.map((event) => (
              <article className="timeline-item" key={`${event.automationId}-${event.runId}-${event.id}`}>
                <div className="timeline-item_head">
                  <strong>{event.title}</strong>
                  <span className={`pill ${statusClass(event.status)}`}>{event.status || 'info'}</span>
                </div>
                <p>{event.message || `${event.automationId} · ${event.runId}`}</p>
                <div className="timeline-item_meta">
                  {event.stepNumber ? <span>Step {event.stepNumber}</span> : null}
                  {event.nextStep ? <span>Next {event.nextStep}</span> : null}
                  {event.agentName ? <span>{event.agentName}</span> : null}
                  <span>{formatDate(event.createdAt)}</span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>Automations</h2>
            <span className="muted">{dashboard.automations.length} tracked</span>
          </div>
          <div className="automation-list">
            {dashboard.automations.length === 0 ? <p className="muted">No automations registered yet.</p> : null}
            {dashboard.automations.map((automation) => (
              <article className="automation-card" key={automation.automationId}>
                <div className="automation-card_head">
                  <strong>{automation.automationId}</strong>
                  <span className={`pill ${statusClass(automation.latestStatus)}`}>{automation.latestStatus || 'info'}</span>
                </div>
                <div className="automation-card_meta">
                  {automation.latestRunId ? <span>Run {automation.latestRunId}</span> : null}
                  <span>{automation.activeBlockerCount} blocked</span>
                  <span>{formatDate(automation.latestUpdateTime)}</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Sentry Issues</h2>
          <span className="muted">{filteredIssues.length} shown · {dashboard.report.message}</span>
        </div>
        <div className="issue-list">
          {filteredIssues.length === 0 ? <p className="muted">No issues in the current report.</p> : null}
          {filteredIssues.map((issue) => {
            const href = issue.issueUrl || '';
            return (
              <article className="issue" key={issue.id}>
                <div className="issue-main">
                  <div>
                    <div className="issue-title">
                      <strong>{issue.title}</strong>
                      {issue.shortId ? <span>{issue.shortId}</span> : null}
                    </div>
                    <p>{issue.culprit || issue.project || 'Sentry issue'}</p>
                  </div>
                  <div className="issue-pills">
                    <span className={`pill ${statusClass(issue.status || dashboard.report.status)}`}>{issue.status || 'unresolved'}</span>
                    {issue.level ? <span className={`pill ${statusClass(issue.level)}`}>{issue.level}</span> : null}
                  </div>
                </div>
                <div className="issue-meta">
                  {issue.project ? <span>{issue.project}</span> : null}
                  {issue.lastSeen ? <span>Last {formatDate(issue.lastSeen)}</span> : null}
                  {href ? <a href={href}>View</a> : null}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <footer>
        <span>
          {runtimeMode === 'live'
            ? `Store v${health.storeVersion ?? 0}: ${health.storePath || 'not loaded'}`
            : 'Published snapshot from /report/dashboard.json'}
        </span>
        <span>
          {runtimeMode === 'live'
            ? `WS clients ${health.websocket?.clients ?? 0}; last ${lastWsEvent.slice(0, 140)}`
            : `Snapshot updated ${formatDate(work.updatedAt)}`}
        </span>
      </footer>
    </main>
  );
}
