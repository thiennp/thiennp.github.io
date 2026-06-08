# Wishees Fresh Start Verification Report

Report date: 2026-06-05  
Fresh artifact folder: `wishees-fresh-start-20260605T102928Z`  
Tested target: `https://www.wishees.com`

## Reset Performed

Removed the prior generated Wishees run folders from this workspace:

- `wishees-qa-campaign-20260605`
- `wishees-fix-verification-20260605T093847Z`
- `wishees-release-verification-20260605T101713Z`

Created a new clean folder and started from zero local state:

- `wishees-fresh-start-20260605T102928Z`

Note: I only removed the generated Wishees run folders from this thread. I did not delete unrelated workspace files or older non-run Wishees documents/screenshots outside those folders.

## Current Status

Fresh start verification initially passed, but continued endurance testing later found one live bug.

Current result: **not clean**.

Active finding:

- `BUG-001` / `MAJOR`: concurrent owner wishlist saves can still lose one newly created item. It reproduced 62 times across 94 same-owner race attempts.

Fresh evidence produced:

- 7117 raw events in `events.jsonl`
- 266 telemetry snapshots in `telemetry.jsonl`
- 1 live finding in `bugs.json`
- 128 coverage keys in `state.json`, with 128 exercised in this fresh run
- Browser UI evidence in `BROWSER_UI_EVIDENCE.json`

## Active Bugs

| ID | Severity | Status | Evidence |
|---|---:|---|---|
| BUG-001 | MAJOR | LIVE | Reproduced 62 times across 94 same-owner race attempts. During run `20260605104906`, save A returned `409 { ok:false, reason:"save-failed" }`, save B returned `200`, and final wishlist contained race item B but not race item A. Later runs also showed the opposite loss pattern. The latest recorded BUG-001 evidence is run `20260605112418`, where the final wishlist contained race item A but not race item B. |

Steps to reproduce:

1. Open two authenticated Alex sessions.
2. Read the same wishlist baseline in both sessions.
3. Submit two `PUT /api/account/wishlist` requests at the same time, each adding a different item.
4. Fetch `GET /api/account/wishlist`.

Actual behavior:

- Final wishlist had race item A `false`, race item B `true`; one save appears to have overwritten or rejected the other without preserving both valid additions.
- Later reproduction also showed race item A `true`, race item B `false`, confirming either concurrent side can be lost.

Expected behavior:

- Concurrent owner saves should not silently lose a valid newly created wish.
- Either both additions should be merged safely, or the losing client should receive a controlled conflict that preserves the server state contract and prevents unnoticed data loss.

## Key Results

| Area | Status | Evidence |
|---|---|---|
| Owner concurrent wishlist save race | FAIL | Endurance and follow-up runs reproduced data loss 62 times across 94 attempts. Latest recorded bug evidence, run `20260605112418`, ended with race item A present and race item B missing. |
| Disabled direct shared wish boundary | PASS | `boundary.disabled-direct-shared-wish-page-denied` recorded `status=200`, `includesTitle=false`. |
| Selected-people direct allowed viewer | PASS | `wishlist.visibility.selected-people-direct-allowed-visible` recorded Maya as allowed and `visibleToMaya=true`, `status=200`. |
| Selected-people direct unlisted users | PASS | `wishlist.visibility.selected-people-direct-unlisted-hidden` recorded `leakedTo=[]`. |
| Gift support race | PASS | Concurrent helper support left one active outcome and did not over-commit. |
| Maya UI partial offer | PASS | Headless Chrome UI flow submitted a 25 percent partial offer for `Compact burr coffee grinder`; fulfill response was HTTP 200 and created outcome `417`. |
| Notification and outcome permissions | PASS | Non-owner, viewer, disabled, and anonymous mutation attempts stayed denied. |
| Viewer restrictions | PASS | Viewer wishlist, invite, and friend mutation boundaries stayed denied. |
| Viewer explicit update/delete payloads | PASS | Lina update-shaped and delete-shaped `PUT /api/account/wishlist` requests returned `403 invalid-action`. |
| Viewer/disabled boundary repeat smoke | PASS | Added `boundary-smoke.mjs`; repeated Lina update/delete-shaped wishlist PUTs returned `403 invalid-action` with wishlist unchanged, and disabled direct shared wish page did not render the protected title. |
| Same-origin guards | PASS | Cross-origin-shaped owner outcome, notification read/delete, and friend invite attempts returned controlled denials. |
| Payment metadata containment | PASS | Private and selected payment metadata did not leak to unauthorized viewers. |
| Gift message security | PASS | HTML-shaped helper/owner messages did not produce a live finding. |
| Affiliate checks | PASS | Amazon and eBay affiliate probes completed with no bug entries. |

