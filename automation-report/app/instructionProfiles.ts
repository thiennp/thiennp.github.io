export const REPORT_URL = 'https://thiennp.github.io/report/';

export type InstructionProfile = {
  readonly id: string;
  readonly label: string;
  readonly appName: string;
  readonly setupTitle: string;
  readonly setupSteps: readonly string[];
  readonly ruleLabel: string;
  readonly ruleText: string;
  readonly exampleLabel: string;
  readonly workStatusExample: string;
};

function buildWorkStatusExample(appName: string) {
  return JSON.stringify({
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
  });
}

function buildLoggingRule(appName: string, setupLine: string) {
  const workStatusExample = buildWorkStatusExample(appName);

  return `# Automation report logging — ${appName}

Dashboard: ${REPORT_URL}
Storage: localStorage in the browser tab that has ${REPORT_URL} open.

You must log what you are doing on every task, in every workspace, without waiting to be asked.

SETUP
${setupLine}

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
- appName: ${appName}
- llm: human-readable model name (e.g. Claude 4.5 Sonnet, GPT-5.4)
- modelToken: model slug from the agent UI (e.g. claude-4.5-sonnet) — not an API secret

Also include:
- tokensUsed: token count for this step when known
- automationId: current workspace or repository folder name
- runId: ISO timestamp at task start, kept stable for that task
- pre, repo, pr, or url only when known for the active task

RULES
- Log early and often; do not skip logging because the task feels small.
- Always include appName (${appName}), llm, and modelToken on every log.
- Use blocked with a clear next action when stuck.
- Never log API keys or secret bearer tokens.
- This rule applies in every project you work in.`;
}

export const INSTRUCTION_PROFILES: readonly InstructionProfile[] = [
  {
    id: 'cursor',
    label: 'Cursor',
    appName: 'Cursor',
    setupTitle: 'Cursor setup',
    setupSteps: [
      'Open Cursor Settings → Rules.',
      'Paste the logging rule below into User Rules (global), not Project Rules.',
      `Keep ${REPORT_URL} open in a browser tab while the agent runs.`,
      'The agent logs by pasting JSON into the Log work status field at the bottom of that page.'
    ],
    ruleLabel: 'Cursor user rule — paste into global User Rules',
    ruleText: buildLoggingRule(
      'Cursor',
      '- Open Cursor Settings → Rules and paste this block into User Rules (global).'
    ),
    exampleLabel: 'Work-status JSON example — paste into Log work status',
    workStatusExample: buildWorkStatusExample('Cursor')
  },
  {
    id: 'codex',
    label: 'Codex',
    appName: 'Codex',
    setupTitle: 'Codex setup',
    setupSteps: [
      'Paste the logging rule below into your Codex automation prompt or global Codex instructions.',
      `Keep ${REPORT_URL} open in a browser tab while Codex runs.`,
      'After each step, paste the work-status JSON into the Log work status field on that page.'
    ],
    ruleLabel: 'Codex logging rule — paste into automation or global instructions',
    ruleText: buildLoggingRule(
      'Codex',
      '- Paste this block into the Codex automation prompt or your global Codex instructions.'
    ),
    exampleLabel: 'Work-status JSON example — paste into Log work status',
    workStatusExample: buildWorkStatusExample('Codex')
  },
  {
    id: 'claude',
    label: 'Claude',
    appName: 'Claude',
    setupTitle: 'Claude Code setup',
    setupSteps: [
      'Paste the logging rule below into Claude Code global instructions, CLAUDE.md, or your project agent prompt.',
      `Keep ${REPORT_URL} open in a browser tab while Claude runs.`,
      'After each step, paste the work-status JSON into the Log work status field on that page.'
    ],
    ruleLabel: 'Claude logging rule — paste into global instructions or CLAUDE.md',
    ruleText: buildLoggingRule(
      'Claude',
      '- Paste this block into Claude Code global instructions, CLAUDE.md, or your agent system prompt.'
    ),
    exampleLabel: 'Work-status JSON example — paste into Log work status',
    workStatusExample: buildWorkStatusExample('Claude')
  },
  {
    id: 'antigravity',
    label: 'Antigravity',
    appName: 'Antigravity',
    setupTitle: 'Antigravity setup',
    setupSteps: [
      'Paste the logging rule below into Antigravity agent rules or system instructions.',
      `Keep ${REPORT_URL} open in a browser tab while Antigravity runs.`,
      'After each step, paste the work-status JSON into the Log work status field on that page.'
    ],
    ruleLabel: 'Antigravity logging rule — paste into agent rules',
    ruleText: buildLoggingRule(
      'Antigravity',
      '- Paste this block into Antigravity agent rules or system instructions.'
    ),
    exampleLabel: 'Work-status JSON example — paste into Log work status',
    workStatusExample: buildWorkStatusExample('Antigravity')
  },
  {
    id: 'other',
    label: 'Other',
    appName: 'YourAgent',
    setupTitle: 'Other agent setup',
    setupSteps: [
      'Paste the logging rule below into your agent global system prompt or automation definition.',
      'Replace YourAgent in appName with your real agent app name on every log.',
      `Keep ${REPORT_URL} open in a browser tab while the agent runs.`,
      'After each step, paste the work-status JSON into the Log work status field on that page.'
    ],
    ruleLabel: 'Generic logging rule — paste into your agent instructions',
    ruleText: buildLoggingRule(
      'YourAgent',
      '- Paste this block into your agent global system prompt or automation definition. Replace YourAgent with your agent app name.'
    ),
    exampleLabel: 'Work-status JSON example — replace YourAgent with your app name',
    workStatusExample: buildWorkStatusExample('YourAgent')
  }
];
