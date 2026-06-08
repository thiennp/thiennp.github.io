const REPORT_URL = 'https://thiennp.github.io/report/';
const SNAPSHOT_URL = 'https://thiennp.github.io/report/dashboard.json';

const agentLoggingPrompt = `AUTOMATION REPORT — AGENT LOGGING PROMPT

Public dashboard: ${REPORT_URL}
Published snapshot: ${SNAPSHOT_URL}

You are an automation agent (Codex, Cursor, or similar). Log every meaningful workflow step so this dashboard shows what you are doing. Humans read ${REPORT_URL}; you write through the local Automation Report API, then publish when the public snapshot should change.

WHEN TO LOG
- At run start, each step transition, blocker, success, and terminal state.
- After Jira/PR/Sentry actions that change current work.
- When status changes: running, success, warning, blocked, pending.

BEFORE WRITING
1. Ensure the local server is up:
   cd automation-report && ./scripts/ensure-automation-report-server.sh
2. Local write endpoints (not exposed on GitHub Pages):
   - HTTP work status: http://127.0.0.1:3120/api/work-status
   - WebSocket ingest: ws://127.0.0.1:3120/ws
   - Dashboard read/clear: http://127.0.0.1:3120/api/dashboard

PREFERRED — LOG CURRENT WORK (run each step)
node bin/send-work-status.mjs \\
  --status running \\
  --step "2.1" \\
  --phase cursor \\
  --title "Short headline of current work" \\
  --pre PRE-4401 \\
  --automationId "my-automation-id" \\
  --runId "20260608T120000Z" \\
  --agentName "Codex" \\
  --nextStep "2.2" \\
  "One-line message describing what you are doing right now."

ALTERNATIVE — WEBSOCKET MESSAGE
Send to ws://127.0.0.1:3120/ws after connect:
{
  "type": "work-status.update",
  "payload": {
    "status": "running",
    "step": "2.1",
    "phase": "cursor",
    "title": "Short headline of current work",
    "message": "One-line message describing what you are doing right now.",
    "pre": "PRE-4401",
    "automationId": "my-automation-id",
    "runId": "20260608T120000Z",
    "agentName": "Codex",
    "nextStep": "2.2"
  }
}

OPTIONAL — APPEND ACTIVITY EVENT
curl -fsS -X POST http://127.0.0.1:3120/api/automations/{automationId}/runs/{runId}/events \\
  -H 'Content-Type: application/json' \\
  -d '{
    "stepNumber": "2.1",
    "title": "Step title",
    "status": "running",
    "message": "What happened in this step.",
    "nextStep": "2.2",
    "agentName": "Codex"
  }'

PUBLISH TO ${REPORT_URL}
After material updates, sync the public snapshot:
cd automation-report && npm run deploy:pages
git add report/ && git commit -m "Sync automation report snapshot" && git push origin master

CLEAR DASHBOARD
DELETE http://127.0.0.1:3120/api/dashboard
Then redeploy if the public snapshot should reset.

RULES
- Use real status values; mark blockers as blocked with an actionable message.
- Include PRE-#### when tied to Jira.
- Activity history is capped at 200 events; older entries are trimmed automatically.
- Do not treat ${REPORT_URL} as a write target; GitHub Pages is read-only except via deploy:pages.`;

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
        Copy this prompt into Codex automations, Cursor rules, or runbooks so agents log actions to the dashboard.
      </p>
      <pre className="instructions_code instructions_prompt">
        <code>{agentLoggingPrompt}</code>
      </pre>
    </section>
  );
}
