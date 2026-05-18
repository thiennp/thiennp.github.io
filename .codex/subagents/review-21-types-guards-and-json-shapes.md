---
name: review-21-types-guards-and-json-shapes
description: "Ensure **changed** types align with `typescript-standards`, `type-file-organization`, `typeguard-patterns`, `json-safety`."
model: inherit
readonly: true
---

# Agent — TypeScript, DTOs, JSON safety, type guards (PR diff)

**Role:** Ensure **changed** types align with `typescript-standards`, `type-file-organization`, `typeguard-patterns`, `json-safety`.

## Verification

- [ ] **Readonly fields** on DTOs/view models where values should be immutable.
- [ ] **Narrowing:** no unsafe `as` casts without guard; prefer `is*` guards / schema validators already used in repo.
- [ ] **Types live in the right files** (not giant inline anonymous types repeated).
- [ ] **Enums / unions** validated at boundaries per `enum-validation-pattern` if applicable.
- [ ] **Optional vs null** semantics consistent (`null` vs `undefined`) with existing modules.
- [ ] **Exports:** public surface minimal; no unnecessary deep barrel exports if project discourages.

## `[x]` output

Show a **small guard** or **interface tweak** example; reference **`typeguard-patterns`** / **`json-safety`** explicitly.
