---
name: energycenter-commit-prompts
description: >-
  Chooses the right commit-message and staging workflow for EnergyCenter: quick
  commit, comprehensive commit, or code-verified commit. Use when the user asks for
  a commit message, staged changes review, or POST-/00000 commit format.
---

# Commit prompts (quick, comprehensive, verified)

Team conventions: **`.cursor/rules/commit-workflow.mdc`**, **`.cursor/rules/commit-message-standards.mdc`** (`POST-<n>:` vs `00000:`).

| Intent | Open this prompt |
|--------|------------------|
| Fast message from diff | `.cursor/docs/workflows/playbooks/commits/quick-commit.md` |
| Broader review + message | `.cursor/docs/workflows/playbooks/commits/comprehensive-commit.md` |
| Message after typecheck / **`test-update`** gate | `.cursor/docs/workflows/playbooks/commits/code-verified-commit.md` |

**Frontend application changes:** any session that edits **`frontend/`** per **`.cursor/rules/task-verification.mdc`** must run **`npm run test-update`** from **`frontend/`** before the change is complete (in addition to any commit-playbook step).

**Always** confirm with the user before **`git commit`** and before **`git push`** per **commit-workflow.mdc**.

## Related

- **`.cursor/docs/workflows/playbooks/quality/extract-to-util.md`** — extracting logic to **`src/utils/`** before committing