## Browser UI Checks

| UI check | Status | Evidence |
|---|---|---|
| Mobile 320px overflow | PASS | Maya friend wishlist at 320x680 had `documentScrollWidth=320`, `bodyScrollWidth=320`, `clientWidth=320`, `overflowPx=0`, and no overflowing elements. |
| Realtime support update | PASS | Maya's already-open friend wishlist displayed 10 percent support after Jordan support outcome `411`, without reload. |
| Realtime owner decline update | PASS | Maya's already-open friend wishlist cleared the 10 percent support after Alex declined outcome `411`, without reload. |
| Notification badge update | PASS | Alex notification badge changed from `2` to `1` immediately after marking one notification read, without reload. |
| Notification cleanup | PASS | After marking the second generated notification read and reloading, badge text was empty and read button count was `0`. |
| Maya UI partial offer | PASS | Actual browser UI opened the contribution form, saved the confirmation dialog, and received `200 { ok: true }` for `/api/friends/wishlist/fulfill`. |
| Browser repeat smoke | PASS | Added `browser-smoke.mjs` and reran Maya mobile overflow, Maya partial offer, and Alex notifications in bundled Playwright/Chrome. Mobile overflow remained `0`, Maya contribution returned HTTP 200 with support text visible, Alex notifications rendered, and no console warnings or request failures were captured. |

## Continuation Pass

After the initial fresh-start report, I continued the campaign against the same clean folder:

- Ran the extended same-origin guard probe.
- Added explicit Lina viewer update/delete-shaped wishlist denial evidence.
- Completed the Maya UI partial-offer browser flow.
- Marked browser-smoke coverage from the existing mobile, realtime, and notification UI evidence.
- Ran two additional core matrix cycles from the fully covered state.
- Ran another endurance cycle and focused high-risk boundary/security probes after the race finding.
- Ran five additional owner-save race cycles; the bug occurrence count increased from 1 to 4.
- Ran a 3-minute timed endurance loop with 1-minute telemetry. It completed 19 more matrix cycles and increased the race bug count from 4 to 15 across 30 total same-owner race attempts.
- Ran a 5-minute timed endurance loop with 1-minute telemetry. It completed 34 more matrix cycles and increased the race bug count from 15 to 42 across 64 total same-owner race attempts.
- A runner help check executed one default cycle because the runner does not implement a `--help` flag; it safely added one more BUG-001 reproduction.
- Rebalanced low-count coverage with focused probes for payment metadata, Amazon affiliate links, eBay affiliate links, same-helper gift intent, owner decision race, helper reply notifications, and friend invite boundaries. No new bug class was added.
- Added a reusable bundled Playwright browser smoke runner and repeated low-count browser/UI checks for Maya mobile overflow, Maya partial offer, and Alex notifications. The first automation attempt expected JSON from the contribution response, but the browser received a valid rendered server response with the saved support state; the false-positive bug entry was removed from the authoritative ledger and the script was corrected.
- Ran a 3-minute post-browser API endurance loop with 1-minute telemetry. It completed 18 matrix cycles and increased the race bug count from 43 to 55 across 83 total same-owner race attempts.
- Added a focused `boundary-smoke.mjs` repeat check for Lina viewer update/delete-shaped wishlist payloads and disabled direct access. The repeat stayed clean: both viewer PUT shapes returned `403 invalid-action`, Lina's wishlist remained empty, and the disabled direct shared wish page did not include the protected title.
- Ran a 2-minute post-boundary API endurance loop with 1-minute telemetry. It completed 11 matrix cycles and increased the race bug count from 55 to 62 across 94 total same-owner race attempts.

Final continuation status:

- `bugs.json` contains one live finding: `BUG-001`.
- `BUG-001` has 62 occurrences.
- Coverage is `128/128`.
- Final cleanup shows owner outcomes `[]`.
- Final friend graph has no unexpected pending requests or Lina connections.

## Cleanup State

Final owner outcome check:

```json
{
  "status": 200,
  "body": {
    "ok": true,
    "outcomes": []
  },
  "elapsedTime": "00:00:00"
}
```

Final friend graph snapshot:

- Alex: connected to `[14, 13]`, no incoming or outgoing requests
- Maya: connected to `[1, 12]`, no incoming or outgoing requests
- Jordan: connected to `[12]`, no incoming or outgoing requests
- Lina: connected to `[]`, no incoming or outgoing requests

## Commands Run

