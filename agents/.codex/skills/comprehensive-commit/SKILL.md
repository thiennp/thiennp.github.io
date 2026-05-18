---
name: comprehensive-commit
description: Performs a full EnergyCenter pre-commit review covering ticket context, architecture fit, rules, verification, staging scope, and commit text.
---

# Comprehensive Commit Review

## Purpose

Use this workflow when the change set is broad enough that a quick commit check
is not enough. The goal is to verify scope, quality, and traceability before
staging or committing.

## Inputs

- Jira ticket key, branch name, or a clear non-ticket reason for `00000`.
- `git status --short --branch`.
- `git diff --name-only` and, when files are staged, `git diff --staged --name-only`.
- Relevant repository rules from `.cursor/rules/`.

## Workflow

1. Establish traceability:
   - Resolve the ticket key from the branch or user input.
   - If the ticket script exists, read or assign the ticket with the repo-local `.cursor/scripts` tooling.
   - Capture acceptance criteria, explicit out-of-scope notes, and verification expectations.

2. Review the change set:
   - Group files by implementation, tests, documentation, configuration, and agent assets.
   - Flag unrelated edits that should be split into a separate commit.
   - Never modify `.gitignore` without explicit user approval.

3. Check implementation quality:
   - Confirm code follows local architecture and naming patterns.
   - Look for debug output, secrets, broad rewrites, dead code, and avoidable duplication.
   - Check TypeScript, React, API, state, styling, and test rules only when touched files make them relevant.

4. Verify with commands appropriate to the repo:
   - Prefer documented commands in `.cursor/rules/task-verification.mdc` or workflow docs.
   - For EnergyCenter frontend application changes, run `npm run test-update` from `frontend/` when required.
   - Record commands run, exit status, and any skipped command with the reason.

5. Stage intentionally:
   - Stage only the files that belong to the commit scope.
   - Recheck `git diff --staged --name-only`.
   - Re-read the staged diff before proposing a message.

6. Propose a commit message:
   - Ticket work: `PRE-1234: (type) concise description` or the repository-required equivalent.
   - Non-ticket work: `00000: (type) concise description`.
   - Keep one concern per message; split if the message needs "and".

## Safety

- Ask before running `git commit` or `git push`.
- Never commit directly on `release`.
- Do not bypass hooks with `--no-verify`.
- Do not stage secrets, local IDE files, logs, or unrelated runtime state.

## Output

Return a concise review with:

- Commit scope and files included.
- Issues found, grouped by severity.
- Verification commands and results.
- Proposed commit message.
- Any files intentionally left unstaged.
