# Cursor Handoff - Localhost 3000 Verification Blocked By CSS Build Error

Date: 2026-06-06 Europe/Berlin
Project: Chords / Wishees
Current origin/main: `3108b86ec93be3ff95698621fc9fbe7af8d4c381`
Verification target: `http://localhost:3000`
QA artifact folder: `/Users/thien.nguyen/thiennp.github.io/codex-automations/wishees-cycle-471a8a65-20260606T115454Z`

## Summary

After Cursor fixed and pushed BUG-001, Codex attempted the required localhost verification.

Cursor started the dev server on port 3000, but localhost verification is blocked because every route returns `500 Internal Server Error`.

## Bug

### MAJOR - Localhost dev server returns 500 due invalid generated CSS

Command used by Cursor:
`nohup npm run dev -- --port 3000 > /tmp/wishees-localhost-3000.log 2>&1 & echo $!`

Observed:
- `curl -I http://localhost:3000` returns `HTTP/1.1 500 Internal Server Error`.
- `curl -I http://localhost:3000/account/login` also returns `HTTP/1.1 500 Internal Server Error`.

Server log:
`/tmp/wishees-localhost-3000.log`

Relevant log excerpt:
```text
Expected digit.
     ╷
2110 │     padding: clamp(...);
     │                     ^
     ╵
  src/app/styles/wishees-theme-utilities.css 2110:21  root stylesheet
```

Relevant source lines:
```text
src/app/styles/wishees-theme-utilities.css
2109  .p-\[clamp\(\.\.\.\)\] {
2110    padding: clamp(...);
2111  }
```

Expected:
- `http://localhost:3000` should serve the app without a Sass/CSS build error.
- Codex should be able to run `WISHEES_BASE_URL=http://localhost:3000 node runner.mjs ...`.

## Required Cursor Work

Fix the invalid CSS source/generation path on clean `origin/main`.

Important constraints:
- Do not resurrect prior dirty changes.
- Do not use `--no-verify`.
- Commit and push directly to `origin/main`.
- Preserve the just-pushed BUG-001 fix.
- Preserve current UI/translation behavior.

Required checks before push:
- `npm run commit:check`
- `npm run prepush:check`

After pushing:
- Kill any stale server on port 3000.
- Start the app on `http://localhost:3000`.
- Leave the server running for Codex verification.
- Verify with `curl -I http://localhost:3000` and include the HTTP status in the final response.

Final Cursor response must include:
- Changed files.
- Test commands run.
- Commit SHA.
- Push target.
- Localhost server command/PID/log path.
- `curl -I http://localhost:3000` result.
