# Automation Report

API-first, local work-status dashboard for Codex automations and Cursor agents. Push what you are working on over HTTP or WebSocket. The browser UI subscribes to live updates and shows current work, recent automation events, and the latest Sentry report.

## Run

Local live server:

```sh
npm install
npm run build
AUTOMATION_REPORT_PORT=3120 npm run start
```

GitHub Pages deploy at `https://thiennp.github.io/report/`:

```sh
AUTOMATION_REPORT_PORT=3120 npm run start
npm run deploy:pages
git add report/
git commit -m "Publish automation report snapshot"
git push origin master
```

`deploy:pages` syncs `report/dashboard.json` from the local API, then exports the static Next.js UI into the repo-root `report/` folder. GitHub Pages serves that folder from the site root, so the app is available at `/report/`.

Development mode:

```sh
npm run dev
```

Ensure server:

```sh
./scripts/ensure-automation-report-server.sh
```

Default endpoints:

- UI: `http://127.0.0.1:3120/`
- API: `http://127.0.0.1:3120/api`
- Dashboard API: `http://127.0.0.1:3120/api/dashboard`
- Work status API: `http://127.0.0.1:3120/api/work-status`
- Current report API: `http://127.0.0.1:3120/api/report`
- WebSocket: `ws://127.0.0.1:3120/ws`

## Environment

- `AUTOMATION_REPORT_PORT`: defaults to `3120`.
- `AUTOMATION_REPORT_HOST`: defaults to `127.0.0.1`.
- `AUTOMATION_REPORT_DATA_DIR`: defaults to `./data`.
- `AUTOMATION_REPORT_TOKEN`: optional token. When set, mutating endpoints require `Authorization: Bearer <token>` or `X-Automation-Report-Token`.

## API Examples

Health:

```sh
curl -fsS http://127.0.0.1:3120/api/health | jq
```

Update what you are working on:

```sh
node bin/send-work-status.mjs \
  --status running \
  --step 6 \
  --phase cursor \
  --title "Cursor fix" \
  --pre PRE-4401 \
  "Cursor is applying /agent-fix-bug"
```

Or with curl:

```sh
curl -fsS -X POST http://127.0.0.1:3120/api/work-status \
  -H 'Content-Type: application/json' \
  -d '{
    "status": "running",
    "step": "6",
    "phase": "cursor",
    "title": "Cursor fix",
    "message": "Cursor is applying /agent-fix-bug",
    "pre": "PRE-4401",
    "automationId": "sentry-triage",
    "runId": "20260608T120000Z"
  }' | jq
```

Replace the current Sentry report:

```sh
curl -fsS -X PUT http://127.0.0.1:3120/api/report \
  -H 'Content-Type: application/json' \
  -d '{
    "title": "Check24 Sentry Issues",
    "message": "3 unresolved Sentry issue(s) in the latest 24h view.",
    "status": "warning",
    "url": "https://check24-energie.sentry.io/issues/?project=-1&statsPeriod=24h",
    "issues": [
      {
        "id": "1234567890",
        "shortId": "ENERGIE-ABC",
        "title": "Example Sentry issue",
        "status": "unresolved",
        "level": "error",
        "project": "energie",
        "culprit": "src/example.ts",
        "issueUrl": "https://check24-energie.sentry.io/issues/1234567890/",
        "lastSeen": "2026-06-05T08:30:00.000Z",
        "count": 12,
        "userCount": 4
      }
    ]
  }' | jq
```

`PUT` and `POST` replace the whole visible report. The server deduplicates issues by stable issue identifiers and does not retain issues omitted from the latest payload.

Create a run:

```sh
curl -fsS -X POST http://127.0.0.1:3120/api/automations/fix-slack-security-dependency-threads/runs \
  -H 'Content-Type: application/json' \
  -d '{
    "runId": "20260603T090000-daily-vulnerabilities-run",
    "automationName": "Daily-vulnerabilities-fix",
    "startedAt": "2026-06-03T09:00:00.000Z",
    "mode": "daily"
  }' | jq
```

Append a step event:

```sh
curl -fsS -X POST http://127.0.0.1:3120/api/automations/fix-slack-security-dependency-threads/runs/20260603T090000-daily-vulnerabilities-run/events \
  -H 'Content-Type: application/json' \
  -d '{
    "stepNumber": "2.1",
    "title": "Chrome sync gate",
    "status": "running",
    "message": "Opening package-audit, Jira, and Bitbucket in Chrome.",
    "nextStep": "2.2"
  }' | jq
```

Upsert an item:

```sh
curl -fsS -X PUT http://127.0.0.1:3120/api/automations/fix-slack-security-dependency-threads/runs/20260603T090000-daily-vulnerabilities-run/items/PRE-4300 \
  -H 'Content-Type: application/json' \
  -d '{
    "type": "jira-ticket",
    "status": "blocked",
    "actionability": "Actionable - restore Chrome auth",
    "blockReason": "Package-audit auth wall detected in Chrome.",
    "repo": "enrglib-cella-client",
    "jiraUrl": "https://c24-energie.atlassian.net/browse/PRE-4300",
    "nextAction": "Thien Nguyen logs into package-audit in Chrome."
  }' | jq
```

Read state:

```sh
curl -fsS http://127.0.0.1:3120/api/automations/fix-slack-security-dependency-threads/state | jq
```

Replace final state:

```sh
curl -fsS -X PUT http://127.0.0.1:3120/api/automations/fix-slack-security-dependency-threads/state \
  -H 'Content-Type: application/json' \
  -d '{
    "activeRunId": "20260603T090000-daily-vulnerabilities-run",
    "latestStatus": "blocked",
    "blockedItems": [
      {
        "itemId": "PRE-4300",
        "status": "blocked",
        "blockReason": "Package-audit auth wall detected in Chrome.",
        "actionability": "Actionable - log in through Chrome",
        "updatedAt": "2026-06-03T09:05:00.000Z"
      }
    ],
    "links": {
      "packageAudit": "https://sec.check24.de/package-audit?slug=power"
    }
  }' | jq
```

Search:

```sh
curl -fsS 'http://127.0.0.1:3120/api/search?q=PRE-4300' | jq
```

## WebSocket Example

Subscribe to live updates:

```sh
node - <<'NODE'
const WebSocket = require('ws');
const ws = new WebSocket('ws://127.0.0.1:3120/ws');
ws.on('open', () => console.log('connected'));
ws.on('message', (message) => console.log(String(message)));
NODE
```

Push work status over WebSocket:

```sh
node - <<'NODE'
const WebSocket = require('ws');
const ws = new WebSocket('ws://127.0.0.1:3120/ws');
ws.on('open', () => {
  ws.send(JSON.stringify({
    type: 'work-status.update',
    payload: {
      status: 'running',
      step: '2.1',
      phase: 'review',
      title: 'PR review',
      message: 'Reviewing Bitbucket comments',
      pre: 'PRE-4309'
    }
  }));
});
ws.on('message', (message) => console.log(String(message)));
NODE
```

Each successful mutating API call broadcasts:

```json
{
  "type": "event.created",
  "automationId": "fix-slack-security-dependency-threads",
  "runId": "20260603T090000-daily-vulnerabilities-run",
  "status": "running",
  "version": 2,
  "createdAt": "2026-06-03T09:00:02.000Z",
  "payload": {}
}
```

## Semantics

- Current view hides `DONE` items.
- Terminal PRs are historical and not active.
- `Approved` requires explicit Bitbucket approval evidence.
- `Done` means no PR is needed because the repo is already clean/current or the dashboard row is stale.
- Every blocked item should include `Block reason` and `Actionability`.
