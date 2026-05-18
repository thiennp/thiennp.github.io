---
name: git-verify-feature-branch
description: Print current branch name to confirm you are on a feature branch
---

# Verify current Git branch

From the repository root.

## Command

```text
git branch --show-current
```

Expect a branch like **`feature/PRE-XXX`**. If you are on **`release`**, stop and create a proper branch (see **`/git-sync-release-and-feature-branch`**).
