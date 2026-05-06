# Codex Automations

Portable exports of local Codex automations from `~/.codex/automations`.

These files are intended for reference and restoration on another device. They may contain local paths and workflow instructions, but should not contain secrets, cookies, passwords, OTPs, passkey material, or raw credentials.

The public site navigation includes an `Automations` link to `codex-automations/`, and the automation index links directly to every exported definition.

## Automations

- `enrg-pr-chromelink-test-update-rebase` - ENRG EnergyCenter PR Rebase and Test Update: manual/message-trigger automation for EnergyCenter Reverse Bitbucket PR links.
- `fix-slack-security-dependency-threads` - Slack Security Dependency PR Fixer: cron automation for Slack security-bot dependency threads.
- `sentry-energycenter-cursor-check` - Sentry Alternating Cursor Fixes: heartbeat automation for alternating EnergyCenter Reverse and Result List Goes React Sentry triage/fix workflows.
- `sentry-enrg-web-frontend-cursor-checks` - Sentry ENRG Web Frontend Cursor Fixes: heartbeat automation for enrg-web-frontend Sentry triage/fix workflows.
- `sync-codex-automations-to-thiennp-github-io` - Sync Codex Automations to thiennp.github.io: cron automation that syncs local Codex automation definitions back into this repository.

## Layout

Each automation is stored as:

```text
codex-automations/<automation-id>/automation.toml
```
