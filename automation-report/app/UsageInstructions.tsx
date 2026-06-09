import CopyableBlock from './CopyableBlock';

const REPORT_URL = 'https://thiennp.github.io/report/';

const workStatusExample =
  '{"status":"running","step":"2.1","phase":"cursor","title":"Fix failing test","message":"Updating assertion in user service test","appName":"Cursor","llm":"Claude 4.5 Sonnet","modelToken":"claude-4.5-sonnet","tokensUsed":12400,"automationId":"my-repo","runId":"2026-06-08T12:00:00.000Z","nextStep":"2.2"}';

const fullSnapshotExample =
  '{"workStatus":{"status":"running","title":"Fix failing test","message":"Updating assertion in user service test","appName":"Cursor","llm":"Claude 4.5 Sonnet","modelToken":"claude-4.5-sonnet","tokensUsed":12400,"updatedAt":"2026-06-08T12:00:00.000Z","source":"automation-report"},"automations":[{"automationId":"my-repo","latestRunId":"2026-06-08T12:00:00.000Z","latestStatus":"running","latestUpdateTime":"2026-06-08T12:00:00.000Z","activeBlockerCount":0}],"recentEvents":[{"id":"evt-1","title":"Fix failing test","status":"running","message":"Updating assertion in user service test","stepNumber":"2.1","appName":"Cursor","llm":"Claude 4.5 Sonnet","modelToken":"claude-4.5-sonnet","tokensUsed":12400,"createdAt":"2026-06-08T12:00:00.000Z","automationId":"my-repo","runId":"2026-06-08T12:00:00.000Z"}],"report":{"title":"Current report","message":"No external report connected.","status":"pending","updatedAt":"2026-06-08T12:00:00.000Z","issueCount":0,"issues":[]}}';

const appNameGuide = `appName values:
- Cursor
- Codex
- Claude
- Other agent app name if different

Every log must include appName.
agentName is also accepted as an alias, but prefer appName.`;

const llmGuide = `LLM and token fields (required on every log):

llm — human-readable model name you are running on
  Examples: Claude 4.5 Sonnet, GPT-5.4, Composer 2.5, Gemini 3 Flash

modelToken — model slug / token id from the agent UI (not an API secret)
  Examples: claude-4.5-sonnet, gpt-5.4, composer-2.5-fast

tokensUsed — optional number of tokens consumed for this step if known

Aliases accepted:
- model or modelName → llm
- token → modelToken when it is a model slug string; token count when it is a number
- tokenUsed or tokens → tokensUsed

Never log API keys, bearer tokens, or other secrets.`;

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
${workStatusExample}

Required fields:
- appName: Cursor | Codex | Claude | your agent app name
- llm: human-readable model name (e.g. Claude 4.5 Sonnet, GPT-5.4)
- modelToken: model slug from the agent UI (e.g. claude-4.5-sonnet) — not an API secret

Also include:
- tokensUsed: token count for this step when known
- automationId: current workspace or repository folder name
- runId: ISO timestamp at task start, kept stable for that task
- pre, repo, pr, or url only when known for the active task

RULES
- Log early and often; do not skip logging because the task feels small.
- Always include appName, llm, and modelToken so the dashboard shows which agent and model produced the update.
- Use blocked with a clear next action when stuck.
- Never log API keys or secret bearer tokens.
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
${workStatusExample}

Full dashboard snapshot example:
${fullSnapshotExample}

IDENTITY FIELDS
- appName: required — Cursor | Codex | Claude | other agent app name
- llm: required — human-readable model name (Claude 4.5 Sonnet, GPT-5.4, Composer 2.5, …)
- modelToken: required — model slug from the agent UI (claude-4.5-sonnet, gpt-5.4, …); not an API secret
- tokensUsed: optional — token count for this step when known
- automationId: current workspace or repository folder name
- runId: ISO timestamp at task start
- agentName: optional alias for appName
- pre / repo / pr / url: include only when known for the active task

SYNC RULES
- Data is stored only in this browser profile's localStorage.
- "Clear report" wipes localStorage for this browser only.
- Activity history is capped at 200 events.

RULES
- Use real status values; mark blockers as blocked with an actionable message.
- Always include appName, llm, and modelToken on every log.
- Never log API keys or secret bearer tokens.
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
          <li>
            The agent logs by pasting JSON with <strong>appName</strong>, <strong>llm</strong>, and{' '}
            <strong>modelToken</strong> into the <strong>Log work status</strong> field at the bottom of that page.
          </li>
        </ol>
      </div>

      <CopyableBlock label="Cursor user rule — paste into global User Rules" text={cursorUserRule} />

      <CopyableBlock label="appName values — include on every log" text={appNameGuide} compact />

      <CopyableBlock label="LLM and token fields — include on every log" text={llmGuide} compact />

      <CopyableBlock label="Work-status JSON example — paste into Log work status" text={workStatusExample} compact />

      <CopyableBlock label="Full dashboard snapshot example — paste into Log work status" text={fullSnapshotExample} compact />

      <CopyableBlock
        label="Full agent logging prompt — for Codex, Claude Code, or other agents"
        text={agentLoggingPrompt}
      />
    </section>
  );
}
