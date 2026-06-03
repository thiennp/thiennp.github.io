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

- `agent-report-server-guard` - Agent Report server guard: cron automation that checks every 30 minutes and starts the Agent Report server if it is down.
- `automation-improvement-review-loop` - Automation improvement review loop: heartbeat automation that runs the automation improvement review workflow every 5 minutes for this thread.
- `check24-package-audit-extractor` - CHECK24 package audit extractor: cron automation for rechecking the Power package-audit dashboard and exporting details to `~/sec.check24.de.json`.
- `continue-nrg-readme-sweep` - Continue NRG README sweep: heartbeat automation to continue the NRG Jira/MR documentation sweep.
- `fix-slack-security-dependency-threads` - Daily-vulnerabilities-fix: cron automation for daily security dashboard scan/fix + Jira/PR tracking.
- `hourly-bitbucket-dependency-pr-cleanup` - Hourly assigned Bitbucket PR review: hourly review automation for Bitbucket pull requests assigned to or requiring review from Thien Nguyen.
- `sentry-jira-cursor-triage-loop` - Sentry Jira Cursor Triage Loop: heartbeat automation for Sentry triage + Jira ticket creation workflow.
- `sync-codex-automations-to-thiennp-github-io` - Sync Codex automations to thiennp.github.io: cron automation that keeps local and exported automation definitions synchronized in both directions.

## Layout

Each automation is stored as:

```text
codex-automations/<automation-id>/automation.toml
```
