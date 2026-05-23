# Thien MR Review Queue Automation

Mirror of the local Codex heartbeat automation and dashboard (Target System Workflow v2):

- Thin Codex orchestrator: delta inventory, one Cursor launch per heartbeat
- MR review and Thien-authored MR maintenance
- Linear assigned issue handling
- Sentry inventory and `/thien-sentry-all` queue drain (one Cursor launch per heartbeat)
- Local dashboard at `http://127.0.0.1:4177`

## Source Of Truth

The live automation still runs from local Codex paths:

- Automation prompt: `/Users/study/.codex/automations/thien-mr-review-queue/automation.toml`
- Dashboard server: `/Users/study/aurora/fs-academy/.cursor/.temp/thien-mr-dashboard/server.mjs`
- Report: `/Users/study/.codex/automations/thien-mr-review-queue-report.json`
- MR history: `/Users/study/.codex/automations/thien-mr-dashboard-history.json`

This folder is the synced copy in `thiennp.github.io`.

## Sync

From `/Users/study/thiennp.github.io`:

```bash
./automation/codex/thien-mr-review-queue/sync-from-local.sh
```

The sync copies the current local prompt, dashboard server, report, history, and optional reply/comment state files into this mirror.

## Layout

```text
automation.toml
conversation.md
dashboard/server.mjs
state/thien-mr-review-queue-report.json
state/thien-mr-dashboard-history.json
state/thien-mr-dashboard-reply-tone.json
state/thien-mr-dashboard-comment-fixes.json
sync-from-local.sh
```

## Conversation Handoff

[`conversation.md`](conversation.md) captures the current user-facing requirements and the latest operational decisions behind this automation, so the GitHub Pages copy carries both the runnable automation state and the context that shaped it.
