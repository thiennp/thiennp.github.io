---
name: energycenter-commit-prompts
description: Selects the appropriate EnergyCenter commit workflow for quick, comprehensive, or code-verified commits and repository-compliant messages.
---

# EnergyCenter Commit Prompts

Use this skill to choose between quick, comprehensive, and verification-backed
commit workflows. Team conventions live in **`.cursor/rules/commit-workflow.mdc`**
and **`.cursor/rules/commit-message-standards.mdc`** (`POST-<n>:` vs `00000:`).

| Intent | Open this prompt |
|--------|------------------|
| Fast message from diff | `.cursor/docs/workflows/playbooks/commits/quick-commit.md` |
| Broader review + message | `.cursor/docs/workflows/playbooks/commits/comprehensive-commit.md` |
| Message after typecheck / **`test-update`** gate | `.cursor/docs/workflows/playbooks/commits/code-verified-commit.md` |

**Frontend application changes:** any session that edits **`frontend/`** per **`.cursor/rules/task-verification.mdc`** must run **`npm run test-update`** from **`frontend/`** before the change is complete (in addition to any commit-playbook step).

**Always** confirm with the user before **`git commit`** and before **`git push`** per **commit-workflow.mdc**.

## Related

- **`.cursor/docs/workflows/playbooks/quality/extract-to-util.md`** - extracting logic to **`src/utils/`** before committing
