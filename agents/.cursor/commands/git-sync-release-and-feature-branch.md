---
name: git-sync-release-and-feature-branch
description: Checkout release, pull latest, create feature branch (replace PRE-XXX)
---

# Sync `release` and create a feature branch

From the repository root. Replace **`PRE-XXX`** with your ticket (e.g. **`PRE-1234`**). Use **`fix/`** or **`refactor/`** instead of **`feature/`** when appropriate.

## Command

```text
git checkout release
git pull origin release
git checkout -b feature/PRE-XXX
git branch --show-current
```
