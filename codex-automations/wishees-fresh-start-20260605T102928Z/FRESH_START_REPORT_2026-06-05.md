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

## Summary

Fresh start verification passed.

Fresh evidence produced:

- 909 raw events in `events.jsonl`
- 22 telemetry snapshots in `telemetry.jsonl`
- 0 live findings in `bugs.json`
- 124 coverage keys in `state.json`, with 115 exercised in this fresh run
- Browser UI evidence in `BROWSER_UI_EVIDENCE.json`

## Key Results

| Area | Status | Evidence |
|---|---|---|
| Owner concurrent wishlist save race | PASS | `race.same-owner-parallel-save` recorded `hasA=true`, `hasB=true`; no HTTP 500 bug entry. |
| Disabled direct shared wish boundary | PASS | `boundary.disabled-direct-shared-wish-page-denied` recorded `status=200`, `includesTitle=false`. |
| Selected-people direct allowed viewer | PASS | `wishlist.visibility.selected-people-direct-allowed-visible` recorded Maya as allowed and `visibleToMaya=true`, `status=200`. |
| Selected-people direct unlisted users | PASS | `wishlist.visibility.selected-people-direct-unlisted-hidden` recorded `leakedTo=[]`. |
| Gift support race | PASS | Concurrent helper support left one active outcome and did not over-commit. |
| Notification and outcome permissions | PASS | Non-owner, viewer, disabled, and anonymous mutation attempts stayed denied. |
| Viewer restrictions | PASS | Viewer wishlist, invite, and friend mutation boundaries stayed denied. |
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
node runner.mjs --jordan-fulfill-probe
node runner.mjs --decline-outcome-id 411 --decline-outcome-reply "Codex fresh start realtime decline 20260605T102928Z"
node runner.mjs --jordan-fulfill-probe
node runner.mjs --cleanup-only
node runner.mjs --list-owner-outcomes
node runner.mjs --friend-snapshot
node runner.mjs --list-owner-outcomes
```

Browser checks were run in the in-app browser against real Maya and Alex sessions.

## Artifact Map

- `runner.mjs`: clean copied verification runner
- `events.jsonl`: raw request/browser evidence
- `telemetry.jsonl`: fresh-start telemetry
- `bugs.json`: fresh live finding ledger, empty
- `state.json`: coverage and probe state
- `BROWSER_UI_EVIDENCE.json`: browser-level UI evidence
- `logs/`: per-probe stdout/stderr and cleanup snapshots

## QA Recommendation

This fresh-start pass can be reported as passed for the current retested matrix. No bugs were reproduced from a clean local test state.

