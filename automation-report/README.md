# Automation Report

Browser-first work-status dashboard for Codex automations and Cursor agents.

**Dashboard:** https://thiennp.github.io/report/

**Storage:** browser `localStorage` only. The GitHub Pages UI does not call a backend API.

**Default logging:** keep the report tab open and call the browser hook after each step:

```js
window.__AUTOMATION_REPORT__.pushWorkStatus({
  status: 'running',
  appName: 'Cursor',
  llm: 'Claude 4.5 Sonnet',
  modelToken: 'claude-4.5-sonnet',
  title: 'Fix failing test',
  message: 'Updating assertion in user service test',
  automationId: 'my-repo',
  runId: '2026-06-08T12:00:00.000Z'
});
```

Bridge helpers installed when the report tab loads:

- `window.__AUTOMATION_REPORT__.pushWorkStatus({...})` — preferred per-step logging
- `window.__AUTOMATION_REPORT__.pushDashboard(snapshot)` — optional full snapshot
- `window.__AUTOMATION_REPORT__.getDashboard()` — read current localStorage state
- `window.__AUTOMATION_REPORT__.ready` — `true` when the hook is ready

Wait for `ready` before the first log when using the hook. Alternatively, agents can paste work-status JSON into the bottom **Log work status** field and press Submit (or Enter) via browser UI automation.

## Dashboard UX

- Header: current work status, hook readiness, and browser-storage indicator
- **Sessions:** expandable rows (not separate activity/automation/Sentry panels)
- **Log work status:** bottom JSON input for browser UI automation (work-status object or full snapshot)
- **Agent logging instructions:** collapsed by default on the page; per-app tabs for Cursor, Codex, Claude, Antigravity, Other
- Empty/pending state: no "Waiting for work status" title; shows the hook message until the first `pushWorkStatus`

### Required log fields

- `appName` — agent app (Cursor, Codex, Claude, Antigravity, or your agent name)
- `llm` — human-readable model name
- `modelToken` — model slug from the agent UI (not an API secret)

### Optional log fields

`tokensUsed`, `automationId`, `runId`, `step`, `phase`, `title`, `message`, `nextStep`, `pre`, `repo`, `pr`, `url`

## Deploy (GitHub Pages)

```sh
npm install
npm run deploy:pages
git add report/
git commit -m "Publish automation report UI"
git push origin master
```

`deploy:pages` exports the static Next.js UI into the repo-root `report/` folder.

## Optional CLI helpers

Build a snapshot JSON file (for `pushDashboard` or local debugging):

```sh
node bin/send-work-status.mjs \
  --status running \
  --appName Cursor \
  --llm "Claude 4.5 Sonnet" \
  --modelToken claude-4.5-sonnet \
  --step 6 \
  --phase cursor \
  --title "Cursor fix" \
  --pre PRE-4401 \
  --out /tmp/automation-report-snapshot.json \
  "Cursor is applying /agent-fix-bug"
```

Push a snapshot into the open report tab:

```sh
node bin/send-work-status.mjs --status running --title "Test" "Message" --out /tmp/snapshot.json --inject
# or
node bin/push-dashboard-to-browser.mjs --file /tmp/snapshot.json
```

## Optional local API server (development only)

The static GitHub Pages dashboard does not use this server.

```sh
npm run build
AUTOMATION_REPORT_PORT=3120 npm run start
```

Environment:

- `AUTOMATION_REPORT_PORT` — defaults to `3120`
- `AUTOMATION_REPORT_HOST` — defaults to `127.0.0.1`
- `AUTOMATION_REPORT_DATA_DIR` — defaults to `./data`
- `AUTOMATION_REPORT_TOKEN` — optional bearer token for mutating endpoints

Health check:

```sh
curl -fsS http://127.0.0.1:3120/api/health | jq
```

Work-status POST (dev server only):

```sh
curl -fsS -X POST http://127.0.0.1:3120/api/work-status \
  -H 'Content-Type: application/json' \
  -d '{
    "status": "running",
    "appName": "Cursor",
    "llm": "Claude 4.5 Sonnet",
    "modelToken": "claude-4.5-sonnet",
    "title": "Cursor fix",
    "message": "Cursor is applying /agent-fix-bug",
    "pre": "PRE-4401",
    "automationId": "my-repo",
    "runId": "2026-06-08T12:00:00.000Z"
  }' | jq
```
