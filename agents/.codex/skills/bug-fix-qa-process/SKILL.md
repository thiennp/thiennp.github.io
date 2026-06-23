---
name: bug-fix-qa-process
description: Use whenever Thien asks Codex to fix a bug, handle a PRE/Jira bug ticket, prepare a bug fix for QA, or continue a bug-fix implementation. Coordinates Cursor for implementation when requested, Codex review, verification, PR creation, and staging cherry-pick for QA.
---

# Bug Fix QA Process

Use this workflow for bug tickets, especially PRE/Jira issues in `enrg-web-frontend`.

## Default Flow

1. **Read the ticket first**
   - Fetch Jira with repo tooling when available, e.g. `pnpm exec tsx .agents/scripts/read-ticket.ts PRE-XXXX`.
   - Capture summary, status, comments, requirements, and testing notes.
   - If Atlassian connector fails, use repo tooling or pasted context.

2. **Classify the work**
   - Use bug-fix workflow for defects, regressions, styling mismatches, broken state, or QA fixes.
   - Use feature workflow only when the ticket adds a new capability or broad behavior.
   - For visual/style bugs, identify the smallest owned component/style file before editing.

3. **Coordinate agents**
   - If the user asks to coordinate with Cursor/Claude, ask them for read-only recommendations first.
   - Use Cursor for implementation when the user requests it or the bug is code-facing.
   - If an agent hangs or gives no useful output, stop it and continue from ticket plus code evidence.

4. **Branch safely**
   - Do not mutate `release` directly.
   - Fetch origin, checkout `release`, fast-forward pull, then create `fix/PRE-XXXX-short-slug`.
   - Before PR, rebase the fix branch onto latest `origin/release`.

5. **Implement narrowly**
   - Fix the root cause with the smallest reasonable change.
   - Avoid unrelated refactors, formatting churn, or broad style changes.
   - Add/update durable bug docs under `docs/bugs/PRE-XXXX-*.md`.

6. **Verify**
   - Run focused tests for affected files/components first.
   - Run `pnpm run typecheck` for application changes.
   - If the package has no requested script such as `test-update`, say so and run the nearest available project check.
   - For visual fixes, include QA notes for exact devices/surfaces to inspect.

7. **Review and commit**
   - Codex reviews the diff before commit.
   - Commit message format:
     `PRE-XXXX: (fix) Short imperative summary`
   - Include body lines for root cause, fix, and prevention.

8. **Create PR**
   - Push the fix branch.
   - Create a Bitbucket PR to `release` using repo tooling when available, e.g. `pnpm bb:create-pr`.
   - PR description should include summary, verification, and QA notes.

9. **Prepare QA staging when requested**
   - Use the existing staging worktree if `staging` is checked out elsewhere.
   - Fetch origin and rebase local `staging` onto `origin/staging`.
   - If local staging is ahead/behind, inspect with `git cherry -v origin/staging staging`; patch-equivalent duplicates can be skipped by rebase.
   - Cherry-pick the fix commit onto staging.
   - Run focused staging verification.
   - Push `staging` to origin.
   - Report the staging commit and QA instructions.

## Reporting Notes

- For Jira/Bitbucket bug work, report automatically to Daily Magic.
- Use existing Daily Magic thread/action when supplied.
- Report PR creation, staging update, verification failures, and final done status.

## Final Response

Keep it short:
- What changed.
- PR link.
- Fix commit and staging commit.
- Verification run.
- QA checklist and any caveats.
