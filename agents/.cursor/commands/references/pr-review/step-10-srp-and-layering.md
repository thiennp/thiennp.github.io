# Agent — SRP, layering, and file boundaries (PR diff)

**Role:** Verify **separation of concerns** in **changed** code: UI vs hooks vs utils vs services/API vs constants/maps.

## Scope

Only **new/modified** files vs `origin/release...HEAD`. Cite `.cursor/rules/rules-typescript-clean-code.mdc` (file boundaries: constants, maps, testable units) when relevant.

## Verification

- [ ] **Components** mostly orchestrate UI; **no large pure logic** blocks left inline when they should be hooks/utils.
- [ ] **Hooks** encapsulate stateful React concerns; **no direct HTTP** in hooks if project pattern uses services (follow local conventions in touched code).
- [ ] **Utils** are pure/side-effect-light; easy to unit test; **no JSX** unless project explicitly allows render helpers.
- [ ] **Services / API** layer holds request/response shaping, retries, error translation — **not** presentational markup.
- [ ] **Constants / enum→UI maps** (`Record<Enum, Component>` etc.) live in **`* .constant.ts`** or dedicated modules, not merged into the main component file when that obscures testing boundaries.
- [ ] **One testable concern per file** for pure functions (split when a file mixes unrelated calculational utilities).

## `[x]` guidance

Always give **Recommendation** + **Code suggestion** (extract function, new file path, or skeleton):

```ts
// Before: giant handler inside Component
// After: feature/foo/utils/calculateFoo.ts + thin handler calling it
```

---
