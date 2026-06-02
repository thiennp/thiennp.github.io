# Automation Index

All automations should first run `/Users/thien.nguyen/thiennp.github.io/agent-report/scripts/ensure-agent-report-server.sh` with `AGENT_REPORT_SEND_STATUS=0`, then report start, progress, blockers, and final state to the Agent Report app at `ws://localhost:3100/stream` using `automationName`, `title`, `status`, and `text`.

| Automation ID | Name | Type | Status | File |
| --- | --- | --- | --- | --- |
| `check24-package-audit-extractor` | CHECK24 package audit extractor | cron | PAUSED | [automation.toml](check24-package-audit-extractor/automation.toml) |
| `daily-german-btl-property-scan` | Daily German BTL Property Scan | cron | PAUSED | [automation.toml](daily-german-btl-property-scan/automation.toml) |
| `fix-slack-security-dependency-threads` | Daily-vulnerabilities-fix | cron | ACTIVE | [automation.toml](fix-slack-security-dependency-threads/automation.toml) |
| `muc-han-flight-price-watch` | MUC-HAN flexible flight price watch | heartbeat | ACTIVE | [automation.toml](muc-han-flight-price-watch/automation.toml) |
| `refresh-thiennp-dependabot-html-report` | Refresh thiennp Dependabot HTML report | cron | ACTIVE | [automation.toml](refresh-thiennp-dependabot-html-report/automation.toml) |
| `review-wishees-user-profile-notes` | Review notes | cron | ACTIVE | [automation.toml](review-wishees-user-profile-notes/automation.toml) |
| `resolve-stale-sentry-issues` | Resolve stale Sentry issues | cron | PAUSED | [automation.toml](resolve-stale-sentry-issues/automation.toml) |
| `sentry-jira-cursor-triage-loop` | Sentry Jira Cursor Triage Loop | heartbeat | ACTIVE | [automation.toml](sentry-jira-cursor-triage-loop/automation.toml) |
| `sync-codex-automations-to-thiennp-github-io` | Sync Codex automations to thiennp.github.io | cron | ACTIVE | [automation.toml](sync-codex-automations-to-thiennp-github-io/automation.toml) |
| `wishees-revenue-audit-loop` | Wishees Product Quality Loop | heartbeat | PAUSED | [automation.toml](wishees-revenue-audit-loop/automation.toml) |
