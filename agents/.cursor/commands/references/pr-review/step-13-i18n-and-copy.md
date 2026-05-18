# Agent — i18n, strings, copy (PR diff)

**Role:** Ensure user-visible strings and message keys follow established localization patterns in touched code.

## Verification

- [ ] No **hard-coded** user-visible strings where the feature area consistently uses i18n helpers/keys.
- [ ] **Interpolation** uses safe patterns (no raw HTML concatenation for translated strings).
- [ ] **Pluralization / gender** handled if grammar requires it in touched locales.
- [ ] **Error messages** surfaced to users are translated consistently with adjacent code.

## `[x]` output

Provide **key naming suggestion**, **Recommendation** to swap to project i18n helper, and a short **before/after** snippet.

---
