# Split `.cursor` vs application commits

When work mixes **`.cursor/`** with **`frontend/`** (and other app paths), split commits so agent config can land on **`release`** while the feature branch carries application changes, then rebase.

Follow: **`.cursor/docs/workflows/playbooks/git-bitbucket/split-cursor-commit-rebase.md`**.

Commit hygiene: **`.cursor/rules/commit-workflow.mdc`** and **`.cursor/rules/git-workflow.mdc`** (do not mix unrelated scopes).

Orientation: **`.cursor/skills/git-staging-and-split-commits/SKILL.md`**.

After **`frontend/`** application commits on the feature branch, run **`npm run test-update`** from **`frontend/`** (**`.cursor/rules/task-verification.mdc`**).
