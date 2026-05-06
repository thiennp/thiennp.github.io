# Codex Automations

Portable exports of local Codex automations from `/Users/thiennguyen/.codex/automations`.

These files are intended for reference and restoration on another device. They may contain local paths and workflow instructions, but should not contain secrets, cookies, passwords, OTPs, passkey material, or raw credentials.

## Automations

- `sentry-energycenter-cursor-check` - heartbeat automation for alternating Sentry triage, Jira ticketing, Cursor fixes, PR workflow, and staging cherry-picks.
- `sync-codex-automations-to-thiennp-github-io` - cron automation that syncs local Codex automation definitions back into this repository.

## Layout

Each automation is stored as:

```text
codex-automations/<automation-id>/automation.toml
```

