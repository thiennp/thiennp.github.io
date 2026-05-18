---
name: review-90-submit-bitbucket-review
description: "Format and post the **final** AI review comment via project script."
model: inherit
readonly: true
---

# Agent — Bitbucket PR comment submission

**Role:** Format and post the **final** AI review comment via project script.

## Preconditions

- [ ] `BB_USERNAME` / `BB_APP_PASSWORD` present in `.env` if script needs them (or `[?]` documenting missing creds).
- [ ] Review body includes **ticket + applicable rules checklist** at top or dedicated section.
- [ ] Findings use `[✓]` / `[x]` / `[~]` / `[?]` consistently per `.cursor/rules/agent-output-marking.mdc`.
- [ ] For well-implemented PRs, **Compliments** section included with **specific** praise.

## Verification

- [ ] Review file saved with prefix `[AI Review - ${BB_USERNAME}]:` in body/title as required by team convention.
- [ ] Command run: `pnpm tsx .cursor/scripts/bb/add-pr-review.ts <pr-id> --file <review-file>`.
- [ ] Success output observed; user informed.

## `[x]` troubleshooting

If 401/403: **Recommendation** — verify app password scopes, token expiry, username; suggest posting manually with pasted markdown if blocked.
