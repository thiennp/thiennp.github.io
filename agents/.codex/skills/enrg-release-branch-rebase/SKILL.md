---
name: enrg-release-branch-rebase
description: >-
  Explicit-only CHECK24 ENRG release branch rebase workflow. Use only when the
  user explicitly invokes this skill by name or asks to run this release rebase
  skill for a Bitbucket PR link. Do not trigger from a PR link alone. Supports
  check24/enrg-web-frontend and check24/enrg-energycenter-rev, rebases locally
  through release, opens PhpStorm to review the resulting release change, and
  never pushes.
---

# ENRG Release Branch Rebase

## Trigger

Run only when the user explicitly asks for this skill, for example:

```text
Use $enrg-release-branch-rebase on https://bitbucket.org/check24/enrg-web-frontend/pull-requests/1005/overview
```

Ignore eligible PR links in earlier chat history unless the latest user request clearly asks to run them. A plain Bitbucket PR link is not enough.

## Scope

Supported Bitbucket repositories:

```text
check24/enrg-web-frontend
check24/enrg-energycenter-rev
```

Do not push. If the repo, PR URL, or desired branch flow is different, stop and ask for confirmation.

## Workflow

1. Extract the repo slug and PR id from the Bitbucket URL.
2. Resolve the actual PR source branch. Prefer Bitbucket API/CLI or authenticated page content over guessing from the PR id:

```bash
curl -fsSL "https://api.bitbucket.org/2.0/repositories/check24/<repo>/pullrequests/<pr-id>" | jq -r '.source.branch.name'
```

3. Locate the local checkout. Prefer the repo currently open in Cursor when discoverable, then `/Users/thien.nguyen/<repo>`, then a filesystem search under `/Users/thien.nguyen`. Verify the remote points to `bitbucket.org:check24/<repo>.git` or the equivalent HTTPS remote.
4. Preflight the repo before switching branches:

```bash
git status --short --branch
git rev-parse --git-path rebase-merge
git rev-parse --git-path rebase-apply
git rev-parse --git-path MERGE_HEAD
```

Stop if a rebase/merge is already in progress or if uncommitted local changes would be disturbed.

5. Fetch, update `release`, and record the comparison base:

```bash
git fetch origin --prune
git switch release
before_release_sha="$(git rev-parse HEAD)"
git fetch origin release "<source-branch>"
git merge --ff-only origin/release
```

If broad fetch hits remote-tracking lock races, retry a narrow fetch for only `release` and the source branch.

6. Check out the PR source branch:

```bash
git switch "<source-branch>" || git switch --track "origin/<source-branch>"
```

If a local branch already exists, inspect its status and divergence before changing it.

7. Rebase the source branch onto updated `release`:

```bash
git rebase release
```

8. Rebase `release` onto the updated source branch:

```bash
git switch release
git rebase "<source-branch>"
after_release_sha="$(git rev-parse HEAD)"
```

Leave the repo on `release` after success.

9. Open PhpStorm and show the release change:

```bash
phpstorm "<repo-path>" || pstorm "<repo-path>" || open -a "PhpStorm" "<repo-path>"
git diff --stat "${before_release_sha}..${after_release_sha}"
git log --oneline --decorate "${before_release_sha}..${after_release_sha}"
```

Prefer an IDE diff if configured, for example:

```bash
git difftool -d --dir-diff "${before_release_sha}" "${after_release_sha}"
```

If a direct PhpStorm diff cannot be opened, still open the repo in PhpStorm and report the exact comparison range plus `git diff --stat`.

## Failure Handling

If any command fails, stop immediately. Report:

- PR URL
- repository path
- current branch
- failing command
- conflict or error summary
- exact next action needed from the user

For conflicts, do not resolve by guessing and do not push.

## Completion Report

On success, report:

- PR URL
- repository path
- source branch
- final checked-out branch
- `before_release_sha..after_release_sha`
- whether PhpStorm and a diff view opened
- concise command summary
