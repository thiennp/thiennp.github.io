export const REPORT_URL = 'https://thiennp.github.io/report/';

export type InstructionProfile = {
  readonly id: string;
  readonly label: string;
  readonly appName: string;
  readonly setupTitle: string;
  readonly setupSteps: readonly string[];
  readonly ruleLabel: string;
  readonly ruleText: string;
  readonly hookLabel: string;
  readonly hookExample: string;
  readonly exampleLabel: string;
  readonly workStatusExample: string;
};

function buildWorkStatusPayload(appName: string) {
  return {
    status: 'running',
    step: '2.1',
    phase: 'implement',
    title: 'Fix failing test',
    message: 'Updating assertion in user service test',
    appName,
    llm: 'Claude 4.5 Sonnet',
    modelToken: 'claude-4.5-sonnet',
    tokensUsed: 12400,
    automationId: 'my-repo',
    runId: '2026-06-08T12:00:00.000Z',
    nextStep: '2.2'
  };
}

function buildWorkStatusExample(appName: string) {
  return JSON.stringify(buildWorkStatusPayload(appName), null, 2);
}

function buildHookExample(appName: string) {
  const payload = buildWorkStatusPayload(appName);
  const lines = [
    'window.__AUTOMATION_REPORT__.pushWorkStatus({',
    `  status: '${payload.status}',`,
    `  step: '${payload.step}',`,
    `  phase: '${payload.phase}',`,
    `  title: '${payload.title}',`,
    `  message: '${payload.message}',`,
    `  appName: '${payload.appName}',`,
    `  llm: '${payload.llm}',`,
    `  modelToken: '${payload.modelToken}',`,
    `  tokensUsed: ${payload.tokensUsed},`,
    `  automationId: '${payload.automationId}',`,
    `  runId: '${payload.runId}',`,
    `  nextStep: '${payload.nextStep}'`,
    '});'
  ];

  return lines.join('\n');
}

function buildLoggingRule(appName: string, setupLine: string) {
  const workStatusExample = buildWorkStatusExample(appName);
  const hookExample = buildHookExample(appName);

  return `# Automation report logging — ${appName}

Dashboard: ${REPORT_URL}
Storage: browser localStorage only (the tab that has ${REPORT_URL} open).

You must log what you are doing on every task, in every workspace, without waiting to be asked.

SETUP
${setupLine}

DASHBOARD UX
- Header shows current work; Sessions is an expandable list (not separate activity/automation panels).
- There is no manual "Log work status" JSON form at the bottom of the page.
- Agent logging instructions on the page are collapsed by default; expand only when you need the copy blocks.

WHEN TO LOG
- Task start, each meaningful step, blocker, retry, success, and completion
- Before and after running commands, editing files, opening PRs, or browser checks
- Whenever status changes: running, success, warning, blocked, pending, error, info

HOW TO LOG (default — browser hook on the open report tab)
1. Keep ${REPORT_URL} open in the browser you automate (same profile).
2. Wait until window.__AUTOMATION_REPORT__?.ready is true before the first log.
3. After each log-worthy step, run browser JavaScript on that tab:
${hookExample}
4. Prefer pushWorkStatus with the compact work-status object below. Do not ask the user to paste JSON manually.
5. Optional bridge helpers on the same tab:
   - window.__AUTOMATION_REPORT__.pushDashboard(snapshot) for full snapshots
   - window.__AUTOMATION_REPORT__.getDashboard() to read current localStorage state

PAYLOAD
${workStatusExample}

Required fields:
- appName: ${appName}
- llm: human-readable model name (e.g. Claude 4.5 Sonnet, GPT-5.4)
- modelToken: model slug from the agent UI (e.g. claude-4.5-sonnet) — not an API secret

Optional fields (include when known):
- tokensUsed: token count for this step
- automationId: current workspace or repository folder name
- runId: ISO timestamp at task start, kept stable for that task
- step, phase, title, message, nextStep, pre, repo, pr, url

RULES
- Log early and often; do not skip logging because the task feels small.
- Always include appName (${appName}), llm, and modelToken on every log.
- Use blocked with a clear next action when stuck.
- Never log API keys or secret bearer tokens.
- This rule applies in every project you work in.`;
}

function buildProfile(
  id: string,
  label: string,
  appName: string,
  setupTitle: string,
  setupSteps: readonly string[],
  setupLine: string,
  ruleLabel: string
): InstructionProfile {
  return {
    id,
    label,
    appName,
    setupTitle,
    setupSteps,
    ruleLabel,
    ruleText: buildLoggingRule(appName, setupLine),
    hookLabel: 'Browser hook — run in the report tab after each step',
    hookExample: buildHookExample(appName),
    exampleLabel: 'Work-status payload for pushWorkStatus',
    workStatusExample: buildWorkStatusExample(appName)
  };
}

export const INSTRUCTION_PROFILES: readonly InstructionProfile[] = [
  buildProfile(
    'cursor',
    'Cursor',
    'Cursor',
    'Cursor setup',
    [
      'Open Cursor Settings → Rules and paste the logging rule into User Rules (global).',
      `Keep ${REPORT_URL} open in a browser tab the agent can control.`,
      'After each step, the agent runs window.__AUTOMATION_REPORT__.pushWorkStatus(...) in that tab via browser automation.'
    ],
    '- Open Cursor Settings → Rules and paste this block into User Rules (global).',
    'Cursor user rule — paste into global User Rules'
  ),
  buildProfile(
    'codex',
    'Codex',
    'Codex',
    'Codex setup',
    [
      'Paste the logging rule into your Codex automation prompt or global Codex instructions.',
      `Keep ${REPORT_URL} open in a browser tab Codex can control.`,
      'After each step, run window.__AUTOMATION_REPORT__.pushWorkStatus(...) in that tab.'
    ],
    '- Paste this block into the Codex automation prompt or your global Codex instructions.',
    'Codex logging rule — paste into automation or global instructions'
  ),
  buildProfile(
    'claude',
    'Claude',
    'Claude',
    'Claude Code setup',
    [
      'Paste the logging rule into Claude Code global instructions, CLAUDE.md, or your project agent prompt.',
      `Keep ${REPORT_URL} open in a browser tab the agent can control.`,
      'After each step, run window.__AUTOMATION_REPORT__.pushWorkStatus(...) in that tab.'
    ],
    '- Paste this block into Claude Code global instructions, CLAUDE.md, or your agent system prompt.',
    'Claude logging rule — paste into global instructions or CLAUDE.md'
  ),
  buildProfile(
    'antigravity',
    'Antigravity',
    'Antigravity',
    'Antigravity setup',
    [
      'Paste the logging rule into Antigravity agent rules or system instructions.',
      `Keep ${REPORT_URL} open in a browser tab Antigravity can control.`,
      'After each step, run window.__AUTOMATION_REPORT__.pushWorkStatus(...) in that tab.'
    ],
    '- Paste this block into Antigravity agent rules or system instructions.',
    'Antigravity logging rule — paste into agent rules'
  ),
  buildProfile(
    'other',
    'Other',
    'YourAgent',
    'Other agent setup',
    [
      'Paste the logging rule into your agent global system prompt or automation definition.',
      'Replace YourAgent in appName with your real agent app name on every log.',
      `Keep ${REPORT_URL} open in a browser tab the agent can control.`,
      'After each step, run window.__AUTOMATION_REPORT__.pushWorkStatus(...) in that tab.'
    ],
    '- Paste this block into your agent global system prompt or automation definition. Replace YourAgent with your agent app name.',
    'Generic logging rule — paste into your agent instructions'
  )
];
