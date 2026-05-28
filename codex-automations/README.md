# Codex Automations

Portable exports of local Codex automations from `~/.codex/automations`.

These files are intended for reference and restoration on another device. They may contain local paths and workflow instructions, but should not contain secrets, cookies, passwords, OTPs, passkey material, or raw credentials.

The public site navigation includes an `Automations` link to `codex-automations/`, and the automation index links directly to every exported definition.

## Automations

- `daily-german-btl-property-scan` - Daily German BTL Property Scan: cron automation for scanning German buy-to-let apartment listings.
- `fix-slack-security-dependency-threads` - Daily-vulnerabilities-fix: cron automation for daily security dashboard scan/fix + Jira/PR tracking.
- `muc-han-flight-price-watch` - MUC-HAN flexible flight price watch: heartbeat automation for daily flexible flight fare monitoring + HTML report refresh.
- `refresh-thiennp-dependabot-html-report` - Refresh thiennp Dependabot HTML report: cron automation that refreshes the local Dependabot HTML report (no commits/pushes).
- `resolve-stale-sentry-issues` - Resolve stale Sentry issues: cron automation for assigning and resolving Sentry issues stale for >1 day.
- `sentry-jira-cursor-triage-loop` - Sentry Jira Cursor Triage Loop: heartbeat automation for Sentry triage + Jira ticket creation workflow.
- `sync-codex-automations-to-thiennp-github-io` - Sync Codex automations to thiennp.github.io: cron automation that syncs local Codex automation definitions back into this repository.
- `wishees-revenue-audit-loop` - Wishees Product Quality Loop: heartbeat automation for product-quality loops (manual QA + small safe fixes).

## Layout

Each automation is stored as:

```text
codex-automations/<automation-id>/automation.toml
```
