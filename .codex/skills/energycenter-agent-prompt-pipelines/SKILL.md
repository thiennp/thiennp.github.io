---
name: energycenter-agent-prompt-pipelines
description: >-
  Orchestrates EnergyCenter Cursor prompt pipelines for implementing features,
  reviewing PRs, fixing bugs, and running quality gates. Use when the user wants a
  full feature workflow, modular PR review steps, implement-feature tasks, or
  points to .cursor/docs/workflows/tasks.
---

# Agent prompt pipelines (implement, review, fix)

Modular tasks and agents live under **`.cursor/docs/workflows/`**. Index: **`.cursor/docs/workflows/README.md`**.

## Implement feature

| Mode | Path |
|------|------|
| Monolith (legacy) | `.cursor/docs/workflows/playbooks/feature/implement-feature.md` |
| Steps in order | `.cursor/docs/workflows/tasks/implement-feature/` — start at **`00-README.md`**, then **`01-` … `05-`** |
| Focused agents | **`.cursor/agents/*.md`** (subagents) + **`.cursor/docs/workflows/agent-rubrics/implement/`** |

Quality gates and verification: **`.cursor/docs/workflows/tasks/implement-feature/04-quality-gates.md`** — **`npm run typecheck`**, **`npm run test-update`** (mandatory for **`frontend/`** application edits), **`npm run pre-deploy`** when appropriate — per **`.cursor/rules/task-verification.mdc`**.

## Review PR

| Mode | Path |
|------|------|
| Monolith | `.cursor/docs/workflows/playbooks/review/review-pr.md` |
| Steps | `.cursor/docs/workflows/tasks/review-pr/` — **`00-README.md`** through **`07-`** |
| Specialist sweep | **`.cursor/agents/*.md`** (subagents) + **`.cursor/docs/workflows/agent-rubrics/review/`** |

Shared verdict format: **`.cursor/docs/workflows/_shared/verification-format.md`**.

## Other single-purpose prompts

| Task | File |
|------|------|
| Bug investigation + fix | `.cursor/docs/workflows/playbooks/quality/fix-bug.md` |
| Ticket vs implementation | `.cursor/docs/workflows/playbooks/quality/verify-ticket.md` |
| Coverage focus | `.cursor/docs/workflows/playbooks/quality/unit-test-coverage.md` |

## Related rules

- **`.cursor/rules/feature-development-workflow.mdc`**
- **`.cursor/skills/local-rag-two-pass/SKILL.md`** — mandatory RAG before deep **`frontend/src`** work
