# Shared Agent Configuration

Portable AI-agent assets live here so they can be synced across machines.

## Layout

- `.codex/` - Codex-native assets. Skills live here; commands and subagents are compatibility symlinks into `.cursor`.
- `.cursor/` - Cursor-native assets. Rules, commands, and subagents live here because Cursor reads `.cursor/...` paths. Agents and skills are symlinked from `.cursor` back into `.codex` to avoid duplicate copies.

The repository root `.cursor` is a symlink to `agents/.cursor`, and `~/.codex/skills` is a symlink to `agents/.codex/skills`.
