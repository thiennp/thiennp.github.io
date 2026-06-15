# Daily Magic Report Watchdog

Observes Daily Magic agent activity and flags running agents that look like they forgot to report.

The watchdog reads the Daily Magic content API, listens to `/thien/ws`, and keeps a small in-memory view of recent agents, claims, actions, heartbeats, and work-status messages. It can run in dry-run mode, or send reminder `work-status.update` messages back to the affected thread.

## Quick Start

```bash
node daily-magic-report-watchdog/watchdog.mjs --once --dry-run
```

Run continuously:

```bash
node daily-magic-report-watchdog/watchdog.mjs --dry-run
```

Send live reminders:

```bash
node daily-magic-report-watchdog/watchdog.mjs --send-reminders
```

If the Daily Magic endpoint rejects `work-status.update` reminder messages, use the opt-in action-reminder mode. This claims the latest action before appending a visible reminder, so keep it disabled until you explicitly want that behavior:

```bash
node daily-magic-report-watchdog/watchdog.mjs --send-action-reminders
```

## What It Detects

- A claimed or running action has no recent heartbeat.
- A running action has no recent `work-status.update`.
- A status or heartbeat is missing the required thread/action/owner fields.
- A thread is active but the latest visible action is stale.

Defaults are intentionally forgiving:

- heartbeat grace: 90 seconds
- status grace: 120 seconds
- action stale grace: 5 minutes
- reminder cooldown per agent/thread: 10 minutes

Override these with environment variables:

```bash
DAILY_MAGIC_WATCHDOG_HEARTBEAT_GRACE_MS=90000
DAILY_MAGIC_WATCHDOG_STATUS_GRACE_MS=120000
DAILY_MAGIC_WATCHDOG_ACTION_STALE_MS=300000
DAILY_MAGIC_WATCHDOG_REMINDER_COOLDOWN_MS=600000
```

## Safety Notes

The watchdog does not create new action threads for reminders. It only attaches live status to an existing thread when that thread already has an explicit owner.

Action-reminder mode is more forceful: it claims the latest action, appends a warning action, and should only be used when live `work-status.update` reminders are not accepted by the dashboard.

Dry-run mode is the recommended first deployment mode. It prints the reminders it would send and does not mutate Daily Magic.
