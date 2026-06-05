# Sentry Chrome Tab Snapshot

This automation snapshots the CHECK24 Sentry issue list from the local Google Chrome profile signed in as `thien.nguyen.check24@gmail.com`.

## Files

- `snapshot.sh` verifies the Chrome profile, focuses or opens the target Sentry tab, extracts visible issue rows from the live DOM, and writes JSON snapshots atomically.
- `sync-live-report.mjs` merges the latest snapshot into the live dashboard served at `http://localhost:8766/`.
- `scan-issue-jira-links.mjs` opens visible Sentry issues one at a time in the verified Chrome tab, signals the active issue to the app, extracts attached Jira tickets, and writes those Jira keys back into the live report.
- `automation.toml` mirrors the active Codex heartbeat automation.

Generated runtime files are ignored:

- `/Users/thien.nguyen/thiennp.github.io/codex-automations/sentry-chrome-tab-snapshot.json`
- `snapshot-compact.json`
- `snapshot-last.stderr.log`
- `live-report-sync-status.json`
- `issue-jira-scan-status.json`

## Manual Run

```sh
/Users/thien.nguyen/thiennp.github.io/codex-automations/sentry-chrome-tab-snapshot/snapshot.sh
```

On success, the script keeps Chrome open, writes the full and compact snapshots, updates the localhost report through `http://127.0.0.1:8766/api/report-data`, scans visible issue detail pages for Jira tickets, writes Jira keys back into the report, then restores the target Sentry list tab.
