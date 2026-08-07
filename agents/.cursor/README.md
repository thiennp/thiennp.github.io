# Cursor Shared Assets

This directory contains Cursor-native shared configuration.

## Layout

- `rules/` - shared `.mdc` Cursor rules. These were moved out of `agents/.codex/rules` because Cursor reads project rules from `.cursor/rules`.
- `commands/` - shared Cursor slash-command entrypoints and references.
- `agents/` - symlink to `../.codex/agents`.
- `subagents/` - shared narrow Cursor worker/checklist prompts.
- `skills/` - symlink to `../.codex/skills`.

Cross-project memory lives one level up in `agents/work-memory/` (not under `.cursor/`). The always-apply rule `rules/work-memory.mdc` and commands `work-memory-*.md` point agents there.

The repository root `.cursor` symlink points here so opening `thiennp.github.io` in Cursor exposes the shared rules at the expected path.
