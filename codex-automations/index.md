# Automation Index

This mirror tracks the current automation definitions from `~/.codex/automations` in this repo export.

All automations should first run `/Users/thien.nguyen/thiennp.github.io/agent-report/scripts/ensure-agent-report-server.sh` with `AGENT_REPORT_SEND_STATUS=0`, then report start, progress, every item finished, blockers, and final state to the Agent Report app at `ws://localhost:3100/stream` using `automationName`, `title`, `status`, and `text`.

| Automation ID | Name | Type | Status | File |
| --- | --- | --- | --- | --- |
| `continue-nrg-readme-sweep` | Continue NRG README sweep | heartbeat | PAUSED | [automation.toml](continue-nrg-readme-sweep/automation.toml) |
| `daily-magic-report-watchdog` | Daily Magic Report Watchdog | heartbeat | PAUSED | [automation.toml](daily-magic-report-watchdog/automation.toml) |
| `fix-slack-security-dependency-threads` | Daily-vulnerabilities-fix | cron | PAUSED | [automation.toml](fix-slack-security-dependency-threads/automation.toml) |
| `hourly-bitbucket-dependency-pr-cleanup` | 15-minute assigned Bitbucket PR review | cron | PAUSED | [automation.toml](hourly-bitbucket-dependency-pr-cleanup/automation.toml) |
| `sentry-jira-cursor-triage-loop` | Sentry Jira Cursor Triage Loop | heartbeat | PAUSED | [automation.toml](sentry-jira-cursor-triage-loop/automation.toml) |
