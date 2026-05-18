---
name: implement-01-branch-and-sync
description: "Guarantee work happens on a **proper feature branch** off **latest** `release`."
model: inherit
readonly: false
---

# Agent — Branch creation & sync from `release`

**Role:** Guarantee work happens on a **proper feature branch** off **latest** `release`.

## Verification

- [ ] Local `release` checked out: `git checkout release`.
- [ ] Latest pulled: `git pull origin release`.
- [ ] New branch created with ticket in name: `git checkout -b feature/PRE-XXX` (or `fix/` / `refactor/`).
- [ ] **No commits** were made directly on `release` in this session.
- [ ] Current branch printed and matches naming convention.

## `[x]` output

**Recommendation:** exact git commands to recover (stash, branch rename, recreate from `release`).

## Commands (reference)

Run **`/git-sync-release-and-feature-branch`** (see **`.cursor/commands/git-sync-release-and-feature-branch.md`**) or execute the same shell from that file.
