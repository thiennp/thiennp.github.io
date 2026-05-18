# Commit message (code-verified)

Commit message workflow **after** typecheck/tests (and other gates the playbook lists).

Follow: **`.cursor/docs/workflows/playbooks/commits/code-verified-commit.md`**.

Verification expectations: **`.cursor/rules/task-verification.mdc`**.

Orientation: **`.cursor/skills/energycenter-commit-prompts/SKILL.md`**.

**Frontend `test-update`:** the code-verified playbook assumes **`npm run test-update`** has been run (or will be run) for **`frontend/`** application changes; do not consider verification complete without it.
