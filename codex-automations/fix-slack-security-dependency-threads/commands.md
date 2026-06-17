# Daily-vulnerabilities-fix Commands

## `check PR`

Use [`check-pr-command.md`](./check-pr-command.md).

Short meaning: check all automation-created security dependency PRs, merge approved PRs with no failed pipeline, investigate failed pipelines, fix failures caused by the security work, and merge approved PRs when failures are unrelated.

For all security dependency PRs, inspect the actual code, package manifests, and lockfile dependency paths before writing the description. The PR description must include a plain-language `Risk and impact` section with short separate bullet lines and bold topic labels: `Risk level`, `Affected area`, `Change risk`, `QA needed`, and `If not changed`. Make the real impact clear: runtime, package consumer, build, test, Storybook, lint, or publish/install only. Avoid vague wording and never make reviewers guess from package names alone. Do not include `Possible side effect`, `Security impact`, `Operational impact`, or rollback unless Thien explicitly asks for it.

If `QA needed` identifies real product or package-consumer QA, the automation must push the security changes to staging, comment in the PR with the QA reason and exact test target, mention `@Michael Wiesner` in the Jira ticket with the staging target and PR link, move the Jira ticket to `Test`, and report all four actions in Daily Magic.
