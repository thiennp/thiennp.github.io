const REPORT_URL = 'https://thiennp.github.io/report/';

const agentLoggingPrompt = `AUTOMATION REPORT — AGENT LOGGING PROMPT

Dashboard: ${REPORT_URL}
Storage: localStorage in the browser that has ${REPORT_URL} open

You are an automation agent (Codex, Cursor, or similar). Log every meaningful workflow step from the report page in the browser. No GitHub token, no server API, and no terminal console are required when you can use the page UI.

WHEN TO LOG
- Run start, each step transition, blocker, success, and terminal state
- After Jira, PR, or Sentry actions that change current work
- Whenever status changes: running, success, warning, blocked, pending, error, info

PREFERRED — LOG FROM THE UI
1. Open ${REPORT_URL} in the browser.
2. In the "Agent update" section, click "Log work status".
3. Choose "Work status form".
4. Fill the form:
   - status: running | success | warning | blocked | pending | error | info
   - step: current step id, e.g. 2.1
   - phase: cursor | codex | sentry | jira | verify
   - title: short headline of current work
   - message: one-line description of what you are doing right now
   - pre: Jira key when relevant, e.g. PRE-4401
   - automationId: stable automation name
   - runId: current run id or timestamp
   - agent: Codex | Cursor | other agent name
   - next step: upcoming step id
5. Click "Save to report".

If you control the browser, perform those clicks and field fills directly instead of asking the user to paste console code.

ALTERNATIVE — PASTE FULL SNAPSHOT IN THE UI
1. Open ${REPORT_URL}.
2. Click "Log work status".
3. Choose "Paste full snapshot".
4. Paste complete dashboard JSON.
5. Click "Save snapshot".

ALTERNATIVE — BROWSER HOOK
With ${REPORT_URL} open, you may call:
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

SYNC RULES
- Data is stored only in this browser profile's localStorage.
- "Clear report" wipes localStorage for this browser only.
- Activity history is capped at 200 events.
- "Refresh" reloads from localStorage.

RULES
- Use real status values; mark blockers as blocked with an actionable message.
- Include PRE-#### when tied to Jira.
- Every full snapshot must include workStatus, automations, recentEvents, and report.
- Prefer the UI button flow over console hooks when browser automation is available.`;

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
        Copy this prompt into Codex automations or Cursor rules. Agents should open {REPORT_URL}, click Log work status, and save updates to localStorage from the page UI.
      </p>
      <pre className="instructions_code instructions_prompt">
        <code>{agentLoggingPrompt}</code>
      </pre>
    </section>
  );
}
