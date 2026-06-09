const REPORT_URL = 'https://thiennp.github.io/report/';

const cursorUserRule = `# Automation report logging (all projects)

Dashboard: ${REPORT_URL}
Storage: localStorage in the browser tab that has ${REPORT_URL} open.

You must log what you are doing on every task, in every workspace, without waiting to be asked.

WHEN TO LOG
- Task start, each meaningful step, blocker, retry, success, and completion
- Before and after running commands, editing files, opening PRs, or browser checks
- Whenever status changes: running, success, warning, blocked, pending, error, info

HOW TO LOG
1. Keep ${REPORT_URL} open in the browser (same profile you automate).
2. After each log-worthy step, paste JSON into the bottom "Log work status" field and click Submit (or press Enter).
3. If you control the browser, fill that field directly instead of asking the user.
4. If the report tab is already open, you may also call window.__AUTOMATION_REPORT__.pushDashboard(payload).

PAYLOAD
Prefer a compact work-status object:
{"status":"running","step":"2.1","phase":"cursor","title":"Short headline","message":"What you are doing now","automationId":"<workspace-folder-name>","runId":"<iso-timestamp>","agentName":"Cursor","source":"automation-report"}

Use the current workspace or repo folder name for automationId (not a hardcoded project path).
Use a new ISO timestamp for runId at task start; keep it stable for the rest of that task.
Add pre, repo, pr, or url fields only when they are known from the current task.

RULES
- Log early and often; do not skip logging because the task feels small.
- Use blocked with a clear next action when stuck.
- Do not require GitHub tokens, repo scripts, or per-project setup.
- This rule applies in every Cursor project.`;

const agentLoggingPrompt = `AUTOMATION REPORT — AGENT LOGGING PROMPT (ANY AGENT, ANY PROJECT)

Dashboard: ${REPORT_URL}
Storage: localStorage in the browser that has ${REPORT_URL} open

You are an automation agent (Cursor, Codex, Claude Code, or similar). Report your work from the browser. No GitHub token, no server API, and no repository-specific scripts are required.

SETUP FOR CURSOR (ALL PROJECTS)
1. Open Cursor Settings → Rules.
2. Paste the "Cursor user rule" block into User Rules (not Project Rules).
3. User Rules apply to every workspace automatically.
4. Keep ${REPORT_URL} open in a browser tab while the agent works.

SETUP FOR OTHER AGENTS
Paste the same logging rule into that agent's global instructions, system prompt, or automation definition.

WHEN TO LOG
- Task start, each step transition, blocker, success, and terminal state
- After meaningful tool use: shell commands, file edits, tests, deploys, browser actions
- Whenever status changes: running, success, warning, blocked, pending, error, info

PREFERRED — BOTTOM JSON INPUT
1. Open ${REPORT_URL} in the browser.
2. Use the always-visible "Log work status" field at the bottom of the page.
3. Paste JSON into the input.
4. Click Submit or press Enter.

Work-status object example:
{"status":"running","step":"2.1","phase":"cursor","title":"Fix failing test","message":"Updating assertion in user service test","automationId":"my-repo","runId":"2026-06-08T12:00:00.000Z","agentName":"Cursor","nextStep":"2.2"}

Full dashboard snapshot example:
{"workStatus":{"status":"running","title":"Fix failing test","message":"Updating assertion in user service test","updatedAt":"2026-06-08T12:00:00.000Z","source":"automation-report"},"automations":[{"automationId":"my-repo","latestRunId":"2026-06-08T12:00:00.000Z","latestStatus":"running","latestUpdateTime":"2026-06-08T12:00:00.000Z","activeBlockerCount":0}],"recentEvents":[{"id":"evt-1","title":"Fix failing test","status":"running","message":"Updating assertion in user service test","stepNumber":"2.1","agentName":"Cursor","createdAt":"2026-06-08T12:00:00.000Z","automationId":"my-repo","runId":"2026-06-08T12:00:00.000Z"}],"report":{"title":"Current report","message":"No external report connected.","status":"pending","updatedAt":"2026-06-08T12:00:00.000Z","issueCount":0,"issues":[]}}

ALTERNATIVE — BROWSER HOOK
With ${REPORT_URL} open:
window.__AUTOMATION_REPORT__.pushDashboard({ /* same JSON as above */ });

IDENTITY FIELDS
- automationId: current workspace or repository folder name
- runId: ISO timestamp at task start
- agentName: Cursor | Codex | Claude | other agent name
- pre / repo / pr / url: include only when known for the active task

SYNC RULES
- Data is stored only in this browser profile's localStorage.
- "Clear report" wipes localStorage for this browser only.
- Activity history is capped at 200 events.

RULES
- Use real status values; mark blockers as blocked with an actionable message.
- Prefer the bottom JSON input when browser automation is available.
- Never limit this workflow to one repository or one project.`;

export default function UsageInstructions() {
  return (
    <section className="panel instructions">
      <div className="panel-head">
        <h2>Agent logging instructions</h2>
        <span className="muted">
          <a href={REPORT_URL}>{REPORT_URL}</a>
        </span>
      </div>

      <div className="instructions_note">
        <h3 className="instructions_subhead">Cursor — always report in every project</h3>
        <ol className="instructions_steps">
          <li>Open <strong>Cursor Settings → Rules</strong>.</li>
          <li>Paste the <strong>Cursor user rule</strong> below into <strong>User Rules</strong> (global), not Project Rules.</li>
          <li>Keep {REPORT_URL} open in a browser tab while the agent runs.</li>
          <li>The agent logs by pasting JSON into the <strong>Log work status</strong> field at the bottom of that page.</li>
        </ol>
      </div>

      <p className="muted instructions_lead">Copy this Cursor user rule into global User Rules:</p>
      <pre className="instructions_code instructions_prompt">
        <code>{cursorUserRule}</code>
      </pre>

      <p className="muted instructions_lead">
        For Codex, Claude Code, or other agents, use the full prompt below in their global instructions:
      </p>
      <pre className="instructions_code instructions_prompt">
        <code>{agentLoggingPrompt}</code>
      </pre>
    </section>
  );
}
