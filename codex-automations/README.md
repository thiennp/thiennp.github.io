# Codex Automations

Portable exports of local Codex automations from `~/.codex/automations`.

These files are intended for reference and restoration on another device. They may contain local paths and workflow instructions, but should not contain secrets, cookies, passwords, OTPs, passkey material, or raw credentials.

## Automations

- `enrg-pr-chromelink-test-update-rebase` - manual/message-trigger automation for ENRG EnergyCenter Reverse Bitbucket PR links: rebase onto `release`, run `frontend` test-update, amend, and push with force-with-lease.
- `fix-slack-security-dependency-threads` - cron automation for Slack security-bot dependency threads: update affected npm/Composer lockfiles, push Bitbucket branches, create PRs, and add Aleksandar Jaksic and Jens Bachmann as reviewers.
- `sentry-energycenter-cursor-check` - heartbeat automation for alternating Sentry triage, Jira ticketing, Cursor fixes, PR workflow, and staging cherry-picks.
- `sentry-enrg-web-frontend-cursor-checks` - heartbeat automation for enrg-web-frontend Sentry triage, Jira ticketing, Cursor fixes, PR workflow, and staging cherry-picks.
- `sync-codex-automations-to-thiennp-github-io` - cron automation that syncs local Codex automation definitions back into this repository.

## Layout

Each automation is stored as:

```text
codex-automations/<automation-id>/automation.toml
```
