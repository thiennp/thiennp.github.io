# Automation Index

This mirror is maintained as a two-way sync between `~/.codex/automations` and this repo export. A missing copy on one side should be restored from the other side, not treated as a deletion, unless explicitly directed otherwise.

All automations should log meaningful workflow steps through the browser page at `https://thiennp.github.io/report/`. Data is stored in that browser profile's `localStorage`; no GitHub token or server API is required. Prefer the bottom `Log work status` JSON input for run start, step transitions, blockers, successes, and terminal state, especially when the automation context cannot access `window.__AUTOMATION_REPORT__` directly. When controlling the open dashboard directly, agents may alternatively call `window.__AUTOMATION_REPORT__.pushWorkStatus(...)` for work-status events or `window.__AUTOMATION_REPORT__.pushDashboard(...)` with a full snapshot object. Include `tokensUsed` only when the runtime exposes an exact reliable count; omit it rather than estimating.

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
