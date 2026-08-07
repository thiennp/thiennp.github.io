---
id: wm-20260807-002
date: 2026-08-07
type: decision
severity: medium
projects: [thiennp.github.io, global]
tags: [cursor, memory, agents, github]
status: active
summary: Cross-project agent memory lives in agents/work-memory with before/after workflow
---

# Cross-project work memory home

## Context
Need one place for history/lessons/mistakes across every project, wired into global Cursor rules/commands.

## What happened
Chose `thiennp.github.io/agents/work-memory/` as the canonical store. Global Cursor already symlinks:

- `~/.cursor/rules` → `agents/.cursor/rules`
- `~/.cursor/commands` → `agents/.cursor/commands`
- `~/.cursor/skills` → `agents/.codex/skills`

## Do
- Before substantive tasks: read `INDEX.md` + `mistakes/INDEX.md`
- After big enough tasks: log an entry and refresh indexes
- Keep entries short, frontmatter-first, no secrets

## Don't
- Scatter personal agent memory across random project folders
- Duplicate product Knowledge Base or per-repo RAG corpora here

## Related
- Rule: `agents/.cursor/rules/work-memory.mdc`
- Commands: `/work-memory-recall`, `/work-memory-log`, `/work-memory-finish-check`
- Skill: `agents/.codex/skills/work-memory/SKILL.md`
