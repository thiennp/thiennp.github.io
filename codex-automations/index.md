# Automation Index

This mirror is maintained as a two-way sync between `~/.codex/automations` and this repo export. A missing copy on one side should be restored from the other side, not treated as a deletion, unless explicitly directed otherwise.

All automations should log meaningful workflow steps to the Automation Report dashboard: public UI `https://thiennp.github.io/report/`, published snapshot `https://thiennp.github.io/report/dashboard.json`, local API `http://127.0.0.1:3120/api/work-status`, WebSocket ingest `ws://127.0.0.1:3120/ws`, and dashboard read/clear `http://127.0.0.1:3120/api/dashboard`. At run start, each automation should run `cd automation-report && ./scripts/ensure-automation-report-server.sh`, then use `node bin/send-work-status.mjs` or the WebSocket ingest for run start, step transitions, blockers, successes, and terminal state. GitHub Pages is read-only for agents except by publishing the snapshot with `npm run deploy:pages`.

| Automation ID | Name | Type | Status | File |
| --- | --- | --- | --- | --- |
| `agent-report-server-guard` | Agent Report server guard | cron | PAUSED | [automation.toml](agent-report-server-guard/automation.toml) |
| `automation-improvement-review-loop` | Automation improvement review loop | heartbeat | ACTIVE | [automation.toml](automation-improvement-review-loop/automation.toml) |
| `check24-package-audit-extractor` | CHECK24 package audit extractor | cron | PAUSED | [automation.toml](check24-package-audit-extractor/automation.toml) |
| `continue-nrg-readme-sweep` | Continue NRG README sweep | heartbeat | PAUSED | [automation.toml](continue-nrg-readme-sweep/automation.toml) |
| `fix-slack-security-dependency-threads` | Daily-vulnerabilities-fix | cron | ACTIVE | [automation.toml](fix-slack-security-dependency-threads/automation.toml) |
| `hourly-bitbucket-dependency-pr-cleanup` | Hourly assigned Bitbucket PR review | cron | PAUSED | [automation.toml](hourly-bitbucket-dependency-pr-cleanup/automation.toml) |
| `hourly-sentry-jira-bugfix-workflow` | Hourly Sentry Jira Bugfix Workflow | cron | ACTIVE | [automation.toml](hourly-sentry-jira-bugfix-workflow/automation.toml) |
| `sentry-chrome-tab-snapshot` | Sentry Chrome Tab Snapshot | heartbeat | PAUSED | [automation.toml](sentry-chrome-tab-snapshot/automation.toml) |
| `sentry-jira-cursor-triage-loop` | Sentry Jira Cursor Triage Loop | heartbeat | ACTIVE | [automation.toml](sentry-jira-cursor-triage-loop/automation.toml) |
| `sync-codex-automations-to-thiennp-github-io` | Sync Codex automations to thiennp.github.io | cron | ACTIVE | [automation.toml](sync-codex-automations-to-thiennp-github-io/automation.toml) |
