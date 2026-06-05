'use client';

import { useEffect, useMemo, useState } from 'react';

type ReportIssue = {
  id: string;
  shortId?: string;
  title: string;
  status?: string;
  level?: string;
  project?: string;
  culprit?: string;
  issueUrl?: string;
  permalink?: string;
  firstSeen?: string;
  lastSeen?: string;
  count?: number | string;
  userCount?: number | string;
};

type CurrentReport = {
  title: string;
  message: string;
  status: string;
  source?: string;
  url?: string;
  runId?: string;
  updatedAt: string;
  issueCount: number;
  issues: ReportIssue[];
};

type Health = {
  status?: string;
  storePath?: string;
  storeVersion?: number;
  websocket?: { ready: boolean; clients: number };
};

const emptyReport: CurrentReport = {
  title: 'Check24 Sentry Issues',
  message: 'Waiting for the first Sentry refresh.',
  status: 'pending',
  source: 'sentry',
  url: 'https://check24-energie.sentry.io/issues/?project=-1&statsPeriod=24h',
  updatedAt: new Date().toISOString(),
  issueCount: 0,
  issues: []
};

function statusClass(status?: string) {
  const value = (status || '').toLowerCase();
  if (value.includes('fatal') || value.includes('error') || value.includes('critical')) return 'danger';
  if (value.includes('warning') || value.includes('warn') || value.includes('pending')) return 'warn';
  if (value.includes('resolved') || value.includes('success') || value.includes('healthy')) return 'good';
  return 'neutral';
}

function formatDate(value?: string) {
  if (!value) return 'n/a';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function issueHref(issue: ReportIssue) {
  return issue.issueUrl || issue.permalink || '';
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }
  return response.json();
}

export default function Home() {
  const [health, setHealth] = useState<Health>({});
  const [report, setReport] = useState<CurrentReport>(emptyReport);
  const [wsState, setWsState] = useState('connecting');
  const [lastWsEvent, setLastWsEvent] = useState('none');
  const [query, setQuery] = useState('');

  const loadReport = async () => {
    const [healthData, reportData] = await Promise.all([
      fetchJson<Health>('/api/health'),
      fetchJson<{ report: CurrentReport }>('/api/report')
    ]);
    setHealth(healthData);
    setReport(reportData.report || emptyReport);
  };

  useEffect(() => {
    loadReport().catch(() => undefined);
  }, []);

  useEffect(() => {
    let socket: WebSocket | null = null;
    let closed = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
      socket = new WebSocket(`${protocol}://${window.location.host}/ws`);
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
        loadReport().catch(() => undefined);
      };
    };

    connect();
    return () => {
      closed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, []);

  const issues = report.issues || [];
  const filteredIssues = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return issues;
    return issues.filter((issue) => JSON.stringify(issue).toLowerCase().includes(needle));
  }, [issues, query]);

  const unresolvedCount = issues.filter((issue) => {
    const status = String(issue.status || '').toLowerCase();
    return !status.includes('resolved') && !status.includes('archived');
  }).length;

  const latestSeen = issues
    .map((issue) => issue.lastSeen)
    .filter(Boolean)
    .sort()
    .at(-1);

  return (
    <main>
      <header className="topbar">
        <div>
          <p className="eyebrow">{report.source || 'local report'}</p>
          <h1>{report.title}</h1>
          <p className="lead">{report.message}</p>
        </div>
        <div className="status-grid">
          <span className={`pill ${statusClass(report.status)}`}>{report.status || 'unknown'}</span>
          <span className={`pill ${wsState === 'connected' ? 'good' : 'warn'}`}>WS {wsState}</span>
          <span className={`pill ${statusClass(health.status)}`}>{health.status || 'health unknown'}</span>
        </div>
      </header>

      <section className="metrics">
        <div>
          <span>Issues</span>
          <strong>{report.issueCount ?? issues.length}</strong>
        </div>
        <div>
          <span>Unresolved</span>
          <strong>{unresolvedCount}</strong>
        </div>
        <div>
          <span>Latest Seen</span>
          <strong className="metric-time">{formatDate(latestSeen)}</strong>
        </div>
        <div>
          <span>Updated</span>
          <strong className="metric-time">{formatDate(report.updatedAt)}</strong>
        </div>
      </section>

      <section className="toolbar">
        <label>
          Filter
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Project, title, culprit, status..." />
        </label>
        <button onClick={() => loadReport().catch(() => undefined)}>Refresh</button>
        {report.url ? <a className="button-link" href={report.url}>Open Sentry</a> : null}
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Current Issues</h2>
          <span className="muted">{filteredIssues.length} shown</span>
        </div>
        <div className="issue-list">
          {filteredIssues.length === 0 ? <p className="muted">No issues in the current report.</p> : null}
          {filteredIssues.map((issue) => {
            const href = issueHref(issue);
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
                    <span className={`pill ${statusClass(issue.status || report.status)}`}>{issue.status || 'unresolved'}</span>
                    {issue.level ? <span className={`pill ${statusClass(issue.level)}`}>{issue.level}</span> : null}
                  </div>
                </div>
                <div className="issue-meta">
                  {issue.project ? <span>{issue.project}</span> : null}
                  {issue.count !== undefined ? <span>{issue.count} events</span> : null}
                  {issue.userCount !== undefined ? <span>{issue.userCount} users</span> : null}
                  {issue.firstSeen ? <span>First {formatDate(issue.firstSeen)}</span> : null}
                  {issue.lastSeen ? <span>Last {formatDate(issue.lastSeen)}</span> : null}
                  {href ? <a href={href}>View</a> : null}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <footer>
        <span>Store v{health.storeVersion ?? 0}: {health.storePath || 'not loaded'}</span>
        <span>WS clients {health.websocket?.clients ?? 0}; last {lastWsEvent.slice(0, 140)}</span>
      </footer>
    </main>
  );
}
