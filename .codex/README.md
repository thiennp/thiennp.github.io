# Codex Shared Assets

Portable Codex and Cursor-adjacent assets mirrored from local `enrg-*` and `enrglib-*` repositories.

## Layout

- `skills/` - Codex skills loaded by `~/.codex/skills`.
- `rules/` - shared Cursor rule files from `.cursor/rules`.
- `commands/` - shared Cursor command files from `.cursor/commands`.
- `agents/` - shared top-level Cursor orchestrator agents from `.cursor/agents`.
- `subagents/` - shared narrow Cursor worker/checklist prompts from `.cursor/subagents`.

Project repositories keep their original `.cursor/...` paths, but duplicate shared files are symlinks back into this directory.

## Sync policy

Only shared files are centralized here. Files that differ between projects, or that literally mention a concrete scanned repo name, stay in their original project so repo-specific behavior does not get flattened by accident.

Top-level agent files must stay in `agents/` only when they are real orchestrator agents, normally `agent-*.md` with Cursor frontmatter. Worker/checklist prompts belong in `subagents/`.
