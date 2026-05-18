---
name: energycenter-agent-prompt-pipelines
description: Orchestrates EnergyCenter Cursor prompt pipelines for feature implementation, PR review, bug fixing, quality gates, and workflow task files.
---

# EnergyCenter Agent Prompt Pipelines

Use this skill to pick the correct Cursor workflow document before starting
larger EnergyCenter implementation, review, bug-fix, or verification work.
Modular tasks and agents live under **`.cursor/docs/workflows/`**. Index:
**`.cursor/docs/workflows/README.md`**.

## Implement feature

| Mode | Path |
|------|------|
| Monolith (legacy) | `.cursor/docs/workflows/playbooks/feature/implement-feature.md` |
| Steps in order | `.cursor/docs/workflows/tasks/implement-feature/` - start at **`00-README.md`**, then **`01-` through `05-`** |
| Focused agents | **`.cursor/agents/*.md`** and **`.cursor/subagents/*.md`** + **`.cursor/docs/workflows/agent-rubrics/implement/`** |

Quality gates and verification: **`.cursor/docs/workflows/tasks/implement-feature/04-quality-gates.md`** - **`npm run typecheck`**, **`npm run test-update`** (mandatory for **`frontend/`** application edits), and **`npm run pre-deploy`** when appropriate, per **`.cursor/rules/task-verification.mdc`**.

## Review PR

| Mode | Path |
|------|------|
| Monolith | `.cursor/docs/workflows/playbooks/review/review-pr.md` |
| Steps | `.cursor/docs/workflows/tasks/review-pr/` - **`00-README.md`** through **`07-`** |
| Specialist sweep | **`.cursor/agents/*.md`** and **`.cursor/subagents/*.md`** + **`.cursor/docs/workflows/agent-rubrics/review/`** |

Shared verdict format: **`.cursor/docs/workflows/_shared/verification-format.md`**.

## Other single-purpose prompts

| Task | File |
|------|------|
| Bug investigation + fix | `.cursor/docs/workflows/playbooks/quality/fix-bug.md` |
| Ticket vs implementation | `.cursor/docs/workflows/playbooks/quality/verify-ticket.md` |
| Coverage focus | `.cursor/docs/workflows/playbooks/quality/unit-test-coverage.md` |

## Related rules

- **`.cursor/rules/feature-development-workflow.mdc`**
- **`.cursor/skills/local-rag-two-pass/SKILL.md`** - mandatory RAG before deep **`frontend/src`** work
