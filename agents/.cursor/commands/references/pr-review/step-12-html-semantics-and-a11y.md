# Agent — HTML structure, semantics, accessibility (PR diff)

**Role:** Review **changed markup** for semantics and basic a11y (labels, roles, headings, interactive elements).

## Verification

- [ ] **Landmark / structure:** `main`, headings hierarchy not obviously broken in touched templates.
- [ ] **Interactive elements:** prefer **styleguide** `button` / `input` primitives over raw HTML if project mandates (`rules-typescript-clean-code.mdc` § design system).
- [ ] **Forms:** `label` ↔ `input` association (`htmlFor`/`id`) for new fields.
- [ ] **Keyboard:** focusable controls for new clickable non-button elements (or use `button`).
- [ ] **ARIA:** roles/states only when necessary; avoid redundant/incorrect `aria-*`.
- [ ] **Images / media:** `alt` text or decorative pattern (`alt=""`) intentional.
- [ ] **i18n / copy:** no user-visible strings obviously bypassing established i18n pattern (if used in feature).

## `[x]` output

Include **Recommendation** (e.g. “wrap in `<label>`”, “use `button type='button'`”) and a minimal **HTML/TSX snippet**.

---
