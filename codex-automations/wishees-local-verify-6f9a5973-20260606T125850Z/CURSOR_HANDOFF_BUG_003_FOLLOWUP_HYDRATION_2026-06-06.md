# Cursor Follow-Up: BUG-003 Partially Fixed, Hydration Still Failing

## Context
- Repo/worktree: `/Users/thien.nguyen/.cursor/worktrees/chords/wishees-cycle-01-auto`
- Current pushed main commit under verification: `6f9a5973a340b5b9a4c967e52ddbe748781a2e38`
- Localhost base: `http://localhost:3000`
- Fresh verification folder: `/Users/thien.nguyen/thiennp.github.io/codex-automations/wishees-local-verify-6f9a5973-20260606T125850Z`

## Status
The first BUG-003 fix succeeded for the document language mismatch:
- `/my-wishees?lang=de` now has `htmlLang: "de"`
- `/friends?lang=de` now has `htmlLang: "de"`
- `/friends/wishlist?invite=user-12&lang=de` now has `htmlLang: "de"`

However, the UI/i18n smoke still fails with 4 MAJOR scenarios because hydration/page-load instability remains.

## Reproduction
```bash
cd /Users/thien.nguyen/thiennp.github.io/codex-automations/wishees-local-verify-6f9a5973-20260606T125850Z
WISHEES_BASE_URL=http://localhost:3000 \
NODE_PATH=/Users/thien.nguyen/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules \
/Users/thien.nguyen/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node ui-i18n-smoke.mjs
```

## Evidence
- `bugs.json`: `/Users/thien.nguyen/thiennp.github.io/codex-automations/wishees-local-verify-6f9a5973-20260606T125850Z/bugs.json`
- `UI_I18N_EVIDENCE.json`: `/Users/thien.nguyen/thiennp.github.io/codex-automations/wishees-local-verify-6f9a5973-20260606T125850Z/UI_I18N_EVIDENCE.json`
- Screenshots:
  - `/Users/thien.nguyen/thiennp.github.io/codex-automations/wishees-local-verify-6f9a5973-20260606T125850Z/logs/ui-i18n-20260606125940-my-wishees-de-mobile-alex.png`
  - `/Users/thien.nguyen/thiennp.github.io/codex-automations/wishees-local-verify-6f9a5973-20260606T125850Z/logs/ui-i18n-20260606125940-friends-de-desktop-maya.png`
  - `/Users/thien.nguyen/thiennp.github.io/codex-automations/wishees-local-verify-6f9a5973-20260606T125850Z/logs/ui-i18n-20260606125940-friend-wishlist-de-mobile-maya.png`
  - `/Users/thien.nguyen/thiennp.github.io/codex-automations/wishees-local-verify-6f9a5973-20260606T125850Z/logs/ui-i18n-20260606125940-viewer-friend-wishlist-de-mobile-lina.png`

## Remaining Failures
1. `my-wishees-de-mobile-alex`
   - Route: `/my-wishees?lang=de`
   - `htmlLang: "de"` and `htmlLangMismatch: false`
   - Still fails with React hydration mismatch page error.
   - `page.goto` times out waiting for `networkidle`.
   - Repeated aborted `GET /api/auth/session`.

2. `friend-wishlist-de-mobile-maya`
   - Route: `/friends/wishlist?invite=user-12&lang=de`
   - `htmlLang: "de"` and `htmlLangMismatch: false`
   - Still fails with React hydration mismatch page error.
   - `page.goto` times out waiting for `networkidle`.
   - Aborted `GET /api/auth/session`.

3. `viewer-friend-wishlist-de-mobile-lina`
   - Route: `/friends/wishlist?invite=user-12&lang=de`
   - `htmlLang: "de"` and `htmlLangMismatch: false`
   - Still fails with React hydration mismatch page error.
   - Aborted `GET /api/auth/session`.

4. `friends-de-desktop-maya`
   - Route: `/friends?lang=de`
   - `htmlLang: "de"` and `htmlLangMismatch: false`
   - No hydration page error in this run, but smoke still marks it unstable due repeated preload warnings for unused fonts/error/not-found/global-error resources.

## Expected
- No React hydration mismatch page errors on the listed routes.
- No route should hang waiting for network idle due repeated/aborted `/api/auth/session` calls.
- Keep the fixed `htmlLang: "de"` behavior.
- Keep BUG-002 behavior: `/friends/wishlist` must not auto-create a connection for Lina.

## Please Do
- Continue from `origin/main` at `6f9a5973...`.
- Focus on remaining hydration mismatch and repeated session fetch/network-idle instability.
- Add/adjust regression tests that would have caught the remaining mismatch.
- Run the actual `ui-i18n-smoke.mjs` command above locally before declaring the bug fixed, in addition to repo checks.
- Run:
  ```bash
  npm run commit:check
  npm run prepush:check
  ```
- Commit and push directly to `origin/main` without `--no-verify`.
- Start or restart `localhost:3000` and leave it running for Codex verification.
