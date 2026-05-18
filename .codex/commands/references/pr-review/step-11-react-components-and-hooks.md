# Agent — React components, hooks, JSX patterns (PR diff)

**Role:** Review **changed** TSX/hooks for React correctness, readability, and alignment with **project** rules (`react-standard`, `jsx-best-practices`, `functional-principles`, `zustand-memo-optimization` when relevant).

## Verification

- [ ] **Conditional JSX:** nullable/boolean rendering follows **`renderIfNotNull` / `renderWithCondition`** where the codebase does (see `rules-typescript-clean-code.mdc`); no risky `&&` on numbers/strings if that violates local pattern.
- [ ] **Hooks rules:** no conditional hooks; dependency arrays correct; no obviously **unstable** objects/functions in `useEffect` deps without mitigation.
- [ ] **Memoization:** `useMemo` / `useCallback` / `memo` used **only** when justified (expensive child, referential identity); no blanket memo noise.
- [ ] **Effects:** effects do not duplicate fetch/state sync in ways that cause loops; cleanup for subscriptions/timers if introduced.
- [ ] **Error boundaries / fallbacks:** sensible for new async UI if pattern exists in feature area.
- [ ] **Lists & keys:** stable keys; no index keys for dynamic/reorderable lists when avoidable.
- [ ] **Imports & types:** props/interfaces align with `typescript-standards` (e.g. `readonly` fields) in touched code.

## `[x]` output

Per issue: `file:line`, **Recommendation**, optional **Code suggestion** showing the idiomatic project pattern.

---
