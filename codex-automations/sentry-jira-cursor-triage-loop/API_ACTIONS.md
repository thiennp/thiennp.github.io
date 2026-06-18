# Sentry/Jira/Bitbucket API-First Actions

Use this file before guessing how to access Sentry, Jira, Bitbucket, Claude, or Cursor for the `sentry-jira-cursor-triage-loop` automation.

## Entry Point

Run API-first actions through:

```bash
/Users/thien.nguyen/thiennp.github.io/codex-automations/sentry-jira-cursor-triage-loop/triage-api-actions.sh <action> [args...]
```

The wrapper calls the underlying Node helpers and keeps mutation commands explicit. It reads credentials only through the helper scripts from `~/.env` or the current process environment. Never print, paste, log, or delegate token values.

## Browser Fallback on 403

When any Sentry, Jira, Bitbucket, or Sentry-Jira integration API/connector call returns HTTP 403 or another permission block, fall back to an authenticated browser whenever that browser can verify the source or perform the needed visual check/mutation safely. Prefer Firefox when a verified Firefox-capable control path exists. If the only verified helper for the required source/action is still Chrome-based, use that Chrome compatibility helper and report it. Do not stop on API 403 alone. Stop only if no safe authenticated browser path is available.

## Fresh Sentry Source

For every round, collect Sentry evidence fresh from the current run. Do not read old report state as Sentry source data.

Preferred fresh Sentry source paths:

```bash
# Chrome compatibility snapshot. This writes fresh full + compact JSON from the live Sentry issue list.
/Users/thien.nguyen/thiennp.github.io/codex-automations/sentry-chrome-tab-snapshot/snapshot.sh

# API union, when the token has sufficient permission.
triage-api-actions.sh sentry-union --out /tmp/sentry-source-union.json
```

The compatibility snapshot output is authoritative when the Sentry API union is unavailable and no verified Firefox-capable source helper exists, or when the user asks to use the Sentry info script. Its JSON outputs are:

```text
/Users/thien.nguyen/thiennp.github.io/codex-automations/sentry-chrome-tab-snapshot.json
/Users/thien.nguyen/thiennp.github.io/codex-automations/sentry-chrome-tab-snapshot/snapshot-compact.json
```

The restored Chrome compatibility snapshot script only attempts legacy `http://127.0.0.1:8766/` sync when explicitly enabled with `SENTRY_CHROME_RUN_LEGACY_8766_SYNC=1`; that sync is not a data source and must not block a round.

## Sentry Environment Policy

Only production Sentry issues are eligible for Jira creation/linking or implementation. If a Sentry issue is from staging, dev, int, test, or any non-production environment, resolve it in Sentry directly, do not create or link Jira, do not delegate implementation, and move on.

## Retired Dependencies

Do not use or require the old local live report app at `http://127.0.0.1:8766/` as automation state or source data.
Do not read or write `/Users/thien.nguyen/Desktop/Sentry Triage History/report-data.json` as automation state.
Do not create Jenkins blockers or require Jenkins PR/release/build checks.

Progress reporting goes to the Daily Magic WebSocket `/thien/ws` only. Do not use report-page browser hooks, browser globals, or HTTP POSTs as the agent reporting path. If Daily Magic WebSocket reporting fails, include `reportWebSocketWarning` in the final response and continue when safe.

## Fast Connectivity Check

```bash
/Users/thien.nguyen/thiennp.github.io/codex-automations/sentry-jira-cursor-triage-loop/triage-api-actions.sh check-all --out-dir /tmp
```

This verifies:

- Sentry Source A/Source B union through `SENTRY_AUTH_TOKEN`
- Jira assigned PRE snapshot through `JIRA_API_TOKEN` and `EMAIL`
- Bitbucket PR inventory through `BB_API_TOKEN`

If this passes, do not use a browser for these read-only source-list/status reads unless the user explicitly asked for the Sentry info script. If Sentry fails with 403 or another permission block, prefer a verified Firefox-capable source helper. If none exists and Chrome is authenticated, run the Chrome compatibility snapshot script for Sentry and continue with that fresh same-round Sentry evidence.

## HTML Issue List

When Thien asks to “show the Sentry issue list in HTML” or similar, run:

```bash
/Users/thien.nguyen/thiennp.github.io/codex-automations/sentry-jira-cursor-triage-loop/triage-api-actions.sh issue-list-html --fresh
```

This fetches fresh sanitized Sentry and Jira/Bitbucket API snapshots, then writes:

```text
/Users/thien.nguyen/thiennp.github.io/codex-automations/sentry-jira-cursor-triage-loop/artifacts/current-sentry-issue-list.html
```

To render from already-fetched artifacts instead of fetching again:

```bash
triage-api-actions.sh issue-list-html \
  --sentry /tmp/path/to/sentry-source-union.json \
  --jira-bitbucket /tmp/path/to/jira-bitbucket-snapshot.json
```

