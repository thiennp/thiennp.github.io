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

Run **`/command-git-sync-release-to-feature-branch`** (see **`.cursor/commands/command-git-sync-release-to-feature-branch.md`**) or execute the same shell from that file.

---
