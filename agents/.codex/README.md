# Agent Shared Assets

Portable Codex and Cursor-adjacent assets mirrored from local `enrg-*` and `enrglib-*` repositories.

## Layout

- `skills/` - Codex skills loaded by `~/.codex/skills`.
- `commands/` - compatibility symlink to `../.cursor/commands`.
- `agents/` - shared top-level Cursor orchestrator agents from `.cursor/agents`.
- `subagents/` - compatibility symlink to `../.cursor/subagents`.

Cursor-native rules, commands, and subagents live in `../.cursor/`. The repo root `.cursor` points at `agents/.cursor`. Cursor `agents/` and `skills/` are symlinks back here so both tools can read the expected paths without duplicate copies.

Project repositories keep their original `.cursor/...` paths. Duplicate shared files are removed from local projects or centralized here when they are portable.

## Sync policy

Only shared files are centralized here. Files that differ between projects, or that literally mention a concrete scanned repo name, stay in their original project so repo-specific behavior does not get flattened by accident.

Top-level agent files must stay in `agents/` only when they are real orchestrator agents, normally `agent-*.md` with Cursor frontmatter. Worker/checklist prompts belong in `../.cursor/subagents/`.
