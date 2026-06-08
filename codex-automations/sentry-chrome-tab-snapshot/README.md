# Sentry Chrome Tab Snapshot

This automation snapshots the CHECK24 Sentry issue list from the local Google Chrome profile signed in as `thien.nguyen.check24@gmail.com`.

## Files

- `snapshot.sh` verifies the Chrome profile, focuses or opens the target Sentry tab, extracts visible issue rows from the live DOM, and writes JSON snapshots atomically.
- `sync-live-report.mjs` merges the latest snapshot into the live dashboard served at `http://localhost:8766/`.
- `scan-issue-jira-links.mjs` opens visible Sentry issues one at a time in the verified Chrome tab, signals previous/current/next issue context to the app, waits for consecutive `/api/ui-state` acknowledgements, verifies the current card is focused in view, keeps each confirmed issue detail view in Chrome for at least 5 seconds, extracts known Jira tickets, attaches any known/deduped ticket that is missing from Sentry Issue Tracking through the Sentry Jira modal `Link` tab, assigns unassigned Jira tickets to Thien Nguyen by clicking in the Jira Chrome UI, mirrors the single linked Jira assignee/owner to the Sentry issue assignee, creates a `PRE` Bug only when no known/deduped Jira ticket exists, and writes Jira action results back into the live report.
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

On success, the script keeps Chrome open, writes the full and compact snapshots, updates the localhost report through `http://127.0.0.1:8766/api/report-data`, scans visible issue detail pages for Jira tickets, links known/missing Jira keys into Sentry Issue Tracking, verifies the app has rendered active/previous/next scan-state cues before continuing, keeps each confirmed Chrome issue detail view foregrounded for at least `SENTRY_ISSUE_JIRA_SCAN_MIN_CHROME_DWELL_MS` with an effective floor of 5000ms, marks finished issues in the app, writes Jira keys/actions back into the report, then restores the target Sentry list tab.

Jira REST is used for dedupe/create only when no known ticket exists. Assignment is UI-only through Chrome/Jira, and known/deduped tickets are attached in Sentry through the Issue Tracking `Link` tab. Set `SENTRY_TRIAGE_JIRA_DRY_RUN=1` to verify the flow without calling Jira write endpoints or submitting Sentry/Jira UI changes.

Chrome-driven Sentry/Jira UI actions poll for up to 60 seconds by default before they are treated as blocked. Tune with `SENTRY_TRIAGE_SENTRY_ISSUE_TRACKING_ACTION_TIMEOUT_MS`, `SENTRY_TRIAGE_JIRA_UI_ACTION_TIMEOUT_MS`, and `SENTRY_TRIAGE_UI_ACTION_POLL_MS`.

When linking a known or deduped Jira ticket in Sentry, the scanner first re-reads Sentry Issue Tracking. If the target key is already visible in that section's text, it skips the Sentry modal and opens Jira directly for assignee/owner work. If the key is missing, the scanner uses only the Jira modal `Link` tab. It must click/focus the visible `Issue` dropdown, type the Jira key or prefix before waiting for options, click the matching dropdown option, verify that the selected issue is reflected in the `Issue` field, submit `Link Issue`, and then verify the key is visible in Sentry Issue Tracking. Waiting on an untouched `Issue` dropdown or submitting before selected-state evidence is treated as a blocked action.

After exactly one Jira key is linked or verified visible in Sentry's Issue Tracking section, the scanner opens that Jira issue page in Chrome and reads the assignee field in a fresh page visit after any Jira UI assignment step. It then returns to the same Sentry issue and assigns the Sentry issue to that visible Jira owner through the Sentry UI. It blocks instead of guessing when there are multiple linked Jira keys, no Jira assignee, no matching Sentry member option, or multiple DOM-distinct matching Sentry member options, including options with identical visible text.