Generated HTML is a local artifact and contains no token values. It filters out Sentry issues that already have a Sentry assignee other than Thien Nguyen; unassigned issues and issues assigned to Thien remain visible. Each row includes:

- local status controls: `selected`, `working`, `blocked`, and `done`
- action request buttons for `Assign to me`, `Create JIRA`, `Review PR`, and `JIRA Ticket status change`; these record requested intent in the local status API and do not directly mutate Sentry/Jira
- an `Ask Claude` button that sends sanitized row evidence to the local status server, which invokes Claude CLI through `safe-delegate-cli.mjs` from the mapped repo path with explicit read-only file tools
- a `Copy prompt` button that copies a sanitized Claude CLI analysis prompt plus a Codex request for safe Cursor delegation
- a sidecar status file at `artifacts/current-sentry-issue-status.json`

To let Codex update the page through a local API, start the local issue app server:

```bash
triage-api-actions.sh issue-list-status-server --port 8797
```

Open:

```text
http://127.0.0.1:8797/
```

Codex can then update issue status with a local API call:

```bash
curl -sS -X POST http://127.0.0.1:8797/api/status \
  -H 'content-type: application/json' \
  -d '{"issueId":"6708782936","status":"working","message":"Creating Cursor handoff"}'
```

The local app can also ask Claude directly through the same server:

```bash
curl -sS -X POST http://127.0.0.1:8797/api/claude \
  -H 'content-type: application/json' \
  -d '{"issueId":"6708782936","prompt":"Summarize this sanitized issue evidence..."}'
```

Claude receives only the sanitized prompt from the generated row. The server runs Claude through `safe-delegate-cli.mjs`, so token-like environment variables are scrubbed. The server starts Claude in the mapped repo directory when it is one of the known safe repo paths, passes `--add-dir <repo>`, and grants read-only tools (`Read`, `Glob`, `Grep`, `LS`). If Claude still cannot read the repo, treat the result as degraded analysis and continue with Codex local inspection plus Cursor plan agreement rather than stopping.

If the server is not running, status changes made in the page still persist in browser localStorage. Codex can also update the sidecar JSON directly:

```bash
triage-api-actions.sh issue-list-status-set \
  --issue-id 6708782936 \
  --status working \
  --message "Creating Cursor handoff"
```

To read current local status without the server:

```bash
triage-api-actions.sh issue-list-status-get
```

## Read-Only Source Actions

```bash
# Sentry Source A + Source B deduplicated union
triage-api-actions.sh sentry-union --out /tmp/sentry-source-union.json

# Jira assigned PRE statuses
triage-api-actions.sh jira-snapshot --out /tmp/jira-snapshot.json

# Bitbucket Thien-authored PR inventory/state
triage-api-actions.sh bitbucket-snapshot --out /tmp/bitbucket-snapshot.json

# Jira + Bitbucket together
triage-api-actions.sh jira-bitbucket-snapshot --out /tmp/jira-bitbucket-snapshot.json
```

The outputs are sanitized snapshots suitable for report reconciliation. Store paths and counts in report data; do not store tokens.

## Sentry Jira Integration

The Sentry Jira integration for `check24-energie` is active:

- Integration id: `404933`
- Domain: `c24-energie.atlassian.net`
- PRE project id: `10004`
- Bug issue type id: `10004`
- Thien account id: `712020:98c2de13-71c4-48ae-a98a-3baa7fa11ba2`

Inspect the mounted Jira links for one Sentry issue:

```bash
triage-api-actions.sh sentry-jira-inspect --issue-id 7539085973
```

Read create/link fields:

```bash
triage-api-actions.sh sentry-jira-create-fields --issue-id 7539085973
triage-api-actions.sh sentry-jira-link-fields --issue-id 7539085973
```

Search Jira field values through Sentry:

```bash
triage-api-actions.sh sentry-jira-search --field assignee --query Thien
triage-api-actions.sh sentry-jira-search --field customfield_10034 --query Thien
triage-api-actions.sh sentry-jira-search --field project --query PRE
```

Dry-run Jira creation through Sentry:

```bash
triage-api-actions.sh sentry-jira-create-dry-run \
  --issue-id 7539085973 \
  --title "[Sentry] ENRG-ENERGYCENTER-REV-3M: Hooks called conditionally" \
  --description "Sentry Issue: https://check24-energie.sentry.io/issues/7539085973/"
```

Actually create a mounted Jira issue only after duplicate checks and idempotency guards pass:

```bash
triage-api-actions.sh sentry-jira-create \
  --issue-id 7539085973 \
  --title "[Sentry] ENRG-ENERGYCENTER-REV-3M: Hooks called conditionally" \
  --description "Sentry Issue: https://check24-energie.sentry.io/issues/7539085973/" \
  --labels "sentry,enrg-energycenter-rev,ENRG-ENERGYCENTER-REV-3M" \
  --confirmed-no-existing-jira \
  --execute
```

