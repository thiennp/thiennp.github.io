# Sentry Browser Snapshot Compatibility Helper

This helper snapshots the CHECK24 Sentry issue list from the local Google Chrome profile signed in as `thien.nguyen.check24@gmail.com`.

The main triage automation now prefers Firefox for authenticated browser fallback when a verified Firefox-capable control path exists. This helper is still Chrome-based because it depends on Google Chrome Apple Events and `tab.execute({javascript: ...})` to inspect authenticated Sentry DOM state. Use it as a compatibility fallback only when Sentry API is blocked/incomplete and no verified Firefox-capable snapshot helper is available.

## Files

- `snapshot.sh` verifies the Chrome profile, focuses or opens the target Sentry tab, extracts visible issue rows from the live DOM, and writes JSON snapshots atomically.
- `sync-live-report.mjs` is a best-effort legacy UI sync for the retired dashboard at `http://localhost:8766/`. It is not a data source and a sync failure must not invalidate a fresh snapshot.
- `scan-issue-jira-links.mjs` is a legacy detail scanner that depends on the retired `localhost:8766` UI acknowledgement API. It is disabled by default and only runs when `SENTRY_CHROME_RUN_LEGACY_8766_DETAIL_SCAN=1`.
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

On success, the script keeps Chrome open and writes the full and compact snapshots. Those JSON files are the authoritative fresh Sentry evidence for the run. The optional localhost report sync may fail without blocking the run. The old detail scanner is not run unless `SENTRY_CHROME_RUN_LEGACY_8766_DETAIL_SCAN=1` is explicitly set.

Jira dedupe/create/link work should use the main triage loop's same-round snapshot plus API/connector evidence. Prefer Firefox for Sentry/Jira visual mutations when a verified Firefox-capable helper exists. Use this Chrome compatibility helper only when a current step explicitly needs UI verification or an API-safe/Firefox-safe path is not available.

Chrome-compatibility Sentry/Jira UI actions poll for up to 60 seconds by default before they are treated as blocked. Tune with `SENTRY_TRIAGE_SENTRY_ISSUE_TRACKING_ACTION_TIMEOUT_MS`, `SENTRY_TRIAGE_JIRA_UI_ACTION_TIMEOUT_MS`, and `SENTRY_TRIAGE_UI_ACTION_POLL_MS`.

When linking a known or deduped Jira ticket in Sentry, the scanner first re-reads Sentry Issue Tracking. If the target key is already visible in that section's text, it skips the Sentry modal and opens Jira directly for assignee/owner work. If the key is missing, the scanner uses only the Jira modal `Link` tab. It must click/focus the visible `Issue` dropdown, type the Jira key or prefix before waiting for options, click the matching dropdown option, verify that the selected issue is reflected in the `Issue` field, submit `Link Issue`, and then verify the key is visible in Sentry Issue Tracking. Waiting on an untouched `Issue` dropdown or submitting before selected-state evidence is treated as a blocked action.

After exactly one Jira key is linked or verified visible in Sentry's Issue Tracking section, the scanner opens that Jira issue page in Chrome and reads the assignee field in a fresh page visit after any Jira UI assignment step. It then returns to the same Sentry issue and assigns the Sentry issue to that visible Jira owner through the Sentry UI. It blocks instead of guessing when there are multiple linked Jira keys, no Jira assignee, no matching Sentry member option, or multiple DOM-distinct matching Sentry member options, including options with identical visible text.
