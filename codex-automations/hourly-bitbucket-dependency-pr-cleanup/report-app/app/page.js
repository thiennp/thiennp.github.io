import { getReportData } from "../lib/report-data";

export const dynamic = "force-dynamic";

function LinkPill({ href, children }) {
  if (!href) {
    return <span className="link-pill link-pill--muted">{children}</span>;
  }

  return (
    <a className="link-pill" href={href} target="_blank" rel="noreferrer">
      {children}
    </a>
  );
}

function ListBlock({ title, items, emptyText = "None" }) {
  return (
    <section className="list-block">
      <h3>{title}</h3>
      {items?.length ? (
        <ul>
          {items.map((item) => (
            <li key={`${title}-${item}`}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="muted">{emptyText}</p>
      )}
    </section>
  );
}

function JiraPanel({ jira }) {
  return (
    <section className="jira-panel">
      <div className="jira-panel__head">
        <h3>Jira</h3>
        <span className="jira-keys">
          {(jira.keys || []).length ? jira.keys.join(", ") : "No ticket key inferred"}
        </span>
      </div>
      {jira.found?.length ? (
        jira.found.map((issue) => (
          <article className="jira-card" key={issue.issue_key}>
            <div className="jira-card__title-row">
              <strong>{issue.issue_key}</strong>
              <span>{issue.status || "Unknown status"}</span>
            </div>
            <p className="jira-card__title">{issue.title}</p>
            <p className="jira-card__meta">
              {issue.issue_type || "Unknown type"} · {issue.project || "Unknown project"} ·{" "}
              {issue.assignee || "Unassigned"}
            </p>
            <p className="jira-card__excerpt">{issue.description_excerpt || "No Jira description."}</p>
            <LinkPill href={issue.page_url}>Open Jira</LinkPill>
          </article>
        ))
      ) : (
        <p className="muted">No Jira export attached yet.</p>
      )}
      {jira.missing_keys?.length ? (
        <p className="missing-note">Missing Jira exports: {jira.missing_keys.join(", ")}</p>
      ) : null}
    </section>
  );
}

function ApprovedPullRequestCard({ item }) {
  const pr = item.pr;
  const ui = item.ui || {};

  return (
    <details className={`pr-card pr-card--approved pr-card--${ui.workflowStatus || "approved"}`} open={!ui.isCollapsedByDefault}>
      <summary className="pr-card__summary pr-card__summary--approved">
        <div className="pr-card__header pr-card__header--approved">
          <div>
            <h2>{pr.title}</h2>
            <p className="pr-card__compact-meta">
              {pr.repo} #{pr.id} · {pr.author || "Unknown"} · {pr.source_branch || "?"} → {pr.destination_branch || "?"}
            </p>
          </div>
          <span className="status-pill status-pill--approved">approved</span>
        </div>
      </summary>
      <div className="pr-card__content">
        <div className="pr-card__meta-grid">
          <div>
            <span className="meta-label">Author</span>
            <strong>{pr.author || "Unknown"}</strong>
          </div>
          <div>
            <span className="meta-label">Branches</span>
            <strong>
              {pr.source_branch || "?"} → {pr.destination_branch || "?"}
            </strong>
          </div>
          <div>
            <span className="meta-label">Queue / Updated</span>
            <strong>
              {pr.queue_age || "?"} / {pr.last_updated_at || "?"}
            </strong>
          </div>
          <div>
            <span className="meta-label">Review Surface</span>
            <div className="pill-row">
              <LinkPill href={pr.link}>PR</LinkPill>
              <LinkPill href={pr.review_surface?.diff_link}>Diff</LinkPill>
              <LinkPill href={pr.review_surface?.commits_link}>Commits</LinkPill>
            </div>
          </div>
        </div>
      </div>
    </details>
  );
}

function PullRequestCard({ item }) {
  const pr = item.pr;
  const signals = item.review_signals || {};
  const summaries = item.summaries || {};
  const context = item.agent_context || {};
  const ui = item.ui || {};

  if (ui.workflowStatus === "approved") {
    return <ApprovedPullRequestCard item={item} />;
  }

  return (
    <details className={`pr-card pr-card--${ui.workflowStatus || "will-check"}`} open={!ui.isCollapsedByDefault}>
      <summary className="pr-card__summary">
        <div className="pr-card__header">
          <div>
            <h2>{pr.title}</h2>
            <p className="pr-card__compact-meta">
              {pr.repo} #{pr.id} · {pr.author || "Unknown"} · {pr.source_branch || "?"} → {pr.destination_branch || "?"}
            </p>
          </div>
          <span className={`status-pill status-pill--${(ui.workflowStatus || "will-check").replace(/\s+/g, "-")}`}>
            {ui.workflowStatus || "will check"}
          </span>
        </div>
      </summary>

      <div className="pr-card__content">
        <div className="pr-card__meta-grid">
          <div>
            <span className="meta-label">Author</span>
            <strong>{pr.author || "Unknown"}</strong>
          </div>
          <div>
            <span className="meta-label">Branches</span>
            <strong>
              {pr.source_branch || "?"} → {pr.destination_branch || "?"}
            </strong>
          </div>
          <div>
            <span className="meta-label">Queue / Updated</span>
            <strong>
              {pr.queue_age || "?"} / {pr.last_updated_at || "?"}
            </strong>
          </div>
          <div>
            <span className="meta-label">Review Surface</span>
            <div className="pill-row">
              <LinkPill href={pr.link}>PR</LinkPill>
              <LinkPill href={pr.review_surface?.diff_link}>Diff</LinkPill>
              <LinkPill href={pr.review_surface?.commits_link}>Commits</LinkPill>
            </div>
          </div>
        </div>

        <div className="signal-strip">
          <span>{signals.files_changed_count || 0} files</span>
          <span>{signals.commits_count || 0} commits</span>
          <span>{signals.comment_count || 0} comments</span>
          <span>{signals.reviewers_count || 0} reviewers</span>
          <span>{signals.checks_summary ?? "?"} checks</span>
          <span>{signals.jira_work_items_count || 0} Jira refs</span>
        </div>

        <div className="pr-card__body">
          <section className="summary-panel">
            <h3>PR Summary</h3>
            <p>{summaries.pr_description_excerpt || "No PR description available."}</p>
          </section>
          <section className="summary-panel summary-panel--activity">
            <h3>Activity Snapshot</h3>
            <pre>{summaries.pr_activity_excerpt || "No activity snapshot available."}</pre>
          </section>
        </div>

        <div className="pr-card__bottom">
          <ListBlock title="Recommended Focus" items={context.recommended_focus} emptyText="No special focus items." />
          <ListBlock title="Data Gaps" items={context.data_gaps} emptyText="No known data gaps." />
          <JiraPanel jira={item.jira || { keys: [], found: [], missing_keys: [] }} />
        </div>
      </div>
    </details>
  );
}

export default async function Page() {
  const report = await getReportData();
  const pullRequests = report.pull_requests || [];

  return (
    <main className="report-shell">
      <section className="cards-stack">
        {pullRequests.map((item) => (
          <PullRequestCard key={item.handoff_id} item={item} />
        ))}
      </section>
    </main>
  );
}
