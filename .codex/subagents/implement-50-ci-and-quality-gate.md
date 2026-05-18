---
name: implement-50-ci-and-quality-gate
description: "This is the **only** agent family in the implement flow authorized to run heavy verification commands."
model: inherit
readonly: false
---

# Agent — CI & quality gate (implementation must run commands)

**Role:** This is the **only** agent family in the implement flow authorized to run heavy verification commands.

## Verification

- [ ] `pnpm run typecheck` executed and **exit code 0** (or `[x]` with errors summarized).
- [ ] `pnpm ci:test` executed and **exit code 0** (per `task-verification.mdc` / original implement prompt).
- [ ] Iteration helpers (`pnpm run cursor:verify`, `vitest --changed`) optionally noted, but **do not replace** `pnpm ci:test`.
- [ ] If coverage/Sonar is in scope: new lines/conditions addressed per `testing-standards.mdc` (document what you validated).

## `[x]` output

For failures: paste **key** error snippets + **Recommendation** (fix order: types → unit → integration) + **Code suggestion** if obvious.

## Commands (reference)

Run the project command **`/ci-typecheck-and-ci-test`** (see **`.cursor/commands/ci-typecheck-and-ci-test.md`**) or execute the same shell from that file.
