## Monitor Subagents

This automation uses named monitor subagents as hard gates.

Rule:
- Whenever the automation makes a new class of mistake, add or update a monitor subagent here and wire the same rule into `automation.toml` before the run may finish as `done`.

### `queue-completeness-monitor`

- Purpose: prevent partial Bitbucket queue sweeps from being reported as finished.
- Gate: immediately before phase 13 final reporting.
- Inputs:
  - `state/bitbucket-reviewing-queue.json`
  - `state/run-outcome-ledger.json`
- Pass condition: every PR exported in the current reviewing queue has a non-`pending` outcome in the ledger.
- Fail behavior:
  - Emit the unresolved PR IDs in Daily Magic.
  - Resume processing from the first unresolved PR.
  - Do not mark the run complete.

### `ledger-persistence-monitor`

- Purpose: prevent silent loss of queue state during crashes, retries, or browser failures.
- Gate: before phase 5 begins per-PR browser work, and after every PR outcome mutation.
- Inputs:
  - `state/run-outcome-ledger.json`
- Pass condition: the ledger exists on disk and reflects the latest known per-PR outcomes for the active run.
- Fail behavior:
  - Emit the failure in Daily Magic.
  - Rebuild or persist the ledger before continuing.
  - Do not continue to the next PR while the latest outcome is only in memory.

### `review-state-restore-monitor`

- Purpose: prevent previously reviewed PRs from being left open when Bitbucket loses the last Thien or agent review state but the effective diff has not changed.
- Gate: during phase 6 effective-change check, before any PR can be recorded as skipped because there is no new effective code change.
- Inputs:
  - `state/bitbucket-pr-details.json`
  - `state/agent-handoff.json`
  - live Bitbucket PR activity/state in Chrome
  - `state/run-outcome-ledger.json`
- Pass condition:
  - if the last valid Thien or `-- Thien's Agent --` state is still present, normal skip rules may apply;
  - if the last valid state is missing and there is still no subsequent effective code change, the automation restores that exact state in Bitbucket during the current run instead of skipping.
- Fail behavior:
  - Emit the affected PR IDs and missing prior states in Daily Magic.
  - Resume from the first affected PR and restore the missing review state.
  - Do not mark the PR as `skipped-approved` or `skipped-already-reviewed` while the missing state remains unrestored.

### `comment-before-request-changes-monitor`

- Purpose: prevent Bitbucket `Request changes` from being applied before the fresh blocking comment is visibly posted in the same review pass.
- Gate: during phase 12, immediately before any `Request changes` or restore-to-`changes requested` click.
- Inputs:
  - live Bitbucket PR activity/state in Chrome
  - the prepared blocking comment text for the current pass
  - `state/run-outcome-ledger.json`
- Pass condition:
  - the comment composer opened successfully;
  - the blocking comment text and `-- Thien's Agent --` signature were inserted;
  - comment submission was confirmed in PR activity before the review-state click happens.
- Fail behavior:
  - Emit the affected PR ID and the failed comment checkpoint in Daily Magic.
  - Record outcome `blocked` with the concrete failed checkpoint in the ledger.
  - Do not click `Request changes`, `Approve`, or `Decline` in that pass.
