# Agent — Push branch & open pull request

**Role:** Publish branch and ensure PR metadata matches team norms.

## Verification

- [ ] `git push -u origin <branch>` succeeded.
- [ ] PR targets **`release`** (not `main` unless project exception documented `[~]`).
- [ ] Title like `PRE-XXX: (feat) Short description` (same shape as **`.husky/commit-msg`**; adjust type as needed).
- [ ] Description includes **what/why**, **testing notes**, **risk**, **feature flags** if any.

## `[x]` output

If push rejected: **Recommendation** (rebase, force-with-lease policy); if PR template missing sections, show **markdown template** to paste.

## Commands (reference)

Run **`/command-git-push-feature-upstream`** (see **`.cursor/commands/command-git-push-feature-upstream.md`**) or execute the same shell from that file.
