# Automation Report Next.js Requirement

## Purpose

Build a new Automation Report app from scratch with Next.js. It replaces the removed legacy `agent-report` app and the browser-dependent report workflow used by `Daily-vulnerabilities-fix`.

The primary users are:

- Codex agents and subagents that need to create, read, and update report state through HTTP APIs.
- Thien Nguyen, who needs a browser UI to monitor automation runs, blockers, PR/Jira states, and current work.

The app must not require agents to open Google Chrome or inspect a rendered HTML page to read or update report content.

## Stack

- Next.js with App Router.
- TypeScript.
- Node runtime API routes.
- Local-first persistence that works on Thien's machine without a cloud dependency.
- Use a durable JSON or SQLite store; SQLite is preferred if implemented cleanly.
- The app should be able to run locally with `npm run dev` and in production mode with `npm run build && npm run start`.

## Location

Create the new app at:

`/Users/thien.nguyen/thiennp.github.io/automation-report`

Do not recreate `/Users/thien.nguyen/thiennp.github.io/agent-report`.

## Runtime

- Default HTTP URL: `http://127.0.0.1:3120`.
- Default API base: `http://127.0.0.1:3120/api`.
- Default WebSocket URL: `ws://127.0.0.1:3120/ws`.
- Support `AUTOMATION_REPORT_PORT` and `AUTOMATION_REPORT_DATA_DIR`.
- Provide a small `scripts/ensure-automation-report-server.sh` that starts or verifies the service without requiring browser access.
- Provide a launchd plist template for optional autostart, but API health and WebSocket live updates must work without launchd when `npm run dev` or `npm run start` is running.
- If Next.js App Router alone cannot reliably own WebSocket upgrade handling, use a small custom Node server that serves Next.js and attaches a WebSocket server on the same port.

## API Requirements

All responses are JSON. Invalid requests return useful 4xx errors; server failures return 5xx with a non-secret diagnostic message.

### Health

`GET /api/health`

Returns service status, version, store path, server time, and whether the store is readable/writable.

### Automation Summary

`GET /api/automations`

Returns all automation ids with latest run status, latest update time, and active blocker counts.

### Current State

`GET /api/automations/:automationId/state`

Returns the current normalized state for one automation:

- active run id
- latest status
- current step map
- active items
- blocked items
- waiting PRs
- done items
- links
- last updated timestamp

`PUT /api/automations/:automationId/state`

Replaces the current normalized state. This is for full reconciliation at the end of a run.

`PATCH /api/automations/:automationId/state`

Partially updates state fields. This is for small state corrections without rewriting the full object.

### Runs

`POST /api/automations/:automationId/runs`

Creates a run. Body includes:

- `runId`
- `automationName`
- `startedAt`
- `mode`
- `memorySnapshotPath`
- `delegationPlanPath`

`GET /api/automations/:automationId/runs`

Lists runs newest first with pagination.

`GET /api/automations/:automationId/runs/:runId`

Returns one run with events, items, status, blockers, and final summary.

`PATCH /api/automations/:automationId/runs/:runId`

Updates run status, final summary, links, and timestamps.

### Events

`POST /api/automations/:automationId/runs/:runId/events`

Appends one event. Body includes:

- `stepNumber`
- `title`
- `status`: `running | success | warning | error | blocked | pending | info`
- `message`
- `evidence`
- `nextStep`
- `agentName`
- `agentRole`
- `createdAt`

`GET /api/automations/:automationId/runs/:runId/events`

Returns events chronologically or reverse chronologically via query param.

### Items

`PUT /api/automations/:automationId/runs/:runId/items/:itemId`

Creates or replaces an item such as a Jira ticket, PR, vulnerability, blocked item, or scan row.

Item fields:

- `itemId`
- `type`
- `status`
- `actionability`
- `blockReason`
- `repo`
- `branch`
- `filepath`
- `packageName`
- `advisoryIds`
- `jiraUrl`
- `prUrl`
- `evidence`
- `nextAction`
- `updatedAt`

`PATCH /api/automations/:automationId/runs/:runId/items/:itemId`

Partially updates one item.

`GET /api/automations/:automationId/runs/:runId/items`

Lists items with filters for status, type, actionability, repo, Jira issue, PR state, and current-only.

### Search

`GET /api/search?q=...`

Searches automations, runs, events, and items by text, Jira key, PR URL, repo, advisory id, package, or blocker phrase.

## WebSocket Live Updates

The app must update live through WebSocket. The browser UI must not require polling or a manual refresh after agent writes.

`ws://127.0.0.1:3120/ws`

The WebSocket server broadcasts an event after every successful mutating API call:

