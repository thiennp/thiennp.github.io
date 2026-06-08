# Wishees QA Cycle 01 Cursor Handoff

Date: 2026-06-06 Europe/Berlin
Target: https://wishees/
Project to fix: /Users/thien.nguyen/codex-worktrees/chords
QA artifact folder: /Users/thien.nguyen/thiennp.github.io/codex-automations/wishees-loop-20260605T223814Z

## Execution Summary

I ran a clean bounded QA cycle against the released Wishees site and stopped at the 15-minute checkpoint.

- Core command: `node runner.mjs --reset --duration-minutes 15 --telemetry-minutes 5`
- Core runtime: 15 minutes, 92 matrix cycles
- Additional checks: browser smoke, explicit viewer/disabled boundary smoke, UI/i18n smoke, friend mutation permission probe, cleanup, owner/friend snapshots
- Events logged: 5072 lines in `events.jsonl`
- Telemetry logged: 195 lines in `telemetry.jsonl`
- Coverage state: 136 keys tracked, 62 covered in this slice
- Final cleanup: owner outcomes empty; friend graph restored to expected baseline

Final friend snapshot:

```json
{
  "alex": { "connectedIds": [14, 13], "incoming": [], "outgoing": [] },
  "maya": { "connectedIds": [1, 12], "incoming": [], "outgoing": [] },
  "jordan": { "connectedIds": [12], "incoming": [], "outgoing": [] },
  "lina": { "connectedIds": [], "incoming": [], "outgoing": [] }
}
```

## Bugs To Fix

### BUG-003 - CRITICAL - Viewer shared wishlist page creates a friend connection

This is the highest priority bug from this cycle.

Steps:

1. Ensure `e2e-lina@wishees.local` has no connected friends.
2. Log in as `e2e-lina@wishees.local`.
3. `GET /friends/wishlist?invite=user-12&lang=de`.
4. Read `/api/friends/connected` for Lina.

Actual:

- Before page visit: Lina connected friends was `[]`.
- The read-only shared wishlist page returned `200`.
- After page visit: Lina connected friends contained Alex user `12`.

Evidence:

```json
{
  "runId": "20260605230129",
  "before": { "status": 200, "body": { "friends": [], "ok": true, "ownerUserId": 15 } },
  "page": {
    "method": "GET",
    "route": "/friends/wishlist?invite=user-12&lang=de",
    "status": 200,
    "contentType": "text/html"
  },
  "after": {
    "status": 200,
    "body": {
      "friends": [
        { "email": "e2e-alex@wishees.local", "friendUserId": 12, "label": "E2E Alex" }
      ],
      "ok": true,
      "ownerUserId": 15
    }
  }
}
```

Expected:

- A viewer must not create, accept, or persist friend/network relationships by opening a read-only shared wishlist URL.
- The page may render allowed read-only content, but it must not mutate friend graph state.
- Add regression coverage for viewer + shared wishlist visit.

### BUG-001 - MAJOR - Concurrent owner wishlist saves lose one newly created item

The race still reproduced in the release.

Steps:

1. Open two authenticated Alex sessions.
2. Read the same `/api/account/wishlist` baseline in both sessions.
3. Submit two `PUT /api/account/wishlist` requests at the same time, each adding a different item.
4. Fetch `/api/account/wishlist`.

Actual:

- Reproduced 70 times across 92 same-owner race attempts in this 15-minute slice.
- Latest bug evidence run: `20260605224001`.
- Latest failure pattern: final wishlist contained race item A but not race item B.

Expected:

- Concurrent owner saves must not lose newly created items.
- If optimistic conflict control is used, the client/server must merge or retry safely.
- A failed concurrent save must not leave the user's persisted wishlist missing a valid item from a simultaneous successful save.

Likely area:

- `PUT /api/account/wishlist`
- Account wishlist persistence / merge logic
- Any optimistic revision or overwrite guard around wishlist arrays

### BUG-002 - MINOR - UI/i18n issues on German authenticated routes

The tightened UI/i18n smoke found 3 real failing scenarios.

Command:

```bash
NODE_PATH=/Users/thien.nguyen/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules \
/Users/thien.nguyen/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node ui-i18n-smoke.mjs
```

Failing scenarios:

1. `/my-wishees?lang=de` as Alex, mobile 320x680
   - `<html lang>` is `en`, expected `de`.
   - German helper copy overflows horizontally: span left `107`, right `387` on a 320px viewport.
   - The `E2E Maya` button text is clipped: scrollWidth `43`, clientWidth `37`.
   - Screenshot: `/Users/thien.nguyen/thiennp.github.io/codex-automations/wishees-loop-20260605T223814Z/logs/ui-i18n-20260605225748-my-wishees-de-mobile-alex.png`

2. `/friends?lang=de` as Maya, desktop 1440x900
   - `<html lang>` is `en`, expected `de`.
   - Screenshot: `/Users/thien.nguyen/thiennp.github.io/codex-automations/wishees-loop-20260605T223814Z/logs/ui-i18n-20260605225748-friends-de-desktop-maya.png`

3. `/friends/wishlist?invite=user-12&lang=de` as Maya, mobile 320x680
   - `<html lang>` is `en`, expected `de`.
   - Page has 24px horizontal overflow.
   - The anchor `Ähnliches Produkt bei Amazon finden` extends right to `344` on a 320px viewport.
   - Screenshot: `/Users/thien.nguyen/thiennp.github.io/codex-automations/wishees-loop-20260605T223814Z/logs/ui-i18n-20260605225748-friend-wishlist-de-mobile-maya.png`

Expected:

- German routes must emit `html lang="de"` after authenticated navigation.
- Mobile routes must not have horizontal overflow at 320px.
- Text inside buttons/anchors must not clip.
- Add regression tests for German authenticated route lang propagation and mobile overflow.

## Passing Checks In This Cycle

- Disabled direct/shared boundaries stayed denied.
- Lina explicit viewer wishlist update/delete-shaped PUTs returned `403 invalid-action`.
- Browser smoke did not add a new bug for Maya contribution or Alex notifications.
- Final owner outcomes were empty.
- Final friend graph was restored after cleanup.

## Verification Commands For Cursor

Run project-local checks from the Chords repo:

```bash
npm run commit:check
npm run prepush:check
```

After pushing a fix, QA will rerun:

```bash
node runner.mjs --reset --duration-minutes 15 --telemetry-minutes 5
NODE_PATH=/Users/thien.nguyen/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules /Users/thien.nguyen/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node browser-smoke.mjs
node boundary-smoke.mjs
NODE_PATH=/Users/thien.nguyen/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules /Users/thien.nguyen/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node ui-i18n-smoke.mjs
node runner.mjs --friend-snapshot
```

## Notes For Cursor

- The local Chords worktree at `/Users/thien.nguyen/codex-worktrees/chords` currently has staged changes unrelated to this handoff. Do not lose or revert user work.
- Prefer working from a clean `origin/main` clone/worktree when pushing these fixes.
- Do not use `--no-verify`.
- Keep user-visible copy/docs accurate if route behavior or localization changes.