Dry-run link to an existing Jira issue:

```bash
triage-api-actions.sh sentry-jira-link-dry-run --issue-id 7539085973 --external-issue PRE-1234
```

Actually link only after both sides verify the same Sentry issue:

```bash
triage-api-actions.sh sentry-jira-link \
  --issue-id 7539085973 \
  --external-issue PRE-1234 \
  --confirmed-same-issue \
  --execute
```

The helper enforces these mutation gates:

- `sentry-jira-create-dry-run` and `sentry-jira-link-dry-run` reject `--execute`.
- `sentry-jira-create` requires `--execute`, `--confirmed-no-existing-jira`, `--title`, and `--description`.
- Before create executes, the helper re-inspects mounted Jira issues and refuses to create if any Jira issue is already mounted.
- `sentry-jira-link` requires `--execute` and `--confirmed-same-issue`.
- Direct Node helper execution has the same confirmation requirements, but future agents should use the bash wrapper so policy remains visible.

## Delegated Agents

Never invoke Claude or Cursor directly when the task context may contain credentials or token-bearing environment variables. Use:

```bash
triage-api-actions.sh delegate-cursor --model auto ...
triage-api-actions.sh delegate-claude ...
```

The wrapper uses `safe-delegate-cli.mjs`, which strips Sentry/Jira/Bitbucket token-like environment variables before starting the child CLI.
It also does not pass `SSH_AUTH_SOCK` by default, so delegated agents cannot silently reuse the local SSH agent for git pushes.

Every Cursor bug-fix delegation must use a dedicated worktree and branch per Sentry issue. Fetch origin first, choose the refreshed base in this order: `origin/release`, `origin/main`, `origin/master`, then create or reuse an issue-specific worktree outside the main repo checkout. Use branch names shaped like `codex/<repo>-sentry-<short-id>-<issue-id>`. Do not run Cursor bug-code fixes directly in the main repo path; this keeps multiple issues in the same repository isolated and parallelizable.

Before opening or updating a Bitbucket PR, fetch the intended destination branch again and rebase the issue branch onto that exact destination (`release`, `main`, or `master` as shown by the PR form/API). Rerun the relevant verification after the rebase. Never create the PR from a branch whose base was only inferred from an older checkout or from a different target branch. If local hooks require unavailable Docker, record that blocker in the report and use a one-command hook override only after equivalent focused checks have passed.

## Browser Fallback Still Required

Prefer API actions above for read-only source and status checks when they succeed. Browser fallback is still required for:

- Sentry, Jira, Bitbucket, or Sentry-Jira integration API/connector 403 or permission blocks when the same source/action can be verified or completed through an authenticated browser. Prefer Firefox where a verified Firefox-capable control path exists; otherwise use Chrome compatibility helpers and report the fallback.
- Sentry or Jira UI-only evidence when API metadata is insufficient
- Sentry unlink operations unless an API unlink endpoint has been separately verified; this playbook verifies inspect/create/link only
- Jira transitions if no safe connector/API transition path has been verified
- Bitbucket review/comment/activity details not present in the API snapshot
- Sonar, staging, and production smoke checks when visual validation is required

When Sentry Jira integration API inspect/create/link is blocked by 403 and no verified Firefox-capable helper exists, use the Chrome compatibility detail scanner in standalone mode so it does not depend on retired `localhost:8766` UI acknowledgements:

```bash
SENTRY_TRIAGE_STANDALONE=1 \
  /Users/thien.nguyen/thiennp.github.io/codex-automations/sentry-chrome-tab-snapshot/scan-issue-jira-links.mjs \
  /Users/thien.nguyen/thiennp.github.io/codex-automations/sentry-chrome-tab-snapshot.json
```

For verification without mutations, add `SENTRY_TRIAGE_JIRA_DRY_RUN=1` and optionally `SENTRY_ISSUE_JIRA_SCAN_LIMIT=1`.

Chrome is not required for reporting. Use Daily Magic WebSocket reporting through `/thien/ws`; if reporting fails, include `reportWebSocketWarning` in the final response.

## Do Not Guess

- Do not create a Jira ticket if `sentry-jira-inspect` shows a matching mounted PRE.
- Do not link a Jira ticket unless Jira evidence and Sentry evidence point to the same issue id/key/url.
- Do not report `sentry-jira-create-dry-run` or `sentry-jira-link-dry-run` as completed mutations. They intentionally do not change Sentry/Jira.
- Do not use `duplicateOf`, `duplicatePre`, `coveredByPre`, or `groupedIntoPre` without verified same-round evidence.
- Do not hand-roll bug-code fixes; prepare Cursor handoff and delegate through the safe wrapper.
- Do not treat API source-list success as proof that browser-only UI actions are available.
