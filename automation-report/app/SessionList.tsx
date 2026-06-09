'use client';

import { useState } from 'react';
import type { SessionRow } from '../lib/buildSessionRows';

type SessionListProps = {
  readonly rows: SessionRow[];
  readonly statusClass: (status?: string) => string;
  readonly formatDate: (value?: string) => string;
};

export default function SessionList({ rows, statusClass, formatDate }: SessionListProps) {
  const defaultExpandedId = rows.find((row) => row.isCurrent)?.id || rows[0]?.id;
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set(defaultExpandedId ? [defaultExpandedId] : []));

  const toggleSession = (sessionId: string) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(sessionId)) {
        next.delete(sessionId);
      } else {
        next.add(sessionId);
      }
      return next;
    });
  };

  if (rows.length === 0) {
    return (
      <section className="panel session-list">
        <p className="muted">No sessions yet.</p>
      </section>
    );
  }

  return (
    <section className="panel session-list">
      <div className="panel-head">
        <h2>Sessions</h2>
        <span className="muted">{rows.length} sessions</span>
      </div>

      <div className="session-rows">
        {rows.map((row) => {
          const isExpanded = expandedIds.has(row.id);
          return (
            <article className={`session-row ${isExpanded ? 'session-row___expanded' : ''}`} key={row.id}>
              <button className="session-row_summary" type="button" onClick={() => toggleSession(row.id)}>
                <span className="session-row_chevron" aria-hidden="true">
                  {isExpanded ? '▾' : '▸'}
                </span>
                <span className="session-row_main">
                  <span className="session-row_title">
                    <strong>{row.title}</strong>
                    {row.isCurrent ? <span className="pill neutral">Current</span> : null}
                  </span>
                  <span className="session-row_subtitle muted">
                    {row.appName ? `${row.appName} · ` : ''}
                    {row.automationId} · {row.runId}
                  </span>
                  <span className="session-row_message">{row.message}</span>
                </span>
                <span className="session-row_aside">
                  <span className={`pill ${statusClass(row.status)}`}>{row.status || 'info'}</span>
                  <span className="session-row_counts muted">
                    {row.eventCount} events · {row.blockedCount} blocked
                  </span>
                  <span className="session-row_time muted">{formatDate(row.updatedAt)}</span>
                </span>
              </button>

              {isExpanded ? (
                <div className="session-row_body">
                  <section className="session-section">
                    <h3>Session</h3>
                    <div className="session-meta">
                      {row.llm ? <span className="pill neutral">{row.llm}</span> : null}
                      {row.modelToken ? <span className="pill neutral">{row.modelToken}</span> : null}
                      {row.automation?.latestRunId ? <span>Run {row.automation.latestRunId}</span> : null}
                      {row.automation ? <span>{row.automation.activeBlockerCount} blocked</span> : null}
                      <span>Updated {formatDate(row.updatedAt)}</span>
                    </div>
                  </section>

                  <section className="session-section">
                    <h3>Activity</h3>
                    {row.events.length === 0 ? <p className="muted">No activity events in this session yet.</p> : null}
                    <div className="timeline">
                      {row.events.map((event) => (
                        <article className="timeline-item" key={`${event.automationId}-${event.runId}-${event.id}`}>
                          <div className="timeline-item_head">
                            <strong>{event.title}</strong>
                            <span className={`pill ${statusClass(event.status)}`}>{event.status || 'info'}</span>
                          </div>
                          <p>{event.message || `${event.automationId} · ${event.runId}`}</p>
                          <div className="timeline-item_meta">
                            {event.stepNumber ? <span>Step {event.stepNumber}</span> : null}
                            {event.nextStep ? <span>Next {event.nextStep}</span> : null}
                            {event.appName || event.agentName ? <span>{event.appName || event.agentName}</span> : null}
                            {event.llm ? <span>{event.llm}</span> : null}
                            {event.modelToken ? <span>{event.modelToken}</span> : null}
                            {typeof event.tokensUsed === 'number' ? (
                              <span>{event.tokensUsed.toLocaleString()} tokens</span>
                            ) : null}
                            <span>{formatDate(event.createdAt)}</span>
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>

                  {row.automation ? (
                    <section className="session-section">
                      <h3>Automation</h3>
                      <article className="automation-card">
                        <div className="automation-card_head">
                          <strong>{row.automation.automationId}</strong>
                          <span className={`pill ${statusClass(row.automation.latestStatus)}`}>
                            {row.automation.latestStatus || 'info'}
                          </span>
                        </div>
                        <div className="automation-card_meta">
                          {row.automation.latestRunId ? <span>Run {row.automation.latestRunId}</span> : null}
                          <span>{row.automation.activeBlockerCount} blocked</span>
                          <span>{formatDate(row.automation.latestUpdateTime)}</span>
                        </div>
                      </article>
                    </section>
                  ) : null}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
