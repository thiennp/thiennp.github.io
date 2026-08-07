# Shared Agent Configuration

Portable AI-agent assets live here so they can be synced across machines.

## Layout

- `.codex/` - Codex-native assets. Skills live here; commands and subagents are compatibility symlinks into `.cursor`.
- `.cursor/` - Cursor-native assets. Rules, commands, and subagents live here because Cursor reads `.cursor/...` paths. Agents and skills are symlinked from `.cursor` back into `.codex` to avoid duplicate copies.
- `work-memory/` - Cross-project history, lessons, and mistakes. Agents read `work-memory/INDEX.md` before substantive work and log durable learnings after big tasks. See `work-memory/README.md`.

The repository root `.cursor` is a symlink to `agents/.cursor`, and `~/.codex/skills` is a symlink to `agents/.codex/skills`. Global Cursor user paths (`~/.cursor/rules`, `~/.cursor/commands`, `~/.cursor/skills`) also point here.
