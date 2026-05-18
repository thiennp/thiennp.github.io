---
name: split-cursor-commit-rebase
description: Splits Cursor/Codex agent asset changes from application changes, commits assets on release, amends app work, and rebases the branch.
---

# Split Agent Assets and Rebase

Use this when you want application work amended on your feature branch, agent
asset changes committed separately on `release`, and the feature branch rebased
onto `release`.

## What the script does

1. Stashes changes under **`.cursor`** and **`.codex`** when the script supports both scopes.
2. If anything remains outside the agent asset paths, stages it and runs **`git commit --amend -m "<first message>"`** on the current branch.
3. Checks out **`release`**, **`git pull origin release`**, pops the stash, commits agent asset changes with **`git commit -m "<second message>"`** if there is something to commit.
4. Checks out your original branch and runs **`git rebase release`**.

**Requirements:** Run from the **repo root** on a **feature branch** (not `release`). Resolve conflicts manually if `pull` or `rebase` stops.

## Fill in commit messages (then run)

Replace the placeholders with your real messages (keep quoting if they contain spaces or special characters).

| Placeholder             | Used for                                                                            |
| ----------------------- | ----------------------------------------------------------------------------------- |
| `COMMIT_MESSAGE_AMEND`  | **`git commit --amend`** on your feature branch (all changes **outside** `.cursor`) |
| `COMMIT_MESSAGE_CURSOR` | **`git commit`** on **`release`** for **`.cursor`** only                            |

Example messages:

- **Amend:** `PRE-1234: (feat) Short description of app change`
- **Cursor:** `00000: (chore) docs(cursor): Short description of rule/prompt updates`

## Command

From the repository root:

```bash
bash scripts/git/split-cursor-commit-rebase.sh \
  "COMMIT_MESSAGE_AMEND" \
  "COMMIT_MESSAGE_CURSOR"
```

Do **not** add this script to **`package.json`**: scripts there are **application / product** commands only (see **`@git-workflow.mdc`** package script guidance).

## After it finishes

- Your feature branch is rebased on **`release`**; you may need **`git push --force-with-lease`** to update the remote feature branch.
- **`release`** has a new local commit if **`.cursor`** changed; push only if your workflow allows: **`git push origin release`**.

## Help

```bash
bash scripts/git/split-cursor-commit-rebase.sh --help
```
