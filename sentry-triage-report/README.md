# Sentry Triage Report

Local live report app for the Check24 Energie Sentry/Jira/Cursor triage loop. The UI subscribes to `/ws`; Cursor, Codex, or shell scripts can update the visible report through HTTP APIs.

## Run

```sh
cd sentry-triage-report
cp report-data.example.json report-data.json
npm start
```

Default URLs:

- UI: `http://127.0.0.1:8766/`
- WebSocket: `ws://127.0.0.1:8766/ws`
- Health: `http://127.0.0.1:8766/healthz`

Use another port when needed:

```sh
SENTRY_TRIAGE_REPORT_PORT=8770 npm start
```

## Cursor/API Updates

Workflow status:

```sh
node bin/send-workflow-status.mjs \
  --status running \
  --step 6 \
  --phase cursor \
  --title "Cursor fix" \
  --pre PRE-4401 \
  "Cursor is applying /agent-fix-bug"
```

Full report replacement:

```sh
curl -fsS -X PUT http://127.0.0.1:8766/api/report-data \
  -H 'Content-Type: application/json' \
  --data-binary @report-data.json
```

Combined live update:

```sh
curl -fsS -X POST http://127.0.0.1:8766/api/live-update \
  -H 'Content-Type: application/json' \
  -d '{
    "workflow": {
      "status": "running",
      "step": "6",
      "phase": "cursor",
      "title": "Cursor fix",
      "message": "Cursor is applying /agent-fix-bug",
      "pre": "PRE-4401"
    }
  }'
```

Every successful mutating API call broadcasts over WebSocket, so open browser tabs update without a refresh.

## Local Data

Runtime files are intentionally ignored by Git:

- `report-data.json`
- `workflow-status.json`
- `manual-update-status.json`
- logs, pid files, temporary files, and `evidence/`

Keep real Sentry/Jira/Bitbucket report state local to the machine running the automation. Commit only source changes and example files.
