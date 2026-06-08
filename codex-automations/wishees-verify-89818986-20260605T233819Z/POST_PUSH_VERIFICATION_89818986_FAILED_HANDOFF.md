# Wishees Post-Push Verification Handoff - commit 89818986c9eefbfa61726b2e2ab4eac74454aa96

Date: 2026-06-06 Europe/Berlin
Target: https://wishees/ resolved by harness to https://www.wishees.com
Project: Chords / Wishees
Cursor commit under verification: 89818986c9eefbfa61726b2e2ab4eac74454aa96 on origin/main
QA artifact folder: /Users/thien.nguyen/thiennp.github.io/codex-automations/wishees-verify-89818986-20260605T233819Z

## Executive Summary

Post-push verification is still FAILED.

The second Cursor fix improved the previous browser/UI failures:
- Viewer shared wishlist no longer creates a Lina -> Alex friend connection.
- German/mobile UI and translation smoke did not report new lang/overflow/console bugs.
- Browser contribution flow now returns JSON and no longer logs notification 401s.
- Viewer/disabled boundary smoke remained clean.

However, the owner wishlist concurrent-save race still reproduces in production.

## Remaining Bug To Fix

### BUG-001 - MAJOR - Concurrent owner wishlist saves lose one newly created item

Status: STILL REPRODUCIBLE after commit 89818986c9eefbfa61726b2e2ab4eac74454aa96.

Frequency:
- 9 failures in 93 attempts during the 15-minute matrix run.
- First seen: 2026-06-05T23:39:58.176Z.
- Last seen: 2026-06-05T23:51:35.781Z.

Steps:
1. Open two authenticated Alex sessions.
2. Read the same wishlist baseline in both sessions.
3. Submit two simultaneous `PUT /api/account/wishlist` requests, each adding a different item.
4. Fetch `GET /api/account/wishlist`.

Actual:
- Final wishlist sometimes contains only race item A or only race item B.
- Example first failure: final read had `wish_codex_matrix_20260605233847_race6_b` and was missing `race6_a`.
- Example latest failure: final read had `wish_codex_matrix_20260605233847_race78_a` and was missing `race78_b`.

Expected:
- Both concurrently added items survive.
- No stale full-list save should delete or supersede a concurrently inserted item.

Evidence:
- Primary bug file: `/Users/thien.nguyen/thiennp.github.io/codex-automations/wishees-verify-89818986-20260605T233819Z/bugs.json`
- Full request/response log: `/Users/thien.nguyen/thiennp.github.io/codex-automations/wishees-verify-89818986-20260605T233819Z/events.jsonl`
- Telemetry: `/Users/thien.nguyen/thiennp.github.io/codex-automations/wishees-verify-89818986-20260605T233819Z/telemetry.jsonl`
- State matrix: `/Users/thien.nguyen/thiennp.github.io/codex-automations/wishees-verify-89818986-20260605T233819Z/state.json`

Likely product-level issue:
- The API still accepts a full-list replacement payload from stale clients.
- Even with targeted DB upsert/delete, request B can still send a stale item set that omits request A's new ID, and server-side cleanup/removal semantics can treat that omission as an intentional delete.
- Fix likely needs conflict-safe semantics for concurrent list saves, such as optimistic revision/ETag rejection, per-item mutation endpoints, merge-by-item-id that does not delete unknown concurrent additions from stale baselines, or a transactional compare-and-merge design.

## Passing Checks To Preserve

### Critical viewer connection regression

Command:
`node viewer-shared-wishlist-connection-smoke.mjs`

Result:
- PASS.
- Lina opening `/friends/wishlist?invite=user-12&lang=de` did not create a friend connection.
- Final friend snapshot shows Lina `connectedIds: []`.

### Full 15-minute matrix

Command:
`node runner.mjs --reset --duration-minutes 15 --telemetry-minutes 5`

Result:
- Completed normally at 00:15:08.
- 93 matrix cycles.
- Bug count: 1.
- Remaining bug: BUG-001 only.
- Viewer/disabled auth and API boundary checks remained clean.
- Affiliate URL persistence, unsafe URL sanitization, shared wishlist reads, same-origin guards, and cleanup paths continued running.

### UI and translation smoke

Command:
`NODE_PATH=/Users/thien.nguyen/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules /Users/thien.nguyen/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node ui-i18n-smoke.mjs`

Result:
- PASS relative to known fixed issues.
- No new UI/i18n bugs were added.
- Screenshots saved under `/Users/thien.nguyen/thiennp.github.io/codex-automations/wishees-verify-89818986-20260605T233819Z/logs/`.

### Explicit viewer/disabled boundary smoke

Command:
`node boundary-smoke.mjs`

Result:
- PASS.
- No new viewer/disabled permission bugs.

### Browser smoke

Command:
`NODE_PATH=/Users/thien.nguyen/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules /Users/thien.nguyen/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node browser-smoke.mjs`

Result:
- PASS relative to prior BUG-002/BUG-004.
- Maya contribution flow now returned JSON:
  - `responseBodyKind: "json"`
  - `status: "contribution-promised"`
  - no console warnings/errors
  - no network failures
- No new browser/UI bugs were added.

## Cleanup / Final State

Final friend graph:
- Alex connectedIds: `[14, 13]`
- Maya connectedIds: `[1, 12]`
- Jordan connectedIds: `[12]`
- Lina connectedIds: `[]`

Final owner outcome cleanup:
- `node runner.mjs --list-owner-outcomes` returned `{"ok":true,"outcomes":[]}`.

Final bug file:
- `bugs.json` contains exactly one bug: BUG-001.

## Required Cursor Work

Please fix BUG-001 only unless you find directly related fallout.

Must preserve:
- Viewer shared wishlist must not create friend connections.
- Viewer sessions must not produce `/api/notifications` 401 console errors.
- Fetch-style fulfill/contribution requests must keep returning JSON.
- German `html lang` and mobile overflow fixes must remain passing.
- Viewer and disabled users must remain read-only/blocked.

Required verification before push:
- Add or update unit/integration tests that specifically reproduce stale concurrent full-list saves where two requests add different item IDs from the same baseline.
- Run `npm run commit:check`.
- Run `npm run prepush:check`.
- Do not use `--no-verify`.
- Commit and push to `origin/main`.

Final Cursor response must include:
- Changed files.
- Test commands run.
- Commit SHA.
- Push target.
