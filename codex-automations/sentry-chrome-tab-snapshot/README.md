# Sentry Chrome Tab Snapshot

This automation snapshots the CHECK24 Sentry issue list from the local Google Chrome profile signed in as `thien.nguyen.check24@gmail.com`.

## Files

- `snapshot.sh` verifies the Chrome profile, focuses or opens the target Sentry tab, extracts visible issue rows from the live DOM, and writes JSON snapshots atomically.
- `sync-live-report.mjs` merges the latest snapshot into the live dashboard served at `http://localhost:8766/`.
- `scan-issue-jira-links.mjs` opens visible Sentry issues one at a time in the verified Chrome tab, signals previous/current/next issue context to the app, waits for consecutive `/api/ui-state` acknowledgements, verifies the current card is focused in view, keeps each confirmed issue detail view in Chrome for at least 5 seconds, extracts attached Jira tickets, assigns unassigned Jira tickets to Thien Nguyen, creates a `PRE` Bug when no Jira ticket exists, and writes Jira action results back into the live report.
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

On success, the script keeps Chrome open, writes the full and compact snapshots, updates the localhost report through `http://127.0.0.1:8766/api/report-data`, scans visible issue detail pages for Jira tickets, verifies the app has rendered active/previous/next scan-state cues before continuing, keeps each confirmed Chrome issue detail view foregrounded for at least `SENTRY_ISSUE_JIRA_SCAN_MIN_CHROME_DWELL_MS` with an effective floor of 5000ms, marks finished issues in the app, writes Jira keys/actions back into the report, then restores the target Sentry list tab.

Jira writes use `JIRA_BASE_URL`, `JIRA_API_TOKEN`, and the default Jira user `thien.nguyen@check24.de`. Set `SENTRY_TRIAGE_JIRA_DRY_RUN=1` to verify the flow without calling Jira write endpoints.
