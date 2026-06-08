const REPORT_URL = 'https://thiennp.github.io/report/';

const agentLoggingPrompt = `AUTOMATION REPORT — AGENT LOGGING PROMPT

Dashboard: ${REPORT_URL}
Storage: localStorage in the browser that has ${REPORT_URL} open

You are an automation agent (Codex, Cursor, or similar). Log workflow steps from the report page. No GitHub token or server API is required.

WHEN TO LOG
- Run start, each step transition, blocker, success, and terminal state
- After Jira, PR, or Sentry actions that change current work
- Whenever status changes: running, success, warning, blocked, pending, error, info

PREFERRED — LOG WORK STATUS INPUT AT PAGE BOTTOM
1. Open ${REPORT_URL} in the browser.
2. Scroll to the bottom "Log work status" field (always visible).
3. Paste JSON into the input.
4. Click Submit or press Enter.

Send either a work-status object:
{"status":"running","step":"2.1","phase":"cursor","title":"Fix bug","message":"Applying patch","pre":"PRE-4401","automationId":"my-automation-id","runId":"20260608T120000Z","agentName":"Codex","nextStep":"2.2"}

Or a full dashboard snapshot:
{"workStatus":{"status":"running","title":"Fix bug","message":"Applying patch","updatedAt":"2026-06-08T12:00:00.000Z","source":"automation-report"},"automations":[{"automationId":"my-automation-id","latestRunId":"20260608T120000Z","latestStatus":"running","latestUpdateTime":"2026-06-08T12:00:00.000Z","activeBlockerCount":0}],"recentEvents":[{"id":"evt-1","title":"Fix bug","status":"running","message":"Applying patch","stepNumber":"2.1","agentName":"Codex","createdAt":"2026-06-08T12:00:00.000Z","automationId":"my-automation-id","runId":"20260608T120000Z"}],"report":{"title":"Check24 Sentry Issues","message":"Waiting for the first Sentry refresh.","status":"pending","updatedAt":"2026-06-08T12:00:00.000Z","issueCount":0,"issues":[]}}

If you control the browser, type or paste the JSON into that bottom field directly.

ALTERNATIVE — BROWSER HOOK
With ${REPORT_URL} open:
window.__AUTOMATION_REPORT__.pushDashboard({ /* same snapshot object as above */ });

SYNC RULES
- Data is stored only in this browser profile's localStorage.
- "Clear report" wipes localStorage for this browser only.
- Activity history is capped at 200 events.

RULES
- Use real status values; mark blockers as blocked with an actionable message.
- Include PRE-#### when tied to Jira.
- Prefer the bottom JSON input when browser automation is available.`;

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
        Copy this prompt into Codex automations or Cursor rules. Agents paste JSON into the Log work status field at the bottom of {REPORT_URL}.
      </p>
      <pre className="instructions_code instructions_prompt">
        <code>{agentLoggingPrompt}</code>
      </pre>
    </section>
  );
}
