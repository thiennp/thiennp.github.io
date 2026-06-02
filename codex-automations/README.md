# Codex Automations

Portable two-way sync copies of Codex automations shared between `~/.codex/automations` and this repository.

These files are intended for reference and restoration on another device. The sync flow treats either side as a recoverable source: if an automation exists only locally or only in the repo, the missing side should be repopulated rather than deleted. The files may contain local paths and workflow instructions, but should not contain secrets, cookies, passwords, OTPs, passkey material, or raw credentials.

The public site navigation includes an `Automations` link to `codex-automations/`, and the automation index links directly to every exported definition.

## Shared Reporting Contract

Every automation should report to the Agent Report page at the start of a run or heartbeat, after major step completion, when every individual item finishes, when blocked or paused, and at the final state.

Item-finished reports are mandatory. Whenever a ticket, PR, vulnerability, listing, persona review, file sync, subagent assignment, scan row, or other discrete work item completes, send a report immediately before moving to the next item.

At the start of each automation, run this first so the report server is available without producing an extra autostart message:

```bash
AGENT_REPORT_SEND_STATUS=0 /Users/thien.nguyen/thiennp.github.io/agent-report/scripts/ensure-agent-report-server.sh
```

Use `automationName`, `title`, `status`, and `text` when sending to `ws://localhost:3100/stream`. Keep `source` as `terminal` or `browser`; do not put the automation name in `source`.

```bash
cd /Users/thien.nguyen/thiennp.github.io/agent-report
AGENT_REPORT_WS=ws://localhost:3100/stream npm run send -- --automation-name "<automation name>" --title "<item or step title>" --status <running|success|warning|blocked|error|pending|info> "<concise update>"
```

## Automations

- `check24-package-audit-extractor` - CHECK24 package audit extractor: cron automation for rechecking the Power package-audit dashboard and exporting details to `~/sec.check24.de.json`.
- `fix-slack-security-dependency-threads` - Daily-vulnerabilities-fix: cron automation for daily security dashboard scan/fix + Jira/PR tracking.
- `sentry-jira-cursor-triage-loop` - Sentry Jira Cursor Triage Loop: heartbeat automation for Sentry triage + Jira ticket creation workflow.
- `sync-codex-automations-to-thiennp-github-io` - Sync Codex automations to thiennp.github.io: cron automation that keeps local and repo automation definitions synchronized in both directions.

## Layout

Each automation is stored as:

```text
codex-automations/<automation-id>/automation.toml
```
