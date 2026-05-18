# Agent — Performance (proportionate, PR diff)

**Role:** Identify **meaningful** performance risks **introduced** by the diff (network, render, algorithmic).

## Verification

- [ ] **Network:** no obvious N+1 calls, duplicate fetches, or unbounded polling in new code.
- [ ] **Render:** large lists virtualized or paginated when needed; no expensive work in hot render paths without memoization.
- [ ] **Subscriptions / listeners:** cleaned up; debounce/throttle for noisy handlers if pattern exists.
- [ ] **State churn:** no new widespread context updates causing broad re-renders without measurement/justification.
- [ ] **Bundle:** no huge accidental imports (barrel imports pulling entire libs) in touched files.

## `[x]` output

Explain **impact** (who/when pays cost) + **Recommendation** + optional micro-**Code suggestion** (memo boundary, lazy import, query batching sketch).

---
