# Automation Index

This mirror is maintained as a two-way sync between `~/.codex/automations` and this repo export. A missing copy on one side should be restored from the other side, not treated as a deletion, unless explicitly directed otherwise.

All automations should first run `/Users/thien.nguyen/thiennp.github.io/agent-report/scripts/ensure-agent-report-server.sh` with `AGENT_REPORT_SEND_STATUS=0`, then report start, progress, every item finished, blockers, and final state to the Agent Report app at `ws://localhost:3100/stream` using `automationName`, `title`, `status`, and `text`.

| Automation ID | Name | Type | Status | File |
| --- | --- | --- | --- | --- |
| `agent-report-server-guard` | Agent Report server guard | cron | ACTIVE | [automation.toml](agent-report-server-guard/automation.toml) |
| `check24-package-audit-extractor` | CHECK24 package audit extractor | cron | PAUSED | [automation.toml](check24-package-audit-extractor/automation.toml) |
| `continue-nrg-readme-sweep` | Continue NRG README sweep | heartbeat | PAUSED | [automation.toml](continue-nrg-readme-sweep/automation.toml) |
| `fix-slack-security-dependency-threads` | Daily-vulnerabilities-fix | cron | PAUSED | [automation.toml](fix-slack-security-dependency-threads/automation.toml) |
| `hourly-bitbucket-dependency-pr-cleanup` | 15-minute assigned Bitbucket PR review | cron | PAUSED | [automation.toml](hourly-bitbucket-dependency-pr-cleanup/automation.toml) |
| `sentry-jira-cursor-triage-loop` | Sentry Jira Cursor Triage Loop | heartbeat | PAUSED | [automation.toml](sentry-jira-cursor-triage-loop/automation.toml) |
| `sync-codex-automations-to-thiennp-github-io` | Sync Codex automations to thiennp.github.io | cron | ACTIVE | [automation.toml](sync-codex-automations-to-thiennp-github-io/automation.toml) |
