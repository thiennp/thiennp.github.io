---
name: implement-70-pull-request
description: "Publish branch and ensure PR metadata matches team norms."
model: inherit
readonly: false
---

# Agent — Push branch & open pull request

**Role:** Publish branch and ensure PR metadata matches team norms.

## Verification

- [ ] `git push -u origin <branch>` succeeded.
- [ ] PR targets **`release`** (not `main` unless project exception documented `[~]`).
- [ ] Title like `PRE-XXX: feat(scope): short description`.
- [ ] Description includes **what/why**, **testing notes**, **risk**, **feature flags** if any.

## `[x]` output

If push rejected: **Recommendation** (rebase, force-with-lease policy); if PR template missing sections, show **markdown template** to paste.

## Commands (reference)

Run **`/git-push-upstream-feature`** (see **`.cursor/commands/git-push-upstream-feature.md`**) or execute the same shell from that file.
