---
name: git-staging-and-split-commits
description: Defines EnergyCenter Git procedures for aligning staging with release and splitting Cursor/Codex agent asset commits from application work.
---

# Git Staging and Split Commits

Use this skill when EnergyCenter work mixes staging/release branch maintenance
with local Cursor or Codex agent asset changes.

## 1. Sync `staging` with `release`

Full procedure (fetch, rebase, dedupe commits, `POST-*` Jira handling, push policy): **`.cursor/docs/workflows/playbooks/git-bitbucket/staging-rebase-onto-release.md`**.

- Execute git steps in the shell from the **repository root** when acting as agent.
- Confirm **force-with-lease** policy for **`origin/staging`** with the team before rewriting history.

## 2. Split `.cursor/` vs application commits

When work mixes **`.cursor/`** with **`frontend/src/**`** (or other app paths), follow **`.cursor/docs/workflows/playbooks/git-bitbucket/split-cursor-commit-rebase.md`**:

- Stash agent asset changes, commit or amend application changes only on the feature branch, apply agent asset changes on **`release`** or the team branch, then rebase the feature branch onto updated **`release`**.
- Use separate commit messages (e.g. **`POST-<n>:`** for app, **`00000:`** for cursor-only) per team rules in **`.cursor/rules/commit-workflow.mdc`**.
- After commits that change **`frontend/`** application code, run **`npm run test-update`** in **`frontend/`** per **`.cursor/rules/task-verification.mdc`** (and stage coverage if your team commits it).

## 3. `enrg-cms-rev` staging visibility

When an Energy task touches `enrg-cms-rev`, especially CMS wireframe/template output, pushing to `staging` is not always enough for the change to appear in downstream staging pages.

After pushing the `enrg-cms-rev` change to `staging` and letting Jenkins deploy/activate CMS staging:

- Run the CMS wireframe import in the CMS GUI: `https://cms-rev.energie.check24-test.de/admin/check24/wireframe/import`
- Verify the CMS staging page directly, for example `https://cms-rev.energie.check24-test.de/strom`
- If the change must appear in emod/static frontend output, run the Backoffice CMS import/versioning page: `https://admin.energie.check24-test.de/cms/versioning.html`
- Re-check the consumer staging URL after the BO import, for example under `https://www.check24-test.de/` or `https://energie.check24-test.de/`

Context from prior CMS guidance: the wireframe import downloads wireframes from holding and applies replacement processing; BO import is needed when the same rendered CMS output must become visible in emod.

## Related

- **`.cursor/rules/git-workflow.mdc`** - SCOPE separation for commits
- **`.cursor/skills/bitbucket-pr-workflows/SKILL.md`** - PR rebase onto release
