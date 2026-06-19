# Daily-vulnerabilities-fix Commands

## `check PR`

Use [`check-pr-command.md`](./check-pr-command.md).

Short meaning: check all automation-created security dependency PRs, merge approved PRs with no failed pipeline, investigate failed pipelines, fix failures caused by the security work, and merge approved PRs when failures are unrelated.

For all security dependency PRs, inspect the actual code, package manifests, and lockfile dependency paths before writing the description. The PR description must include a plain-language `Risk and impact` section with short separate bullet lines and bold topic labels: `Risk level`, `Affected area`, `Change risk`, `QA needed`, and `If not changed`. Make the real impact clear: runtime, package consumer, build, test, Storybook, lint, or publish/install only. Avoid vague wording and never make reviewers guess from package names alone. Do not include `Possible side effect`, `Security impact`, `Operational impact`, or rollback unless Thien explicitly asks for it.

If `QA needed` identifies real product or package-consumer QA, the automation must push the security changes to staging, comment in the PR with the QA reason and exact test target, mention `@Michael Wiesner` in the Jira ticket with the staging target and PR link, move the Jira ticket to `Test`, and report all four actions in Daily Magic.

## Jira Ticket Description Improvement

After creating any Jira ticket, open the newly created issue in Jira UI when a browser session is available and look for the `Improve description` button.

- If the button is found, click it, review the generated description, and save/apply it only when it preserves the concrete security facts: repo, branch, manifest path, package, vulnerable/fixed versions, advisory ids, scanner source, real risk, and verification plan.
- If the button is missing or Jira UI is unavailable, record that evidence in Jira/Daily Magic/memory/final output when relevant and continue.
- Missing `Improve description` is not a blocker; losing security evidence is a blocker and must be corrected before the ticket is considered ready.

## Helper Package Audits

For every repository verification or remediation, also inspect first-party helper package areas rooted at `.cursor/`, `cli/`, and `rag/`.

- If a helper area contains `package.json` together with `package-lock.json`, `npm-shrinkwrap.json`, or `pnpm-lock.yaml`, run the matching audit for that manifest.
- Use npm audit for `package-lock.json` or `npm-shrinkwrap.json`.
- Use pnpm audit for `pnpm-lock.yaml`.
- Exclude `node_modules`, build outputs, caches, vendored third-party code, and generated folders.
- If `package.json` exists without a supported lockfile, record it as discovered but not audited unless the repo already has a safe lockfile-less audit policy.
- If multiple supported lockfiles exist in the same helper package, report the ambiguity and do not guess unless repo conventions clearly identify the active package manager.
- Treat scanner-reported helper vulnerabilities as in-scope security dependency work even when the package-audit board row points at a different manifest.
- Fix only actionable dependency vulnerabilities needed to make the helper audit pass, preserving the helper package manager and lockfile.
- Record every helper manifest audit status, fix, skipped reason, and verification evidence in Jira, PR notes, Daily Magic, memory, and final output.

## PR-Ready Install-Sync Gate

Before any security dependency branch is pushed, PR is opened or updated, Jira is moved to `In Code Review`, or Daily Magic reports `wait_for_review`:

- Fetch the target branch and rebase or recreate the security branch on the latest target branch.
- Run the repo's real clean-install validation for every changed package manifest.
- For npm locks, run `npm ci --ignore-scripts --dry-run` with the repo's documented flags and registry config.
- For pnpm locks, run the repo's frozen-lockfile install check when supported.
- For Composer locks, run the repo's dry-run install check.
- Do not rely on `npm audit`, `pnpm audit`, `composer audit`, or OSV alone.
- If `package.json` and the lockfile are out of sync, fix the lockfile and rerun the install-sync check before push/report.
- If clean install is blocked by a known pre-existing repo issue, prove it by running the same command on the fresh target branch and record that evidence in the PR, Jira, Daily Magic, memory, and final output.
- Use a separate read-only verifier subagent before push or PR-ready reporting. The verifier must check branch freshness, changed manifests, clean-install evidence, scanner evidence, and PR risk text.

## Repository Fix Delegation

Delegate each actionable repository fix to its own bounded Repository Fix Agent subagent, so independent repos can progress in parallel.

- One repo-fix subagent owns exactly one repository, one target branch, one security issue batch, and one isolated worktree/file set.
- The main agent remains the only actor allowed to push, force-push, create/update PRs, transition Jira, comment in Jira or Bitbucket, write automation memory, or report final state.
- Before any push or PR-ready report, use a separate read-only verifier subagent for that repo's branch freshness and install-sync gate.

## Package Audit Board Monitor

Before any final status, final chat answer, memory summary, or goal completion, spawn a read-only Package Audit Board Monitor subagent.

- The monitor must reopen `https://sec.check24.de/package-audit?slug=power&vulnerabilityCountsSearch=critical%2Chigh%2Cmedium%2Clow`.
- It must extract the current visible rows from the live authenticated board.
- It must compare live board rows against Jira, Bitbucket, and scanner outcomes.
- It may return `PASS` only when every visible row is either gone from the board after recheck, explicitly blocked with fresh evidence, or intentionally still visible with a clear stale/recheck-needed explanation.
- The main agent must not say all vulnerabilities are done unless this monitor confirms the live package-audit board matches that statement.
- If the board still shows fixed repos, trigger the board `Recheck` action when available, rerun extraction, and report the board-visible state honestly.

## Daily Magic Report Payload Guard

Before sending any `agent.action` to Daily Magic, validate that the `category` and `subcategory` are accepted by the current reporting protocol.

- Use exact Jira subcategory names from the protocol, for example `Transition workflow` instead of invented variants such as `Transition issue`.
- If Daily Magic returns `agent.request.rejected`, do not assume the report landed. Fix the payload, resend it, and record the rejected field in the run notes.
- Treat this as a required reporting guard before final status so the dashboard does not miss completed Jira, Bitbucket, or blocker actions.
