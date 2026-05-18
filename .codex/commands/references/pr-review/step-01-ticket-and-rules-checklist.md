# Agent — Ticket & applicable rules checklist (PR review)

**Role:** Build the **§0-style** verification matrix early; **finish it last** with every line marked `[✓]`, `[x]`, `[~]`, or `[?]` per `.cursor/skills/skill-agent-verification-reporting/SKILL.md`.

## Inputs

- Ticket id(s) `PRE-*` and text from `pnpm tsx .agents/scripts/read-ticket.ts <id>` (or pasted ticket).
- `git diff --name-only origin/release...HEAD` (file areas touched).
- Repo-root **`.cursor.json`** registry plus the **`.cursor/rules/*.mdc`** bundles (specialized filenames list which standard applies).

## Verification

### A. From ticket(s)

- [ ] **Acceptance criteria** captured (verbatim or tight summary).
- [ ] **QA / verification notes** from ticket captured (envs, flags, edge cases).
- [ ] **Out of scope** on ticket respected by PR (no scope creep).

### B. Applicable rules buckets (only what the diff touches)

- [ ] **Generic / code quality** baseline (e.g. `rules-bundle-core.mdc`, `rules-typescript-clean-code.mdc`) if any app code touched.
- [ ] **API / data** (`rules-bundle-api.mdc`, `rules-typescript-clean-code.mdc` (JSON safety), validation/guards) if services or DTO paths touched.
- [ ] **UI / components** (`rules-typescript-clean-code.mdc`, `rules-bundle-react.mdc`, styleguide) if TSX/CSS modules touched.
- [ ] **State** (`rules-state-zustand.mdc`) if stores/hooks touched.
- [ ] **Tests** (`rules-bundle-testing.mdc`) **expectations only** if tests changed (do not run tests here).

## Output

Paste the completed checklist into the parent review under **“Verification checklist (ticket + rules)”**.

For every `[x]`, include **Recommendation** + optional **Code suggestion** tied to `file:line` in the diff.

---
