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

### `decision-reapply-after-new-commits-monitor`

- Purpose: prevent old review decisions from being treated as still settled after new commits landed and Bitbucket no longer shows the prior state.
- Gate: during phase 6 effective-change check, immediately after detecting subsequent effective code changes after the last Thien or agent review decision.
- Inputs:
  - `state/bitbucket-pr-details.json`
  - `state/agent-handoff.json`
  - live Bitbucket PR activity/state in Chrome
  - local diff against the latest reviewed point
- Pass condition:
  - if a prior Thien or `-- Thien's Agent --` approval/request-changes exists and later effective code changes landed after that decision, the automation must re-review the new effective diff and reapply a fresh final decision in the current run;
  - the PR must not be treated as settled only because the current summary shows `1+ approval` or `No changes requested` from another reviewer while the prior Thien/agent decision is stale relative to newer commits.
- Fail behavior:
  - Emit the affected PR IDs and their stale prior decision timestamps in Daily Magic.
  - Resume from the first affected PR, re-review the post-decision diff, and reapply the resulting approval or changes-requested state.
  - Do not report the PR as already approved or already resolved until the fresh decision is applied for the latest effective diff.

### `non-actionable-generated-artifact-monitor`

- Purpose: prevent the automation from blocking a PR solely because generated or incidental artifact files changed when those artifacts are not themselves the subject of the review.
- Gate: during primary synthesis, before any blocking comment or `Request changes` decision is finalized.
- Inputs:
  - local diff/stat for the PR
  - the synthesized findings list
  - PR title and repo context
- Pass condition:
  - generated artifact churn such as coverage-report output, snapshots, or similar generated files is not treated as a standalone blocker unless the artifact itself is the product under review or the repository has an explicit enforced rule that makes the artifact diff actionable;
  - any blocking finding must still point to a user-facing bug, regression, broken verification contract, or explicit repo rule violation in the effective change.
- Fail behavior:
  - drop the generated-artifact-only blocker from the final findings set;
  - resume synthesis and choose a decision based only on actionable code or explicit repo-rule issues;
  - do not post or preserve a blocking comment whose only basis is generated artifact churn.

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

### `single-tab-bitbucket-state-monitor`

- Purpose: prevent PR decisions from being attached to the wrong Bitbucket page when multiple live checks race on the same active Chrome tab.
- Gate: before any live Bitbucket state assertion, comment verification, or approval/request-changes click in phases 5, 11, and 12.
- Inputs:
  - live Chrome window/tab assignment for the current PR
  - the target PR URL currently under inspection
  - any pending live state-read or click sequence for other PRs
- Pass condition:
  - only one PR at a time is allowed to use a given active Chrome tab for live state reads or clicks;
  - if multiple PRs are inspected concurrently, each PR is pinned to a separate explicit Chrome tab/window and the assignments do not overlap;
  - any approval/request-changes verification is performed only after confirming the page title and URL still match the intended PR.
- Fail behavior:
  - stop the overlapping live checks immediately;
  - re-open the intended PR page and rerun the live assertion sequentially;
  - do not trust or report a Bitbucket state read that came from a raced active-tab navigation.
