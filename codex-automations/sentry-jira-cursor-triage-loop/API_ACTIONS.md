# Sentry/Jira/Bitbucket API-First Actions

Use this file before guessing how to access Sentry, Jira, Bitbucket, Claude, or Cursor for the `sentry-jira-cursor-triage-loop` automation.

## Entry Point

Run API-first actions through:

```bash
/Users/thien.nguyen/thiennp.github.io/codex-automations/sentry-jira-cursor-triage-loop/triage-api-actions.sh <action> [args...]
```

The wrapper calls the underlying Node helpers and keeps mutation commands explicit. It reads credentials only through the helper scripts from `~/.env` or the current process environment. Never print, paste, log, or delegate token values.

## Retired Dependencies

Do not use or require the old local live report app at `http://127.0.0.1:8766/`.
Do not read or write `/Users/thien.nguyen/Desktop/Sentry Triage History/report-data.json` as automation state.
Do not create Jenkins blockers or require Jenkins PR/release/build checks.

Progress reporting still goes to `https://thiennp.github.io/report/`. Prefer the Codex in-app browser for that reporting page when an in-app browser control tool is exposed in the thread. If no in-app browser control is available and Chrome JavaScript automation is unavailable, record `reportHookWarning` in the heartbeat final instead of claiming the dashboard was updated. Google Chrome remains for external visual checks/mutations only.

## Fast Connectivity Check

```bash
/Users/thien.nguyen/thiennp.github.io/codex-automations/sentry-jira-cursor-triage-loop/triage-api-actions.sh check-all --out-dir /tmp
```

This verifies:

- Sentry Source A/Source B union through `SENTRY_AUTH_TOKEN`
- Jira assigned PRE snapshot through `JIRA_API_TOKEN` and `EMAIL`
- Bitbucket PR inventory through `BB_API_TOKEN`

If this passes, do not use Chrome for these read-only source-list/status reads.

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
- an `Ask Claude` button that sends sanitized row evidence to the local status server, which invokes Claude CLI through `safe-delegate-cli.mjs`
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

Claude receives only the sanitized prompt from the generated row. The server runs Claude through `safe-delegate-cli.mjs`, so token-like environment variables are scrubbed.

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

## Chrome Still Required

Prefer API actions above for read-only source and status checks. Chrome is still required for:

- Sentry or Jira UI-only evidence when API metadata is insufficient
- Sentry unlink operations unless an API unlink endpoint has been separately verified; this playbook verifies inspect/create/link only
- Jira transitions if no safe connector/API transition path has been verified
- Bitbucket review/comment/activity details not present in the API snapshot
- Sonar, staging, and production smoke checks when visual validation is required

Chrome is not required for browser-hook reporting. Use the Codex in-app browser for `https://thiennp.github.io/report/` when possible; if no callable in-app browser tool is available, report that limitation explicitly.

## Do Not Guess

- Do not create a Jira ticket if `sentry-jira-inspect` shows a matching mounted PRE.
- Do not link a Jira ticket unless Jira evidence and Sentry evidence point to the same issue id/key/url.
- Do not report `sentry-jira-create-dry-run` or `sentry-jira-link-dry-run` as completed mutations. They intentionally do not change Sentry/Jira.
- Do not use `duplicateOf`, `duplicatePre`, `coveredByPre`, or `groupedIntoPre` without verified same-round evidence.
- Do not hand-roll bug-code fixes; prepare Cursor handoff and delegate through the safe wrapper.
- Do not treat API source-list success as proof that Chrome-only UI actions are available.
