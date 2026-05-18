# Extract to utility

Refactor duplicated or misplaced logic into **`src/utils/`** or feature-local **`utils/`** per team patterns.

Follow: **`.cursor/docs/workflows/playbooks/quality/extract-to-util.md`**.

Reuse existing helpers first: **`.cursor/rules/existing-utilities.mdc`**, **`.cursor/rules/utility-naming-conventions.mdc`**.

**Frontend `test-update`:** if this refactor touches **`frontend/`** application code (**`.cursor/rules/task-verification.mdc`**), run **`npm run test-update`** from **`frontend/`** before completing the task.
