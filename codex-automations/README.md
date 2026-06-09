# Codex Automations

Portable two-way sync copies of Codex automations shared between `~/.codex/automations` and this repository.

These files are intended for reference and restoration on another device. The sync flow treats either side as a recoverable source: if an automation exists only locally or only in the repo, the missing side should be repopulated rather than deleted. The files may contain local paths and workflow instructions, but should not contain secrets, cookies, passwords, OTPs, passkey material, or raw credentials.

The public site navigation includes an `Automations` link to `codex-automations/`, and the automation index links directly to every exported definition.

## Shared Reporting Contract

Every automation should log meaningful workflow steps to the Automation Report dashboard at the start of a run or heartbeat, on step transitions, after Jira/PR/Sentry actions that change current work, when blocked, and at the final state.

Dashboard: <https://thiennp.github.io/report/>

Storage: `localStorage` in the browser profile that has the dashboard open. No GitHub token or server API is required.

Preferred logging flow: open the dashboard, scroll to the bottom `Log work status` field, paste a work-status JSON object or full dashboard snapshot, then click Submit or press Enter. When browser automation is available, type or paste directly into that bottom field. As an alternative with the dashboard open, call `window.__AUTOMATION_REPORT__.pushDashboard(...)` with the full snapshot object.

Use real status values: `running`, `success`, `warning`, `blocked`, `pending`, `error`, and `info`. Mark blockers as `blocked` with an actionable message, and include `PRE-####` when tied to Jira. `Clear report` wipes only this browser profile's localStorage, and activity history is capped at 200 events.

## Automations

- `agent-report-server-guard` - Agent Report server guard: cron automation that checks every 30 minutes and starts the Agent Report server if it is down. Current status: `PAUSED`.
- `automation-improvement-review-loop` - Automation improvement review loop: hourly heartbeat automation that audits all mirrored automations and runs the improvement review loop for explicit change requests in this thread. Current status: `ACTIVE`.
- `check24-package-audit-extractor` - CHECK24 package audit extractor: cron automation for rechecking the Power package-audit dashboard and exporting details to `~/sec.check24.de.json`. Current status: `PAUSED`.
- `continue-nrg-readme-sweep` - Continue NRG README sweep: heartbeat automation to continue the NRG Jira/MR documentation sweep. Current status: `PAUSED`.
- `fix-slack-security-dependency-threads` - Daily-vulnerabilities-fix: cron automation for daily security dashboard scan/fix + Jira/PR tracking. Current status: `ACTIVE`.
- `hourly-bitbucket-dependency-pr-cleanup` - Hourly assigned Bitbucket PR review: hourly review automation for Bitbucket pull requests assigned to or requiring review from Thien Nguyen. Current status: `PAUSED`.
- `hourly-sentry-jira-bugfix-workflow` - Hourly Sentry Jira Bugfix Workflow: cron automation for the resumable Sentry-to-Jira desktop bugfix workflow. Current status: `ACTIVE`.
- `sentry-chrome-tab-snapshot` - Sentry Chrome Tab Snapshot: heartbeat automation that extracts the CHECK24 Sentry issue list from the verified Chrome profile and syncs it into the localhost triage report. Current status: `PAUSED`.
- `sentry-jira-cursor-triage-loop` - Sentry Jira Cursor Triage Loop: heartbeat automation for Sentry triage + Jira ticket creation workflow. Current status: `ACTIVE`.
- `sync-codex-automations-to-thiennp-github-io` - Sync Codex automations to thiennp.github.io: cron automation that keeps local and exported automation definitions synchronized in both directions. Current status: `ACTIVE`.

## Layout

Each automation is stored as:

```text
codex-automations/<automation-id>/automation.toml
```
