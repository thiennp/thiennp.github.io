'use client';

import { useEffect, useMemo, useState } from 'react';
import { MAX_RECENT_EVENTS } from '../lib/constants';
import { clearDashboardEverywhere, pushDashboardSnapshot, syncDashboard } from '../lib/dashboardSync';
import { installDashboardIngest } from '../lib/dashboardStorage';
import { createEmptyStoredDashboard } from '../lib/emptyDashboard';
import type { DashboardSnapshot } from '../lib/types';
import AgentUpdatePanel from './AgentUpdatePanel';
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

type Health = {
  status?: string;
  storePath?: string;
  storeVersion?: number;
  websocket?: { ready: boolean; clients: number };
};

const emptyWorkStatus: WorkStatus = {
  status: 'pending',
  title: 'Waiting for work status',
  message: 'Open this page and click Log work status to record agent activity.',
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
          <span className="pill neutral">localStorage</span>
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

      <AgentUpdatePanel
        dashboard={dashboard}
        onUpdated={(snapshot, source) => {
          applyDashboard(snapshot, source);
          setHealth({ status: 'localStorage', storeVersion: 0 });
        }}
      />

      <section className="toolbar">
        <label>
          Filter Sentry issues
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Project, title, culprit, status..." />
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

      <section className="dashboard-grid">
        <section className="panel">
          <div className="panel-head">
            <h2>Recent Activity</h2>
            <span className="muted">
              {dashboard.recentEvents.length} events · max {MAX_RECENT_EVENTS}
            </span>
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

      <UsageInstructions />

      <footer>
        <span>Storage localStorage · source {dataSource}</span>
        <span>Status {health.status || 'unknown'} · updated {formatDate(work.updatedAt)}</span>
      </footer>
    </main>
  );
}
