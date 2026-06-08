# BUG-001: Concurrent Owner Wishlist Saves Lose One Item

Date found: 2026-06-05T10:49:23Z  
Severity: MAJOR  
Target: `https://www.wishees.com`  
Artifact folder: `wishees-fresh-start-20260605T102928Z`

## Summary

During endurance testing, the owner wishlist concurrent-save race reproduced again. Two authenticated Alex sessions saved from the same baseline at the same time. One save can be rejected with `409 save-failed` while the other returns `200`, and the final wishlist contains only one of the two newly created race items.

Current sample: 62 failures across 94 same-owner race attempts.

Observed loss patterns:

- Run `20260605104906`: race item A missing, race item B present.
- Run `20260605105401`: race item A present, race item B missing.
- Run `20260605105754`: race item A missing, race item B present.
- Run `20260605110329`: race item A present, race item B missing.
- Run `20260605111022`: race item A present, race item B missing.
- Run `20260605111719`: race item A missing, race item B present.
- Run `20260605112418`: race item A present, race item B missing.

## Steps To Reproduce

1. Authenticate two independent sessions as Alex: `e2e-alex@wishees.local`.
2. In both sessions, read the same baseline from `GET /api/account/wishlist`.
3. In session A, submit `PUT /api/account/wishlist` with a new item `wish_codex_matrix_20260605104906_race2_a`.
4. In session B, at the same time, submit `PUT /api/account/wishlist` with a new item `wish_codex_matrix_20260605104906_race2_b`.
5. Fetch `GET /api/account/wishlist`.

## Actual

- Session A save returned `409` with body:

```json
{"ok": false, "reason": "save-failed"}
```

- Session B save returned `200`.
- Final wishlist contained `wish_codex_matrix_20260605104906_race2_b`.
- Final wishlist did not contain `wish_codex_matrix_20260605104906_race2_a`.
- Later reproduction inverted the loss: final wishlist contained race item A but not race item B.
- Latest reproduction also inverted the failed request: save B returned `409 save-failed`, save A returned `200`, and the final wishlist contained race item A only.

## Expected

Concurrent owner saves should not silently lose a valid newly created item. The system should either merge both additions safely or enforce an optimistic concurrency contract that prevents unnoticed data loss and gives the client a recoverable conflict state.

## Evidence

- Bug ledger: `bugs.json`, `BUG-001`
- Raw event log: `events.jsonl`
- First relevant run ID: `20260605104906`
- Latest relevant run ID: `20260605112418`
- Occurrences in `bugs.json`: `62`
- Same-owner race attempts in `state.json`: `94`
- Latest seen at: `2026-06-05T11:26:13.543Z`
- Parallel save A event: `feature=race`, `action="parallel save A"`, response `409 save-failed`
- Parallel save B event: `feature=race`, `action="parallel save B"`, response `200`
- Final read event: `feature=race`, `action="race final read"`, contains race item B only
- Opposite-side final read event: `feature=race`, `action="race final read"`, contains race item A only
- Recent final read event: `feature=race`, `action="race final read"`, contains race item B only
- Latest recorded bug final read event: `feature=race`, `action="race final read"`, contains race item A only

## Current Cleanup State

Cleanup after the finding completed successfully:

- Owner outcomes: `[]`
- Friend graph: unchanged
- Run-prefixed wishlist race artifacts were removed