```bash
node runner.mjs --reset --cycles 1 --telemetry-minutes 30
node runner.mjs --gift-race-probe
node runner.mjs --visibility-probe
node runner.mjs --direct-wish-boundary-probe
node runner.mjs --friend-invite-probe
node runner.mjs --notification-permission-probe
node runner.mjs --helper-reply-notification-probe
node runner.mjs --gift-contribution-boundary-probe
node runner.mjs --friend-mutation-permission-probe
node runner.mjs --outcome-permission-probe
node runner.mjs --owner-decision-race-probe
node runner.mjs --same-helper-probe
node runner.mjs --payment-metadata-probe
node runner.mjs --gift-message-security-probe
node runner.mjs --affiliate-probe
node runner.mjs --affiliate-ebay-probe
node runner.mjs --same-origin-extended-probe
node runner.mjs --jordan-fulfill-probe
node runner.mjs --decline-outcome-id 411 --decline-outcome-reply "Codex fresh start realtime decline 20260605T102928Z"
node runner.mjs --jordan-fulfill-probe
node runner.mjs --cleanup-only
node runner.mjs --list-owner-outcomes
node runner.mjs --friend-snapshot
node runner.mjs --list-owner-outcomes
node runner.mjs --cycles 2 --telemetry-minutes 30
node runner.mjs --cycles 2 --telemetry-minutes 30
node runner.mjs --cycles 1 --telemetry-minutes 30
node runner.mjs --visibility-probe
node runner.mjs --direct-wish-boundary-probe
node runner.mjs --outcome-permission-probe
node runner.mjs --notification-permission-probe
node runner.mjs --same-origin-extended-probe
node runner.mjs --gift-message-security-probe
node runner.mjs --gift-contribution-boundary-probe
node runner.mjs --friend-mutation-permission-probe
node runner.mjs --cycles 5 --telemetry-minutes 30
node runner.mjs --duration-minutes 3 --telemetry-minutes 1
node runner.mjs --cleanup-only
node runner.mjs --list-owner-outcomes
node runner.mjs --friend-snapshot
node runner.mjs --duration-minutes 5 --telemetry-minutes 1
node runner.mjs --cleanup-only
node runner.mjs --list-owner-outcomes
node runner.mjs --friend-snapshot
node runner.mjs --help
node runner.mjs --payment-metadata-probe
node runner.mjs --affiliate-probe
node runner.mjs --affiliate-ebay-probe
node runner.mjs --same-helper-probe
node runner.mjs --owner-decision-race-probe
node runner.mjs --helper-reply-notification-probe
node runner.mjs --friend-invite-probe
node runner.mjs --cleanup-only
node runner.mjs --list-owner-outcomes
node runner.mjs --friend-snapshot
NODE_PATH=/Users/thien.nguyen/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules /Users/thien.nguyen/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node browser-smoke.mjs
node runner.mjs --cleanup-only
node runner.mjs --duration-minutes 3 --telemetry-minutes 1
node runner.mjs --cleanup-only
node runner.mjs --list-owner-outcomes
node runner.mjs --friend-snapshot
node boundary-smoke.mjs
node runner.mjs --duration-minutes 2 --telemetry-minutes 1
node runner.mjs --cleanup-only
node runner.mjs --list-owner-outcomes
node runner.mjs --friend-snapshot
node runner.mjs --cleanup-only
node runner.mjs --list-owner-outcomes
node runner.mjs --friend-snapshot
```

Browser checks were run in the in-app browser against real Maya and Alex sessions. The Maya UI partial-offer form submission was run with bundled Playwright against local Google Chrome because the in-app browser typing helper reported a virtual clipboard limitation.

## Artifact Map

- `runner.mjs`: clean copied verification runner
- `browser-smoke.mjs`: bundled Playwright browser smoke runner for repeated UI evidence
- `boundary-smoke.mjs`: focused viewer/disabled boundary repeat runner
- `events.jsonl`: raw request/browser evidence
- `telemetry.jsonl`: fresh-start telemetry
- `bugs.json`: fresh live finding ledger, currently contains `BUG-001`
- `state.json`: coverage and probe state
- `BROWSER_UI_EVIDENCE.json`: browser-level UI evidence
- `logs/`: per-probe stdout/stderr and cleanup snapshots

## QA Recommendation

Do not report the campaign as fully passed. The current matrix has one live endurance finding in the owner wishlist concurrent-save path.

Recommended next action:

1. Fix the owner wishlist concurrent-save behavior.
2. Rerun at least the core cycle race path repeatedly until no `Concurrent owner wishlist saves lose one newly created item` bug is reproduced.
3. Keep the already-passing visibility, permission, same-origin, notification, realtime, and browser UI checks in the regression set.
