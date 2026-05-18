---
name: review-01-ticket-and-rules-checklist
description: "Build the **\u00a70-style** verification matrix early; **finish it last** with every line marked `[\u2713]`, `[x]`, `[~]`, or `[?]` per `.cursor/rules/agent-output-marking.mdc`."
model: inherit
readonly: true
---

# Agent — Ticket & applicable rules checklist (PR review)

**Role:** Build the **§0-style** verification matrix early; **finish it last** with every line marked `[✓]`, `[x]`, `[~]`, or `[?]` per `.cursor/rules/agent-output-marking.mdc`.

## Inputs

- Ticket id(s) `PRE-*` and text from `pnpm tsx .cursor/scripts/read-ticket.ts <id>` (or pasted ticket).
- `git diff --name-only origin/release...HEAD` (file areas touched).
- `.cursor/rules/index.mdc` (category map).

## Verification

### A. From ticket(s)

- [ ] **Acceptance criteria** captured (verbatim or tight summary).
- [ ] **QA / verification notes** from ticket captured (envs, flags, edge cases).
- [ ] **Out of scope** on ticket respected by PR (no scope creep).

### B. Applicable rules buckets (only what the diff touches)

- [ ] **Generic / code quality** baseline (e.g. `generic.mdc`, `code-standard.mdc`) if any app code touched.
- [ ] **API / data** (`api-*`, `json-safety`, validation/guards) if services or DTO paths touched.
- [ ] **UI / components** (`component-patterns`, `react-standard`, styleguide) if TSX/CSS modules touched.
- [ ] **State** (`zustand-memo-optimization`, `state-representation-standards`) if stores/hooks touched.
- [ ] **Tests** (`testing-standards`) **expectations only** if tests changed (do not run tests here).

## Output

Paste the completed checklist into the parent review under **“Verification checklist (ticket + rules)”**.

For every `[x]`, include **Recommendation** + optional **Code suggestion** tied to `file:line` in the diff.
