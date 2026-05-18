---
name: review-40-tests-readonly
description: "From **reading** changed tests and prod code, assess whether tests **plausibly** cover new behavior. **Do not** run `pnpm test` / `pnpm ci:test` here (orchestrator `review-pr` forbids)."
model: inherit
readonly: true
---

# Agent — Tests expectations (read-only, PR diff)

**Role:** From **reading** changed tests and prod code, assess whether tests **plausibly** cover new behavior. **Do not** run `pnpm test` / `pnpm ci:test` here (orchestrator `review-pr` forbids).

## Verification

- [ ] **Happy path** covered for new logic branches introduced.
- [ ] **Edge cases** implied by ticket AC appear reflected in tests (names/assertions).
- [ ] **Snapshots** (if used) seem intentional, not blanket updates hiding regressions.
- [ ] **Mocks** match real contracts (shape of DTOs, error types).
- [ ] **Flaky patterns** absent (hard-coded timers without fake timers pattern used in repo — see `testing-standards.mdc`).

## `[x]` output

Describe **gap** (missing branch/condition), **Recommendation** (“add vitest case for …”), optional **test skeleton** — not executed.
