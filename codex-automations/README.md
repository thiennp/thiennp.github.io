# Codex Automations

Portable exports of local Codex automations from `~/.codex/automations`.

These files are intended for reference and restoration on another device. They may contain local paths and workflow instructions, but should not contain secrets, cookies, passwords, OTPs, passkey material, or raw credentials.

The public site navigation includes an `Automations` link to `codex-automations/`, and the automation index links directly to every exported definition.

## Shared Reporting Contract

Every automation should report to the Agent Report page at the start of a run or heartbeat, after major step completion, when blocked or paused, and at the final state.

At the start of each automation, run this first so the report server is available without producing an extra autostart message:

```bash
AGENT_REPORT_SEND_STATUS=0 /Users/thien.nguyen/thiennp.github.io/agent-report/scripts/ensure-agent-report-server.sh
```

Use `automationName`, `title`, `status`, and `text` when sending to `ws://localhost:3100/stream`. Keep `source` as `terminal` or `browser`; do not put the automation name in `source`.

```bash
cd /Users/thien.nguyen/thiennp.github.io/agent-report
AGENT_REPORT_WS=ws://localhost:3100/stream npm run send -- --automation-name "<automation name>" --title "<step title>" --status <running|success|warning|blocked|error|pending|info> "<concise update>"
```

## Automations

- `check24-package-audit-extractor` - CHECK24 package audit extractor: cron automation for rechecking the Power package-audit dashboard and exporting details to `~/sec.check24.de.json`.
- `daily-german-btl-property-scan` - Daily German BTL Property Scan: cron automation for scanning German buy-to-let apartment listings.
- `fix-slack-security-dependency-threads` - Daily-vulnerabilities-fix: cron automation for daily security dashboard scan/fix + Jira/PR tracking.
- `muc-han-flight-price-watch` - MUC-HAN flexible flight price watch: heartbeat automation for daily flexible flight fare monitoring + HTML report refresh.
- `refresh-thiennp-dependabot-html-report` - Refresh thiennp Dependabot HTML report: cron automation that refreshes the local Dependabot HTML report (no commits/pushes).
- `review-wishees-user-profile-notes` - Review notes: cron automation for multi-persona Wishees UX review and JSON profile refresh.
- `resolve-stale-sentry-issues` - Resolve stale Sentry issues: cron automation for assigning and resolving Sentry issues stale for >1 day.
- `sentry-jira-cursor-triage-loop` - Sentry Jira Cursor Triage Loop: heartbeat automation for Sentry triage + Jira ticket creation workflow.
- `sync-codex-automations-to-thiennp-github-io` - Sync Codex automations to thiennp.github.io: cron automation that syncs local Codex automation definitions back into this repository.
- `wishees-revenue-audit-loop` - Wishees Product Quality Loop: heartbeat automation for product-quality loops (manual QA + small safe fixes).

## Layout

Each automation is stored as:

```text
codex-automations/<automation-id>/automation.toml
```
