# Commit message (quick)

Produce a commit message from the current change set (staged or as specified in the playbook).

Follow: **`.cursor/docs/workflows/playbooks/commits/quick-commit.md`**.

Use **`POST-<n>:`** or **`00000:`** prefixes per **`.cursor/rules/commit-message-standards.mdc`**. **Confirm with the user** before **`git commit`** and before **`git push`** (**`.cursor/rules/commit-workflow.mdc`**).

Orientation: **`.cursor/skills/energycenter-commit-prompts/SKILL.md`**.

**Frontend `test-update`:** if staged changes include **`frontend/`** application code (**`.cursor/rules/task-verification.mdc`**), run **`npm run test-update`** from **`frontend/`** before **`git commit`**.
