---
name: implement-60-commit-scope-and-message
description: "Prepare a **clean** commit aligned with team conventions."
model: inherit
readonly: false
---

# Agent — Commit scope, SCOPE framework, message

**Role:** Prepare a **clean** commit aligned with team conventions.

## Verification

- [ ] `git branch --show-current` confirms feature/fix/refactor branch.
- [ ] `git status` reviewed; no accidental files.
- [ ] No debug logging / `TODO` left unintentionally.
- [ ] No secrets / credentials.
- [ ] Docs complete for this slice.
- [ ] Tests green per CI agent (or do not commit yet).
- [ ] **SCOPE** pass: Separate, Classify, Outline, Purpose, Exclude unrelated hunks.
- [ ] Staged files reviewed: `git diff --staged --name-only`.
- [ ] **Do not** auto-edit `.gitignore` unless ticket explicitly requires it.
- [ ] Commit message format:

```text
PRE-${ticketNumber}: type(scope): description
# non-ticket:
00000: type(scope): description
```

## `[x]` output

If too mixed: **Recommendation** to split commits; show `git add -p` or multiple commit plan.

## Commit types

`feat` | `fix` | `docs` | `refactor` | `chore`
