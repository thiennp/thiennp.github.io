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
- [ ] Commit message format (Husky **`.husky/commit-msg`**):

```text
PRE-${ticketNumber}: (<type>) Description
# non-ticket:
00000: (<type>) Description
```

Allowed **types:** `feat`, `fix`, `chore`, `refactor`, `docs`, `test`, `style`, `perf`, `build`, `ci`.

## `[x]` output

If too mixed: **Recommendation** to split commits; show `git add -p` or multiple commit plan.

## Commit types

`feat` | `fix` | `docs` | `refactor` | `chore` | `test` | `style` | `perf` | `build` | `ci`

---
