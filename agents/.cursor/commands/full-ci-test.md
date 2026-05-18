---
name: full-ci-test
description: Run the full CI test pipeline (Jenkins-equivalent) before merge
---

# Full CI test

From the repository root.

## Command

```text
pnpm ci:test
```

Exit code must be **0** before merge or a merge-ready PR. This is the project gate described in **@task-verification.mdc**.
