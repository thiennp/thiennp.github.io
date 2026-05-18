---
name: git-staging-and-split-commits
description: >-
  Git procedures for EnergyCenter: align staging with release (fetch, rebase, JIRA
  keys), and split .cursor/ agent config commits from frontend application commits
  then rebase onto release. Use when the user mentions staging vs release, split
  cursor commits, or separating agent rules from app code.
---

# Staging ↔ release and split `.cursor` commits

## 1. Sync `staging` with `release`

Full procedure (fetch, rebase, dedupe commits, **POST-*** JIRA handling, push policy): **`.cursor/docs/workflows/playbooks/git-bitbucket/staging-rebase-onto-release.md`**.

- Execute git steps in the shell from the **repository root** when acting as agent.
- Confirm **force-with-lease** policy for **`origin/staging`** with the team before rewriting history.

## 2. Split `.cursor/` vs application commits

When work mixes **`.cursor/`** with **`frontend/src/**`** (or other app paths), follow **`.cursor/docs/workflows/playbooks/git-bitbucket/split-cursor-commit-rebase.md`**:

- Stash **`.cursor`** → commit/amend **application** only on the feature branch → apply **`.cursor`** on **`release`** (or team branch) → rebase feature onto updated **`release`**.
- Use separate commit messages (e.g. **`POST-<n>:`** for app, **`00000:`** for cursor-only) per team rules in **`.cursor/rules/commit-workflow.mdc`**.
- After commits that change **`frontend/`** application code, run **`npm run test-update`** in **`frontend/`** per **`.cursor/rules/task-verification.mdc`** (and stage coverage if your team commits it).

## Related

- **`.cursor/rules/git-workflow.mdc`** — SCOPE separation for commits
- **`.cursor/skills/bitbucket-pr-workflows/SKILL.md`** — PR rebase onto release
