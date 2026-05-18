# Agent — Client state (stores, selectors, memoization) (PR diff)

**Role:** Review **changed** state code (Zustand/Context/local state) using `state-representation-standards`, `zustand-memo-optimization`, `server-side-state-isolation` where relevant.

## Verification

- [ ] **Single source of truth:** no duplicated competing sources for same datum.
- [ ] **Selectors:** fine-grained selectors; avoid returning fresh objects from store selectors without need.
- [ ] **Updates:** immutable update patterns; no silent partial mutations of shared objects.
- [ ] **Derived state:** prefer derivation over stored redundant fields unless performance dictates otherwise (justify in diff).
- [ ] **Server vs client cache:** boundaries respected; no hydration mismatch risks in changed SSR/client code (if applicable).
- [ ] **Effects vs events:** state changes occur in appropriate layer (event handler vs effect).

## `[x]` output

Recommend concrete pattern (selector split, shallow compare, store slice extraction) with **Code suggestion**.

---
