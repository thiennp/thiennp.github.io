const REPORT_URL = 'https://thiennp.github.io/report/';

const agentLoggingPrompt = `AUTOMATION REPORT — AGENT LOGGING PROMPT

Public dashboard UI: ${REPORT_URL}
Storage: IndexedDB (primary) + localStorage (mirror) in the browser viewing ${REPORT_URL}
Do not use dashboard.json, GitHub Pages APIs, or any http://127.0.0.1 endpoint.

You are an automation agent (Codex, Cursor, or similar). Log every meaningful workflow step so ${REPORT_URL} shows current work. Push a dashboard snapshot into the open report tab. The page keeps IndexedDB and localStorage in sync automatically.

WHEN TO LOG
- At run start, each step transition, blocker, success, and terminal state.
- After Jira/PR/Sentry actions that change current work.
- When status changes: running, success, warning, blocked, pending.

PREFERRED — PUSH A DASHBOARD SNAPSHOT
Open ${REPORT_URL} in the browser, then run this in the page console or via pages-ingest.js:
window.__AUTOMATION_REPORT__.pushDashboard({
  workStatus: {
    status: "running",
    step: "2.1",
    phase: "cursor",
    title: "Short headline of current work",
    message: "One-line message describing what you are doing right now.",
    pre: "PRE-4401",
    automationId: "my-automation-id",
    runId: "20260608T120000Z",
    agentName: "Codex",
    nextStep: "2.2",
    updatedAt: new Date().toISOString(),
    source: "automation-report"
  },
  automations: [{
    automationId: "my-automation-id",
    latestRunId: "20260608T120000Z",
    latestStatus: "running",
    latestUpdateTime: new Date().toISOString(),
    activeBlockerCount: 0
  }],
  recentEvents: [{
    id: "evt-1",
    title: "Step title",
    status: "running",
    message: "What happened in this step.",
    stepNumber: "2.1",
    nextStep: "2.2",
    agentName: "Codex",
    createdAt: new Date().toISOString(),
    automationId: "my-automation-id",
    runId: "20260608T120000Z"
  }],
  report: {
    title: "Check24 Sentry Issues",
    message: "Waiting for the first Sentry refresh.",
    status: "pending",
    updatedAt: new Date().toISOString(),
    issueCount: 0,
    issues: []
  }
});

ALTERNATIVE — POSTMESSAGE FROM ANOTHER TAB
window.postMessage({
  type: "dashboard.update",
  payload: { /* same snapshot object as above */ }
}, "*");

CLI HELPER — WRITE SNAPSHOT FILE AND INJECT
1. Save the snapshot JSON to /tmp/automation-report-snapshot.json
2. Run:
   node bin/push-dashboard-to-browser.mjs --file /tmp/automation-report-snapshot.json
3. Paste the generated pages-ingest.js into the open ${REPORT_URL} console if auto-open fails.

SYNC RULES
- IndexedDB is the durable cache; localStorage mirrors it for fast reloads.
- If one store is newer, the page copies it into the other on load.
- Activity history is capped at 200 events.
- Clear report wipes both browser stores in this tab/browser profile.

RULES
- Use real status values; mark blockers as blocked with an actionable message.
- Include PRE-#### when tied to Jira.
- Every push must include workStatus, automations, recentEvents, and report.`;

export default function UsageInstructions() {
  return (
    <section className="panel instructions">
      <div className="panel-head">
        <h2>Agent logging prompt</h2>
        <span className="muted">
          <a href={REPORT_URL}>{REPORT_URL}</a>
        </span>
      </div>
      <p className="muted instructions_lead">
        Copy this prompt into Codex automations or Cursor rules. Agents push snapshots into the browser cache for{' '}
        {REPORT_URL}; no local server is required.
      </p>
      <pre className="instructions_code instructions_prompt">
        <code>{agentLoggingPrompt}</code>
      </pre>
    </section>
  );
}
