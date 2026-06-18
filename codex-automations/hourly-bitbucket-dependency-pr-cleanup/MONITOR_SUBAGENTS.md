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
