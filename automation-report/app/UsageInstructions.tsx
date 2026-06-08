import {
  AUTOMATION_DASHBOARD_URL,
  AUTOMATION_REPOSITORY_DISPATCH_URL,
  AUTOMATION_WORK_STATUS_URL
} from '../lib/publicApi';

const REPORT_URL = 'https://thiennp.github.io/report/';

const agentLoggingPrompt = `AUTOMATION REPORT — AGENT LOGGING PROMPT

Dashboard UI: ${REPORT_URL}
Read API: GET ${AUTOMATION_DASHBOARD_URL}
Work status route: ${AUTOMATION_WORK_STATUS_URL}
Write API: POST ${AUTOMATION_REPOSITORY_DISPATCH_URL}

You are an automation agent (Codex, Cursor, or similar). Log every meaningful workflow step with an HTTP request. The report UI polls ${AUTOMATION_DASHBOARD_URL} and mirrors it into browser storage.

WHEN TO LOG
- At run start, each step transition, blocker, success, and terminal state.
- After Jira/PR/Sentry actions that change current work.
- When status changes: running, success, warning, blocked, pending.

PREFERRED — CLI PUBLISH
node automation-report/bin/send-work-status.mjs \\
  --publish \\
  --status running \\
  --step 2.1 \\
  --phase cursor \\
  --title "Short headline of current work" \\
  --automationId my-automation-id \\
  --runId 20260608T120000Z \\
  --agentName Codex \\
  "One-line message describing what you are doing right now."

Requires GITHUB_TOKEN or AUTOMATION_REPORT_GITHUB_TOKEN with repo scope.

HTTP — POST WORK STATUS
curl -X POST '${AUTOMATION_REPOSITORY_DISPATCH_URL}' \\
  -H 'Accept: application/vnd.github+json' \\
  -H 'Authorization: Bearer $GITHUB_TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "event_type": "automation-work-status",
    "client_payload": {
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
  }'

After ingest, the published snapshot is served from ${AUTOMATION_DASHBOARD_URL}.

HTTP — REPLACE FULL DASHBOARD
curl -X POST '${AUTOMATION_REPOSITORY_DISPATCH_URL}' \\
  -H 'Accept: application/vnd.github+json' \\
  -H 'Authorization: Bearer $GITHUB_TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "event_type": "automation-dashboard",
    "client_payload": {
      "snapshot": {
        "workStatus": { "status": "running", "title": "...", "message": "...", "updatedAt": "2026-06-08T12:00:00.000Z" },
        "automations": [],
        "recentEvents": [],
        "report": { "title": "Check24 Sentry Issues", "message": "...", "status": "pending", "updatedAt": "2026-06-08T12:00:00.000Z", "issueCount": 0, "issues": [] }
      }
    }
  }'

RULES
- Use real status values; mark blockers as blocked with an actionable message.
- Include PRE-#### when tied to Jira.
- Activity history is capped at 200 events.
- Every full snapshot must include workStatus, automations, recentEvents, and report.`;

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
        Copy this prompt into Codex automations or Cursor rules. Agents publish work status with HTTP POST requests; the UI reads{' '}
        {AUTOMATION_DASHBOARD_URL}.
      </p>
      <pre className="instructions_code instructions_prompt">
        <code>{agentLoggingPrompt}</code>
      </pre>
    </section>
  );
}
