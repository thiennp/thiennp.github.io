# Automation Memory

- 2026-06-17: Removed stale local reporting references from `codex-automations/hourly-bitbucket-dependency-pr-cleanup/automation.toml` and normalized the prompt to Daily Magic-only reporting (`https://daily-magic.d.energie.check24.de/thien/`).
- 2026-06-17: Jira key inference is restricted to explicit Jira links, exact Jira branch names, or standalone Jira title tokens so Sentry identifiers like `CHATTY-3` do not trigger Jira exports.
- 2026-06-17: PR `https://bitbucket.org/check24/enrg-tarifvergleich/pull-requests/13850` was repaired by posting the missing follow-up comment and then approving after the user clarified `.cursor` changes should be approved without review.
- 2026-06-18: Last mistake was an incomplete queue sweep. The automation now requires a persisted per-run outcome ledger plus `queue-completeness-monitor` and `ledger-persistence-monitor` gates. Every future mistake must be converted into a named monitor subagent/rule before the run may finish as `done`.