- `POST /api/automations/:automationId/runs`
- `PATCH /api/automations/:automationId/runs/:runId`
- `POST /api/automations/:automationId/runs/:runId/events`
- `PUT /api/automations/:automationId/runs/:runId/items/:itemId`
- `PATCH /api/automations/:automationId/runs/:runId/items/:itemId`
- `PUT /api/automations/:automationId/state`
- `PATCH /api/automations/:automationId/state`

Broadcast message shape:

```json
{
  "type": "run.created | run.updated | event.created | item.upserted | item.updated | state.replaced | state.updated",
  "automationId": "fix-slack-security-dependency-threads",
  "runId": "20260603T090000-daily-vulnerabilities-run",
  "itemId": "PRE-4300",
  "status": "blocked",
  "version": 42,
  "createdAt": "2026-06-03T08:00:00.000Z",
  "payload": {}
}
```

Rules:

- Every persisted mutation increments a monotonically increasing `version`.
- The UI subscribes to `/ws`, applies incoming events immediately, and may refetch the affected API resource when the event payload is partial.
- WebSocket is for live notification and optional read-side subscriptions, not the primary write API.
- Agents should write through HTTP APIs. They may optionally subscribe to WebSocket for observation, but they must not rely on opening a browser.
- If a WebSocket client disconnects, the UI reconnects with backoff and refetches current state after reconnect.
- `GET /api/health` must include WebSocket readiness and the latest committed store version.

## Agent Usage Contract

Agents must use the API for report reads and writes. They must not open Chrome just to inspect or update report content.

Daily automation usage:

1. Start: `GET /api/health`.
2. Create run: `POST /api/automations/fix-slack-security-dependency-threads/runs`.
3. After each numbered step or substep: `POST /events`.
4. After each discrete ticket, PR, vulnerability, listing, subagent assignment, scan row, blocker, or final item: `PUT` or `PATCH /items/:itemId`.
5. Before final output: `PUT /state` with the normalized final current state.
6. If API is unavailable, record `Automation Report API unavailable` in memory and final output; do not open Chrome as a fallback and do not block security remediation solely because reporting failed.

## UI Requirements

The UI should be quiet and operational, not a landing page.

Required views:

- Current: active items grouped by `Need Attention`, `Block`, `Wait for PR Approval`, and `In Progress`.
- Runs: run history newest first with status, duration, blocker count, and final summary.
- Tickets/PRs: Jira and Bitbucket references with active vs terminal PR normalization.
- Blockers: scan-friendly blocker cards with `Block reason` and `Actionability`.
- Search: query across runs, tickets, repos, packages, advisories, and blocker text.

The UI must read from the same API/store used by agents.

The UI must subscribe to the WebSocket endpoint and update visible run, step, item, blocker, and current-state content live after API writes.

## Data Semantics

- Current view hides `DONE` items.
- Terminal PRs are historical and never counted as active.
- `Approved` requires explicit Bitbucket approval evidence.
- `Done` means no PR is required because the repo is clean/current or the dashboard row is stale.
- Every blocked item must preserve `Block reason` and `Actionability`.
- Routine notes are available but secondary to status, actionability, blockers, repositories, advisories, PRs, and details.

## Security

- Bind to localhost by default.
- Do not store secrets, cookies, client certificate material, raw credential files, or full command environments.
- Redact common token-like values from event messages before storing.
- Add optional API token support through `AUTOMATION_REPORT_TOKEN`; when set, mutating endpoints require it.

## Acceptance Criteria

- `npm install`, `npm run build`, and `npm run start` work.
- `GET /api/health` returns healthy JSON.
- `GET /api/health` reports WebSocket readiness.
- A shell command can create a run, append an event, upsert an item, read state, and update final state without browser use.
- Each shell-driven mutating API call broadcasts a WebSocket event with the expected type, automation id, run id when applicable, status when applicable, and incremented version.
- The browser UI renders current state from the API store.
- The browser UI updates live from WebSocket messages when a run, event, item, or state changes.
- No references to the removed legacy `agent-report` app are required.
- The API contract is documented in the app README with copy-pasteable `curl` examples.
- The WebSocket contract is documented in the app README with a copy-pasteable `node` or `wscat` subscriber example.

## Claude AI Delegation Prompt

Use this requirement as the source of truth. Build the Next.js app from scratch at `/Users/thien.nguyen/thiennp.github.io/automation-report`. Keep the implementation local-first, typed, API-first, and simple enough for Codex automations to call with `curl` or a tiny Node helper. Do not modify the security automation itself; Codex will update automation rules after reviewing the built app.
