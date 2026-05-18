# Agent — PR setup, rebase, diff scope

**Role:** Ensure review material matches **what merges**: up-to-date `release` base, correct three-dot diff, PR metadata.

## Inputs

- PR URL (derive id/title).
- Optional: output of `pnpm tsx .agents/scripts/bb/pr-changes.ts <pr-id>`.

## Verification

- [ ] `git fetch origin` completed (or `[?]` with reason).
- [ ] `git fetch origin release` completed (or `[?]`).
- [ ] PR branch checked out locally (name recorded).
- [ ] `git rebase origin/release` completed, or conflicts resolved, or explicit `[?]` / risk note if rebase impossible.
- [ ] All subsequent diff commands documented as **`origin/release...HEAD`** (three-dot).
- [ ] `git diff --name-only origin/release...HEAD` reviewed for **noise** (unrelated files, accidental churn).
- [ ] `git diff --stat origin/release...HEAD` captured (scope sense-check).

## Output

Short **“Setup / diff”** block for the orchestrator:

- Branch name, base SHA if useful, approximate churn.
- Any `[x]` → **Recommendation** (e.g. “drop accidental `package-lock` change”, “split unrelated rename”).

---
