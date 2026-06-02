# Automation Index

All automations should first run `/Users/thien.nguyen/thiennp.github.io/agent-report/scripts/ensure-agent-report-server.sh` with `AGENT_REPORT_SEND_STATUS=0`, then report start, progress, every item finished, blockers, and final state to the Agent Report app at `ws://localhost:3100/stream` using `automationName`, `title`, `status`, and `text`.

| Automation ID | Name | Type | Status | File |
| --- | --- | --- | --- | --- |
| `check24-package-audit-extractor` | CHECK24 package audit extractor | cron | PAUSED | [automation.toml](check24-package-audit-extractor/automation.toml) |
| `fix-slack-security-dependency-threads` | Daily-vulnerabilities-fix | cron | ACTIVE | [automation.toml](fix-slack-security-dependency-threads/automation.toml) |
| `sentry-jira-cursor-triage-loop` | Sentry Jira Cursor Triage Loop | heartbeat | ACTIVE | [automation.toml](sentry-jira-cursor-triage-loop/automation.toml) |
| `sync-codex-automations-to-thiennp-github-io` | Sync Codex automations to thiennp.github.io | cron | ACTIVE | [automation.toml](sync-codex-automations-to-thiennp-github-io/automation.toml) |
