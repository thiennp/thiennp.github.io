# Post-Push Verification Failed Handoff

Date: 2026-06-06 Europe/Berlin
Verified commit: `3968032c5c6c4ca5f37e718ba0b4ffa623bc52ae`
Target: https://wishees/
Verification artifact folder: `/Users/thien.nguyen/thiennp.github.io/codex-automations/wishees-verify-3968032c-20260605T232431Z`

## Result

Cursor's first push fixed the critical viewer connection bug, and most German/mobile UI issues. Verification still failed. Do not start a new QA cycle as green yet.

## Fixed And Verified

### PASS - Viewer shared wishlist page no longer creates friend connection

Command:

```bash
node viewer-shared-wishlist-connection-smoke.mjs
```

Result:

```json
{
  "activeWorkflow": "viewer shared wishlist connection smoke passed",
  "identifiedBugs": []
}
```

Coverage detail:

```json
{
  "beforeIds": [],
  "pageStatus": 200,
  "afterIds": [],
  "createdConnection": false
}
```

### MOSTLY PASS - German route language and mobile overflow

The previous `html lang="en"` failures on authenticated German pages are fixed:

- `/my-wishees?lang=de` as Alex: `htmlLang: "de"`, no overflow, no clipped controls.
- `/friends?lang=de` as Maya: `htmlLang: "de"`, no overflow.
- `/friends/wishlist?invite=user-12&lang=de` as Maya: `htmlLang: "de"`, no 320px overflow.

## Still Failing

### BUG-001 - MAJOR - Concurrent owner wishlist saves still lose one item

Post-push verification command:

```bash
node runner.mjs --reset --duration-minutes 15 --telemetry-minutes 5
```

I stopped early after repeated repro because the fix failed by cycle 3 and continued through cycle 8.

Current sample:

- Same-owner race attempts before stop: `9`
- Bug occurrences: `6`
- Latest run ID: `20260605232539`
- Latest evidence: final wishlist had race item A present and race item B missing.

Latest final read evidence:

```json
{
  "runId": "20260605232539",
  "route": "/api/account/wishlist",
  "status": 200,
  "finalState": {
    "hasA": true,
    "hasB": false
  }
}
```

Expected:

- Two concurrent owner `PUT /api/account/wishlist` requests, each adding a different item from the same baseline, must leave both new items persisted.
- The first attempted fix still allows one save to overwrite the other under live production timing.

Please inspect the pushed merge/retry implementation around:

- `src/app/db/wishees-user-wishlist-rows.ts`
- `src/app/db/write-merged-user-wishlist-items.ts`
- `PUT /api/account/wishlist`

The live failure suggests the DB merge helper may not be active in the deployed path, the validation is insufficient, or a higher layer is still writing stale full-list payloads.

### BUG-002 - MINOR - Unconnected viewer shared wishlist notice fires 401 notifications request

Post-push UI/i18n command:

```bash
NODE_PATH=/Users/thien.nguyen/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules \
/Users/thien.nguyen/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node ui-i18n-smoke.mjs
```

Only failing scenario:

```json
{
  "name": "viewer-friend-wishlist-de-mobile-lina",
  "route": "/friends/wishlist?invite=user-12&lang=de",
  "status": 200,
  "htmlLang": "de",
  "overflowPx": 0,
  "consoleWarningsOrErrors": [
    {
      "type": "error",
      "text": "Failed to load resource: the server responded with a status of 401 ()"
    }
  ],
  "badResponses": [
    {
      "status": 401,
      "url": "https://www.wishees.com/api/notifications"
    }
  ]
}
```

Expected:

- A viewer/unconnected notice page should not trigger visible browser console errors.
- Either do not request `/api/notifications` for users who cannot access it, or handle expected 401 without noisy console/network failure.

Screenshot:

`/Users/thien.nguyen/thiennp.github.io/codex-automations/wishees-verify-3968032c-20260605T232431Z/logs/ui-i18n-20260605232747-viewer-friend-wishlist-de-mobile-lina.png`

### BUG-004 - MINOR - Maya browser contribution flow no longer completes cleanly

Post-push browser smoke command:

```bash
NODE_PATH=/Users/thien.nguyen/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules \
/Users/thien.nguyen/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node browser-smoke.mjs
```

Actual:

- Maya opens `/friends/wishlist?invite=user-12&lang=de`.
- Browser smoke submits a partial contribution for `Compact burr coffee grinder`.
- Response status is `200`, but response body is HTML (`responseBodyKind: "text"`) instead of a clean action/API result.
- Browser console also records 401 notification errors.

Evidence summary:

```json
{
  "session": "Maya browser context",
  "url": "https://www.wishees.com/friends/wishlist?invite=user-12&lang=de",
  "item": "Compact burr coffee grinder",
  "responseStatus": 200,
  "responseOk": true,
  "responseBodyKind": "text",
  "hasSupportPhrase": true,
  "consoleWarningsOrErrors": [
    { "type": "error", "text": "Failed to load resource: the server responded with a status of 401 ()" },
    { "type": "error", "text": "Failed to load resource: the server responded with a status of 401 ()" }
  ]
}
```

Expected:

- The contribution action should complete cleanly and return the expected API/action result consumed by the UI.
- The flow should not silently fall back to an HTML page response for the contribution submission.
- No browser console 401s during the flow.

## Passing Checks In Failed Verification

- Explicit viewer wishlist update/delete PUT shapes still return `403 invalid-action`.
- Disabled direct/shared boundaries stayed denied.
- Final owner outcomes are empty.
- Final friend graph restored to expected baseline:

```json
{
  "alex": { "connectedIds": [14, 13], "incoming": [], "outgoing": [] },
  "maya": { "connectedIds": [1, 12], "incoming": [], "outgoing": [] },
  "jordan": { "connectedIds": [12], "incoming": [], "outgoing": [] },
  "lina": { "connectedIds": [], "incoming": [], "outgoing": [] }
}
```

## Required Cursor Action

Fix the remaining failures, run all repository gates, commit, and push to `origin/main`.

Required checks:

```bash
npm run commit:check
npm run prepush:check
```

After push, QA will rerun the exact same verification commands from this folder.
