# Cursor Handoff: BUG-003 Second Follow-up - German UI Smoke Still Fails on Signed-in Routes

## Context

Codex stopped the previous Cursor agent because it became idle with no child process, no output, and no commit. The uncommitted patch in the Chords worktree was preserved and tested locally.

Worktree:

`/Users/thien.nguyen/.cursor/worktrees/chords/wishees-cycle-01-auto`

Current base before your next fix:

`origin/main` at `6f9a5973a340b5b9a4c967e52ddbe748781a2e38`

The existing uncommitted patch partially fixes BUG-003:

- `<html lang>` now matches German routes (`de`) in all smoke scenarios.
- React hydration `Minified React error #418` is no longer reported in the latest smoke evidence.
- Repeated aborted `/api/auth/session` failures are gone in the latest smoke evidence.
- The smoke still fails due signed-in route `networkidle` timeouts and preload warnings.

## Current Dirty Patch To Preserve Or Replace Carefully

`git status --short` currently shows changes in:

- `src/app/app-header-account-state.ts`
- `src/app/app-header-persist-site-language.ts`
- `src/app/layout.tsx`
- `src/app/site-language-hydrator-effect.test.ts`
- `src/app/site-language-hydrator-effect.ts`
- `src/app/ui/use-narrow-viewport.ts`
- `src/app/update-regional-price-text.ts`
- new tests/helpers:
  - `src/app/should-bootstrap-account-header-session.test.ts`
  - `src/app/should-bootstrap-account-header-session.ts`
  - `src/app/ui/use-narrow-viewport.test.ts`
  - `src/app/update-regional-price-text.test.ts`

Please review this patch first. Keep useful fixes, but do not blindly commit if a cleaner fix is needed.

## Reproduction

Dev server from current dirty patch:

```bash
cd /Users/thien.nguyen/.cursor/worktrees/chords/wishees-cycle-01-auto
npm run db:seed:e2e
npm run dev -- --port 3000
```

Focused smoke:

```bash
cd /Users/thien.nguyen/thiennp.github.io/codex-automations/wishees-local-verify-current-cursor-patch-20260606T131635Z
WISHEES_BASE_URL=http://localhost:3000 \
NODE_PATH=/Users/thien.nguyen/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules \
/Users/thien.nguyen/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node ui-i18n-smoke.mjs
```

Latest result:

```json
{
  "elapsedTime": "00:01:51",
  "currentUserSession": "ui-i18n",
  "coveragePercentage": "100%",
  "activeWorkflow": "ui and translation smoke completed",
  "identifiedBugs": [
    {
      "severity": "MAJOR",
      "actualBehavior": "3 scenario(s) showed UI/i18n instability. See UI_I18N_EVIDENCE.json and screenshots in logs/."
    }
  ]
}
```

Evidence files:

- `/Users/thien.nguyen/thiennp.github.io/codex-automations/wishees-local-verify-current-cursor-patch-20260606T131635Z/UI_I18N_EVIDENCE.json`
- `/Users/thien.nguyen/thiennp.github.io/codex-automations/wishees-local-verify-current-cursor-patch-20260606T131635Z/bugs.json`
- screenshots under `/Users/thien.nguyen/thiennp.github.io/codex-automations/wishees-local-verify-current-cursor-patch-20260606T131635Z/logs/`

## Remaining Failures

### 1. `my-wishees-de-mobile-alex`

Route:

`/my-wishees?lang=de`

Viewport:

`320x680`

User:

`e2e-alex@wishees.local`

Observed:

- `htmlLang: de`
- `htmlLangMismatch: false`
- no page errors
- no network failures
- no bad responses
- fails because `page.goto(..., waitUntil: "networkidle")` times out after 30s
- console warnings for preloaded but unused:
  - `/_next/static/css/app/global-error.css`
  - `/_next/static/css/app/not-found.css`
  - `/_next/static/css/app/error.css`
  - several preloaded font files

Dev server timings around this route:

```text
POST /api/auth/login 200 in 5.5s
GET /my-wishees?lang=de 200 in 15.1s
GET /api/auth/session 200 in ~646ms x3
GET /api/notifications 200 in 9.6s
GET /api/account/wishlist/outcomes 200 in 9.9s
PUT /api/account/wishlist 200 in 14.0s
GET /api/account/wishlist 200 in 14.0s
```

### 2. `friends-de-desktop-maya`

Route:

`/friends?lang=de`

Viewport:

`1440x900`

User:

`e2e-maya@wishees.local`

Observed:

- `status: 200`
- `htmlLang: de`
- no page errors
- no network failures
- no bad responses
- fails only because preload warnings are treated as UI/i18n instability.

### 3. `friend-wishlist-de-mobile-maya`

Route:

`/friends/wishlist?invite=user-12&lang=de`

Viewport:

`320x680`

User:

`e2e-maya@wishees.local`

Observed:

- `htmlLang: de`
- `htmlLangMismatch: false`
- no page errors
- no network failures
- no bad responses
- fails because `page.goto(..., waitUntil: "networkidle")` times out after 30s
- console warnings for the same preloaded unused error/not-found CSS and fonts.

Dev server timings around this route:

```text
GET /friends/wishlist?invite=user-12&lang=de 200 in 23.7s
GET /api/auth/session 200 in ~646ms x3
GET /api/notifications 200 in 644ms
GET /api/account/wishlist 200 in 5.5s
GET /api/friends/wishlist/outcomes?ownerUserId=12 200 in 6.2s
GET /api/friends/wishlist/outcomes?ownerUserId=12 200 in 1191ms
```

Viewer scenario now passes:

`viewer-friend-wishlist-de-mobile-lina` returned `status: 200`, `htmlLang: de`, and no warnings/errors/failures.

## Expected Fix

Fix the remaining signed-in route instability so `ui-i18n-smoke.mjs` passes on `localhost:3000`.

Please investigate:

- why signed-in German routes trigger long server/API work and fail `networkidle`;
- why `/my-wishees` emits a `PUT /api/account/wishlist` during initial page load/smoke without user intent;
- whether duplicate initial session/header/notifications/wishlist fetches can be reduced without regressing real-time or permission behavior;
- why Next dev is preloading unused `global-error.css`, `not-found.css`, `error.css`, and font files in these scenarios, or whether app code/import structure is causing those chunks to be pulled into normal routes.

Do not just weaken the smoke. The product behavior should be stable enough that a user sees a loaded route quickly and without hydration/network churn.

## Required Checks Before Declaring Fixed

Run all of these:

```bash
npm run commit:check
npm run prepush:check
```

Also run the focused smoke from this handoff and make sure `identifiedBugs` is empty:

```bash
cd /Users/thien.nguyen/thiennp.github.io/codex-automations/wishees-local-verify-current-cursor-patch-20260606T131635Z
WISHEES_BASE_URL=http://localhost:3000 \
NODE_PATH=/Users/thien.nguyen/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules \
/Users/thien.nguyen/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node ui-i18n-smoke.mjs
```

## Release Requirement

When fixed:

1. Commit the app/test changes.
2. Push directly to `origin/main` without `--no-verify`.
3. Leave `localhost:3000` running from the fixed commit/source for Codex verification.
4. Final Cursor output must include:
   - commit SHA
   - files changed
   - exact checks run and pass/fail status
   - confirmation that `ui-i18n-smoke.mjs` passes
   - localhost status
