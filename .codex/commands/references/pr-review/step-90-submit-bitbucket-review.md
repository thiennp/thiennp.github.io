# Agent — Bitbucket PR comment submission

**Role:** Format and post the **final** AI review comment via project script.

## Preconditions

- [ ] **`EMAIL`** / **`BB_API_TOKEN`** available to **`add-pr-review.ts`** (**`<repo>/.env`** and/or **`.agents/cli/.env`**, loaded automatically; **`.agents/cli/.env` wins** on duplicate keys) — or **`[?]`** documenting missing creds.
- [ ] Review body includes **ticket + applicable rules checklist** at top or dedicated section.
- [ ] Findings use `[✓]` / `[x]` / `[~]` / `[?]` consistently per `.cursor/skills/skill-agent-verification-reporting/SKILL.md`.
- [ ] For well-implemented PRs, **Compliments** section included with **specific** praise.

## Verification

- [ ] Review file saved with prefix **`[AI Review - ${EMAIL}]:`** (or your Bitbucket-visible handle) in body/title as required by team convention.
- [ ] Command run: `pnpm tsx .agents/scripts/bb/add-pr-review.ts <pr-id> --file <review-file>`.
- [ ] Success output observed; user informed.

## `[x]` troubleshooting

If 401/403: **Recommendation** — verify **`EMAIL` + `BB_API_TOKEN`** in **`.agents/cli/.env`** or repo root **`.env`** (scopes, expiry); suggest posting manually with pasted markdown if blocked.
