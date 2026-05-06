---
name: enrg-pr-rebase-test-update
description: >-
  Rebase and refresh a Bitbucket pull request for CHECK24 EnergyCenter. Use when
  the user sends a Chrome/Bitbucket PR link for `check24/enrg-energycenter-rev`
  (including the common typo `enrg-energycetner-rev`) and asks to do the standard
  PR rebase/update flow: resolve the PR source branch, rebase onto `release`, run
  frontend `npm run test-update`, amend generated changes into the last commit,
  and push with `--force-with-lease`.
---

# ENRG PR Rebase Test Update

## Scope

Use this only for Bitbucket PRs whose URL points to:

```text
https://bitbucket.org/check24/enrg-energycenter-rev/pull-requests/<id>
```

Treat `enrg-energycetner-rev` as a user typo for `enrg-energycenter-rev`. If the URL is for another repo, do not run this project-specific workflow unless the user explicitly confirms the repo and target behavior.

## Workflow

1. Locate the repo, preferring `/Users/thien.nguyen/enrg-energycenter-rev`; fall back to a filesystem search if needed.
2. Open the repo in Cursor with `open -a Cursor /Users/thien.nguyen/enrg-energycenter-rev`.
3. Confirm the working tree is clean before switching branches. If there are unrelated local edits, stop and ask how to handle them.
4. Extract the PR id from the URL and resolve the actual source branch. Prefer Bitbucket API/CLI or the PR page source branch over guessing from the PR id.
5. Update `release`:

```bash
git switch release
git fetch origin release <source-branch>
git pull --ff-only
```

If broad fetch hits remote-tracking lock races, retry a narrow fetch for only `release` and the source branch.

6. Check out the PR branch. If a local branch already exists, switch to it and inspect status/divergence before changing it. If it does not exist:

```bash
git switch --track "origin/<source-branch>"
```

7. Rebase onto the updated release branch:

```bash
git rebase release
```

Resolve conflicts normally. Generated coverage HTML conflicts may be resolved pragmatically because `npm run test-update` regenerates final coverage artifacts, but never discard source, test, or documentation changes without inspection.

8. Run the project update test gate:

```bash
cd frontend
npm run test-update
```

9. Inspect changes after the test run. If files changed, stage the legitimate regenerated/source changes and amend the last commit:

```bash
git add <changed-files>
git commit --amend --no-edit
```

If the commit-msg hook rejects an existing message such as `00000: fix(scope): ...`, preserve the meaning and trailers while converting to the repo-required shape, for example:

```text
00000: (fix) filter wireframe reportVisitToAPI Load failed noise
```

10. Push the rebased branch:

```bash
git push --force-with-lease
```

11. Finish with `git status --short --branch`, the final commit hash, the test result summary, and the Bitbucket PR link if Bitbucket prints one.
