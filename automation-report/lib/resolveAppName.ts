const APP_NAME_ALIASES: Record<string, string> = {
  antigravity: 'Antigravity',
  'claude code': 'Claude',
  claude: 'Claude',
  codex: 'Codex',
  cursor: 'Cursor'
};

export function resolveAppName(input: Record<string, unknown>): string | undefined {
  const raw = input.appName || input.app || input.agentName || input.agent;
  if (typeof raw !== 'string') {
    return undefined;
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    return undefined;
  }

  return APP_NAME_ALIASES[trimmed.toLowerCase()] || trimmed;
}
