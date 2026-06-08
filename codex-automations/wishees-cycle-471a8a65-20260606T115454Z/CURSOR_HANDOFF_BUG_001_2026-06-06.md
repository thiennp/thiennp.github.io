# Cursor Handoff - BUG-001 Regressed On Clean Origin Main

Date: 2026-06-06 Europe/Berlin
Project: Chords / Wishees
Clean origin main under test: `471a8a655714c25749029ff9e958bbdca7e976dd`
QA artifact folder: `/Users/thien.nguyen/thiennp.github.io/codex-automations/wishees-cycle-471a8a65-20260606T115454Z`
Target used by harness: `https://www.wishees.com`

## Summary

BUG-001 is back after resetting the Chords worktree to clean `origin/main`.

The 15-minute campaign was stopped early per instruction because a MAJOR bug was found:
- Reproduced in cycle 4.
- Reproduced again in cycle 5.
- Runner was stopped immediately after detection.
- Cleanup-only completed afterward.

## Bug

### BUG-001 - MAJOR - Concurrent owner wishlist saves lose one newly created item

Steps:
1. Open two authenticated Alex sessions.
2. Read the same wishlist baseline in both sessions.
3. Submit two `PUT /api/account/wishlist` requests at the same time.
4. Each request adds a different item from the same baseline.
5. Fetch `GET /api/account/wishlist`.

Actual:
- Final wishlist has only race item A and is missing race item B.
- First failure: `wish_codex_matrix_20260606115459_race4_a` present, `race4_b` missing.
- Latest failure: `wish_codex_matrix_20260606115459_race5_a` present, `race5_b` missing.

Expected:
- Both newly added items survive concurrent stale-baseline saves.
- A stale full-list save must not delete or overwrite a concurrent item the client never saw.

Evidence:
- Bug file: `/Users/thien.nguyen/thiennp.github.io/codex-automations/wishees-cycle-471a8a65-20260606T115454Z/bugs.json`
- Event log: `/Users/thien.nguyen/thiennp.github.io/codex-automations/wishees-cycle-471a8a65-20260606T115454Z/events.jsonl`
- Telemetry: `/Users/thien.nguyen/thiennp.github.io/codex-automations/wishees-cycle-471a8a65-20260606T115454Z/telemetry.jsonl`
- State matrix: `/Users/thien.nguyen/thiennp.github.io/codex-automations/wishees-cycle-471a8a65-20260606T115454Z/state.json`

Key telemetry:
- Cycle 1-3: clean.
- Cycle 4: BUG-001 detected.
- Cycle 5: BUG-001 detected again.
- `bugs.json` occurrences: 2.

## Required Cursor Work

Fix BUG-001 on clean `origin/main`.

Important constraints:
- Preserve current `origin/main` changes.
- Do not use `--no-verify`.
- Commit and push directly to `origin/main`.
- Add or update regression tests for concurrent full-list owner saves from the same stale baseline where two requests add different item IDs.
- Preserve prior passing behaviors:
  - Viewer shared wishlist must not create friend connections.
  - Viewer notification 401 fix must remain.
  - Fetch-style fulfill/contribution posts must return JSON.
  - German/mobile UI and translation behavior must remain clean.
  - Viewer and disabled users must remain blocked from mutations.

Required checks before push:
- `npm run commit:check`
- `npm run prepush:check`

After pushing:
- Start the app on `http://localhost:3000`.
- Leave the localhost server running for Codex verification.
- Report the server command and PID/port in the final response.

Final Cursor response must include:
- Changed files.
- Test commands run.
- Commit SHA.
- Push target.
- Localhost server status.
