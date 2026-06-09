export const REPORT_URL = 'https://thiennp.github.io/report/';
const LOCAL_BRIDGE_COMMAND = `node /Users/thien.nguyen/thiennp.github.io/automation-report/bin/log-to-pages-tab.mjs \\
  --status running \\
  --appName Codex \\
  --llm "GPT-5" \\
  --modelToken gpt-5-codex \\
  --title "Fix failing test" \\
  --automation-id my-repo \\
  --run-id 2026-06-08T12:00:00.000Z \\
  "Updating assertion in user service test"`;

export type InstructionProfile = {
  readonly id: string;
  readonly label: string;
  readonly appName: string;
  readonly promptTitle: string;
  readonly promptLabel: string;
  readonly promptText: string;
};

function buildLoggingRule(appName: string) {
  return `# Automation report logging — ${appName}

Dashboard: ${REPORT_URL}

You must log what you are doing on every task, in every workspace, without waiting to be asked.

WHEN TO LOG
- Task start, each meaningful step, blocker, retry, success, and completion
- Before and after running commands, editing files, opening PRs, or browser checks
- Whenever status changes: running, success, warning, blocked, pending, error, info

HOW TO LOG
Preferred
1. Keep ${REPORT_URL} open in Google Chrome.
2. If logging cannot reach Chrome, start Chrome with:
   /Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --remote-debugging-port=9222 --profile-directory=Default
3. After each log-worthy step, run:
${LOCAL_BRIDGE_COMMAND}

Fallback
- Paste a work-status JSON object into the bottom "Log work status" field and submit it.

Required fields:
- appName: ${appName}
- llm: human-readable model name (e.g. Claude 4.5 Sonnet, GPT-5.4)
- modelToken: model slug from the agent UI (e.g. claude-4.5-sonnet)

Optional fields (include when known):
- tokensUsed: exact token count for this step or run; omit it when the runtime does not expose a reliable number
- automationId: current workspace or repository folder name
- runId: ISO timestamp at task start, kept stable for that task
- step, phase, title, message, nextStep, pre, repo, pr, url

RULES
- Log early and often; do not skip logging because the task feels small.
- Always include appName (${appName}), llm, and modelToken on every log.
- Never estimate tokensUsed or copy the example token number into real logs.
- Use blocked with a clear next action when stuck.
- Never log API keys or secret bearer tokens.
- This rule applies in every project you work in.`;
}

function buildUpdatePrompt(appName: string, targetPlace: string, extraInstruction = '') {
  const optionalExtra = extraInstruction ? `\n${extraInstruction}\n` : '';

  return `Please update your persistent instructions for ${appName}.

Target place:
${targetPlace}

What to do:
- Add the automation report logging rule below to the target place.
- Preserve all existing useful instructions.
- Remove older duplicate or conflicting report-logging instructions.
- Do not change unrelated project files or unrelated rules.
- Confirm exactly where you saved it and whether any old duplicate rule was removed.
${optionalExtra}
Rule to install:
${buildLoggingRule(appName)}`;
}

function buildProfile(
  id: string,
  label: string,
  appName: string,
  targetPlace: string,
  promptLabel: string,
  extraInstruction = ''
): InstructionProfile {
  return {
    id,
    label,
    appName,
    promptTitle: `${label} update prompt`,
    promptLabel,
    promptText: buildUpdatePrompt(appName, targetPlace, extraInstruction)
  };
}

export const INSTRUCTION_PROFILES: readonly InstructionProfile[] = [
  buildProfile(
    'cursor',
    'Cursor',
    'Cursor',
    'Cursor global User Rules. If global User Rules are not directly writable from this session, tell me the exact Cursor Settings location to paste into.',
    'Prompt for Cursor to install the report rule'
  ),
  buildProfile(
    'codex',
    'Codex',
    'Codex',
    'Codex global instructions or the active AGENTS.md/instructions file that applies to every task in this workspace.',
    'Prompt for Codex to install the report rule',
    'If both global and project instructions exist, prefer the global location and avoid duplicating the same rule in every automation.'
  ),
  buildProfile(
    'claude',
    'Claude',
    'Claude',
    'Claude Code global instructions or CLAUDE.md, choosing the persistent place that applies across future tasks.',
    'Prompt for Claude to install the report rule'
  ),
  buildProfile(
    'antigravity',
    'Antigravity',
    'Antigravity',
    'Antigravity agent rules or system instructions, choosing the persistent global place if one exists.',
    'Prompt for Antigravity to install the report rule'
  ),
  buildProfile(
    'other',
    'Other',
    'YourAgent',
    'The agent global system prompt, persistent user rules, or automation definition that applies across future tasks.',
    'Prompt for another agent to install the report rule',
    'Replace YourAgent with the real agent app name before saving the rule.'
  )
];
