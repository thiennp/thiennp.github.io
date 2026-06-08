# Cursor Handoff: BUG-003 UI/i18n Lang Mismatch and Hydration Instability

## Context
- Repo/worktree: `/Users/thien.nguyen/.cursor/worktrees/chords/wishees-cycle-01-auto`
- Current main commit under test: `54928e56e16d1f67a94506f62d06bec066c9b714`
- Localhost base: `http://localhost:3000`
- QA artifact folder: `/Users/thien.nguyen/thiennp.github.io/codex-automations/wishees-local-cycle-54928e56-20260606T123203Z`
- The 15-minute matrix and boundary smoke passed clean. UI/i18n smoke found this issue.

## Bug
**Severity: MAJOR**

German routes render German page/body copy, but several pages still expose `<html lang="en">`. Multiple routes also throw React hydration mismatch errors during browser smoke.

This creates accessibility/localization inconsistency and client hydration instability on signed-in German routes.

## Reproduction
1. Ensure the Chords worktree has `.env.local`.
2. Seed E2E data:
   ```bash
   npm run db:seed:e2e
   ```
3. Start localhost:
   ```bash
   npm run dev -- --port 3000
   ```
4. Run:
   ```bash
   cd /Users/thien.nguyen/thiennp.github.io/codex-automations/wishees-local-cycle-54928e56-20260606T123203Z
   WISHEES_BASE_URL=http://localhost:3000 \
   NODE_PATH=/Users/thien.nguyen/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules \
   /Users/thien.nguyen/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node ui-i18n-smoke.mjs
   ```

## Evidence Files
- Main evidence JSON: `/Users/thien.nguyen/thiennp.github.io/codex-automations/wishees-local-cycle-54928e56-20260606T123203Z/UI_I18N_EVIDENCE.json`
- Bug summary: `/Users/thien.nguyen/thiennp.github.io/codex-automations/wishees-local-cycle-54928e56-20260606T123203Z/bugs.json`
- Screenshots:
  - `/Users/thien.nguyen/thiennp.github.io/codex-automations/wishees-local-cycle-54928e56-20260606T123203Z/logs/ui-i18n-20260606124756-my-wishees-de-mobile-alex.png`
  - `/Users/thien.nguyen/thiennp.github.io/codex-automations/wishees-local-cycle-54928e56-20260606T123203Z/logs/ui-i18n-20260606124756-friends-de-desktop-maya.png`
  - `/Users/thien.nguyen/thiennp.github.io/codex-automations/wishees-local-cycle-54928e56-20260606T123203Z/logs/ui-i18n-20260606124756-friend-wishlist-de-mobile-maya.png`
  - `/Users/thien.nguyen/thiennp.github.io/codex-automations/wishees-local-cycle-54928e56-20260606T123203Z/logs/ui-i18n-20260606124756-viewer-friend-wishlist-de-mobile-lina.png`

## Failing Scenarios
1. `my-wishees-de-mobile-alex`
   - Route: `/my-wishees?lang=de`
   - Status: `200`
   - Body copy is German.
   - Actual: `htmlLang: "en"`, `htmlLangMismatch: true`
   - Console: React hydration mismatch page error.

2. `friends-de-desktop-maya`
   - Route: `/friends?lang=de`
   - Status: `200`
   - Body copy is German.
   - Actual: `htmlLang: "en"`, `htmlLangMismatch: true`

3. `friend-wishlist-de-mobile-maya`
   - Route: `/friends/wishlist?invite=user-12&lang=de`
   - Body copy is German.
   - Actual: `htmlLang: "en"`, `htmlLangMismatch: true`
   - Error: `page.goto: Timeout 30000ms exceeded` waiting for `networkidle`
   - Console: React hydration mismatch page error.
   - Network: aborted `GET /api/auth/session`.

4. `viewer-friend-wishlist-de-mobile-lina`
   - Route: `/friends/wishlist?invite=user-12&lang=de`
   - `htmlLang` is correctly `de`, but still throws React hydration mismatch page error.

## Suspected Area
- `src/app/layout.tsx`
  - Root layout sets `<html lang={initialLanguage}>` from `resolveRequestSiteLanguage()`.
- `src/app/resolve-request-site-language.ts`
  - Uses query language only via `readRequestQueryLanguage()`.
- `src/app/read-request-query-language.ts`
  - Reads `x-wishees-query-lang` header when no explicit language is passed.
- `src/proxy.ts`
  - Sets `x-wishees-query-lang` from `request.nextUrl.searchParams.get("lang")`.

The route/page code is clearly honoring `?lang=de`, but the root layout sometimes resolves `en`, especially on signed-in pages with account locale `en-US`. Please make query `lang` reliably reach the root layout for all app routes, and resolve hydration mismatch errors without masking them.

## Expected Behavior
- Every route rendered with `?lang=de` should expose `<html lang="de">`, including signed-in routes.
- Page copy and root document language must agree.
- No React hydration mismatch page errors on the tested routes.
- No mobile/desktop overflow or clipped text regressions.

## Acceptance / Verification
Run and pass:
```bash
npm run commit:check
npm run prepush:check
```

Then push directly to `origin/main` without `--no-verify`.

After pushing, start/restart `localhost:3000` from the Chords worktree and leave it running. Codex will rerun:
```bash
cd /Users/thien.nguyen/thiennp.github.io/codex-automations/wishees-local-cycle-54928e56-20260606T123203Z
WISHEES_BASE_URL=http://localhost:3000 \
NODE_PATH=/Users/thien.nguyen/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules \
/Users/thien.nguyen/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node ui-i18n-smoke.mjs
```
