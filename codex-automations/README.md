# Codex Automations

Portable exports of local Codex automations from `~/.codex/automations`.

These files are intended for reference and restoration on another device. They may contain local paths and workflow instructions, but should not contain secrets, cookies, passwords, OTPs, passkey material, or raw credentials.

The public site navigation includes an `Automations` link to `codex-automations/`, and the automation index links directly to every exported definition.

## Automations

- `daily-german-btl-property-scan` - Daily German BTL Property Scan: cron automation for scanning German buy-to-let apartment listings.
- `fix-slack-security-dependency-threads` - Fix Slack Security Dependency Threads: cron automation for Slack security-bot dependency threads.
- `sentry` - Sentry: cron automation for listing unassigned Sentry issues.
- `sentry-enrg-web-frontend-cursor-checks` - Sentry enrg-web-frontend Cursor checks: heartbeat automation for enrg-web-frontend Sentry triage/fix workflows.
- `sync-codex-automations-to-thiennp-github-io` - Sync Codex automations to thiennp.github.io: cron automation that syncs local Codex automation definitions back into this repository.

## Layout

Each automation is stored as:

```text
codex-automations/<automation-id>/automation.toml
```
