# Check PR Command

When Thien says `check PR` in the context of Daily-vulnerabilities-fix or security dependency work, do this:

1. List all automation-created security dependency PRs that are tracked by the current run, memory, Jira Epic `PRE-4538`, or recent Daily Magic security work reports.
2. For each PR, check Bitbucket state, approvals, source commit build statuses, Jira ticket status, and target branch.
3. If the PR is already merged, record it as done and do not touch it.
4. If the PR is open, approved, and has no failed or in-progress pipeline, merge it.
5. If the PR is open and has a failed pipeline, inspect the pipeline logs.
6. If the failed pipeline is caused by the security fix, fix the branch, rerun verification, push, and keep the Jira ticket in code review.
7. If the failed pipeline is unrelated to the security fix and the PR is approved, merge it anyway and record the unrelated failure evidence.
8. If the PR is open but not approved, do not merge it. Report that it is waiting for approval.
9. If Jenkins or Bitbucket pipeline logs are blocked by login/session, do not guess. Report the exact access blocker and leave the PR unmerged unless explicit approval and unrelated-failure evidence are already available.
10. Report every repo/PR outcome through Daily Magic and in the chat: merged, already merged, waiting for approval, failed-related-fixed, failed-unrelated-merged, or blocked.

Security dependency PR freshness and install-sync gate:

- Immediately before final verification, push, PR creation/update, or any PR-ready/report-ready claim, fetch the target branch and remote security branch, then rebase the security branch onto the latest target branch.
- Record the target branch name, latest target SHA, security branch SHA before/after rebase, and `git merge-base --is-ancestor <latest-target-sha> HEAD` evidence.
- If rebase is needed and fails, or freshness cannot be proven, stop as `Block`; do not push or report ready.
- For every npm/package-lock security dependency change, run the repository/package's actual clean-install command from the package directory that owns the changed lockfile.
- Prefer the command used by Jenkins, package scripts, repo docs, or pipeline config; for npm lockfiles this must include `npm ci` unless the repo documents a stricter equivalent.
- `npm audit` is not a substitute for clean install.
- Treat `package.json` and `package-lock.json`/`npm-shrinkwrap.json` drift as a hard gate.
- If clean install fails with lockfile sync errors such as missing packages in the lockfile, changed dependency specs, or npm `EUSAGE`, block the PR-ready path and fix/regenerate the lockfile from the latest target branch before retrying.
- Do not bypass lockfile-sync errors as a local-only validation gap.
- Before any push, force-push, PR creation/update, merge-ready claim, or Daily Magic/Jira/PR-ready report, spawn an independent read-only verifier subagent.
- The verifier must check branch freshness evidence and clean-install evidence from the exact changed package path, confirm package manifest and lockfile sync, and return a pass/block handoff.
- The main agent may push or report PR-ready only after the verifier handoff explicitly says branch freshness and install-sync gates passed.

Before creating or updating any security dependency PR, inspect the actual code, package manifests, and lockfile dependency paths first. Then ensure the PR description includes a human-readable `Risk and impact` section with:

- `Risk level`: the practical risk of the dependency/lockfile change in plain language.
- `Affected area`: the concrete package, feature, app area, build pipeline, or user-facing flow proven by the inspected dependency path.
- `Change risk`: what could realistically break because of the dependency or lockfile change, including whether the impact is runtime, build, test, Storybook, lint, or publish/install only.
- `QA needed`: the exact validation or manual QA target when there is real product or package-consumer risk; say when broad manual QA is not the primary target and why.
- `If not changed`: the practical consequence of leaving the vulnerable dependency path in place, tied to the actual vulnerable path and not a generic statement.

Keep the section short and clear. Use separate bullet lines with bold topic labels. Do not make the reviewer infer impact from package names alone; include the evidence that shows whether the change affects product runtime, package consumers, or tooling only. Avoid generic lines such as "known vulnerable dependency versions stay in the repo". Do not include `Possible side effect`, `Security impact`, `Operational impact`, or rollback sections unless Thien explicitly asks for them.

If the evidence-based risk section says real QA is needed, complete the QA handoff flow before treating the item as ready:

1. Push the security changes to the relevant staging path or staging release branch.
2. Comment on the Bitbucket PR that QA is required, why it is required, what was pushed to staging, and exactly which area Michael should test.
3. Add a Jira ticket comment mentioning `@Michael Wiesner`, asking him to test the concrete affected area, and include the staging target plus PR link.
4. Move the Jira ticket to `Test`.
5. Report the staging push, PR comment, Jira mention, and Test-stage transition in Daily Magic.

Always include the repository name and the phrase `security dependency` or `security work` in reports.
