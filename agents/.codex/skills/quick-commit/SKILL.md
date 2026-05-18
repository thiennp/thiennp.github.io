---
name: quick-commit
description: Prepares a small focused commit by inspecting status and diff, staging intended files, and proposing a repository-compliant message.
---

# Quick Commit

## Purpose

Use this for narrow changes where a lightweight review is enough. If the diff
touches multiple unrelated concerns, switch to `comprehensive-commit`.

## Workflow

1. Inspect the current branch and worktree:
   - Run `git status --short --branch`.
   - Confirm the branch is not `release`.
   - Identify ticket key from the branch, user input, or use `00000` for non-ticket work.

2. Review the files:
   - Run `git diff --name-only`.
   - Check the diff for unintended edits, debug code, local-only files, and secrets.
   - Treat `.cursor` or `.codex` changes as agent-asset changes and keep them separate from app code when practical.

3. Stage deliberately:
   - Stage only files that belong to the commit.
   - Run `git diff --staged --name-only`.
   - If the staged set mixes unrelated purposes, split it.

4. Propose a commit message:
   - Ticket work: `PRE-1234: (fix) short imperative summary`.
   - Non-ticket work: `00000: (chore) short imperative summary`.
   - Prefer `feat`, `fix`, `refactor`, `test`, `docs`, or `chore`.

5. Commit only after approval:
   - Show staged files and the proposed message.
   - Wait for explicit confirmation before `git commit`.
   - Ask again before any `git push`.

## Output

Return the staged file list, proposed message, verification performed, and any
remaining unstaged files.
