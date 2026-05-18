# Codex Shared Assets

Portable Codex-facing agent assets live here. This directory is the shared
source of truth for custom Codex skills and compatibility links into Cursor
assets.

## Layout

- `skills/` - custom Codex skills plus bundled `.system/` skills.
- `commands/` - symlink to `../.cursor/commands` for Cursor command compatibility.
- `agents/` - symlink to `../.cursor/agents` for top-level Cursor agent prompts.
- `subagents/` - symlink to `../.cursor/subagents` for focused worker prompts.
- `rules/` - symlink to `../.cursor/rules` for Cursor project rules.

## Ownership

- Custom reusable skills live in `skills/<skill-name>/SKILL.md`.
- Bundled `.system/` skills are managed by Codex and should not be edited here.
- Cursor-native rules, commands, agents, and subagents stay in `../.cursor/`.
- Repo-specific assets remain in their original project when they mention a
  concrete repository, product flow, or environment that is not portable.

## Version Control Hygiene

- Track human-authored prompt assets, workflow instructions, and compatibility
  symlinks.
- Ignore local runtime state, IDE metadata, generated bundled skills, logs,
  cache folders, and session history.
- Keep secrets, tokens, mailbox data, browser state, and machine-specific paths
  out of this directory.

## Naming

- Use lowercase kebab-case for skill folders and `name` metadata.
- Keep folder names equal to `name` in `SKILL.md`.
- Prefer descriptive capability names such as `verify-ticket` or
  `srp-code-quality-audit`.
- Keep titles human-readable and purpose-driven.

## Local Links

The live home folders are linked to this shared tree:

```text
~/.codex/skills     -> agents/.codex/skills
~/.codex/rules      -> agents/.cursor/rules
~/.codex/commands   -> agents/.cursor/commands
~/.codex/agents     -> agents/.cursor/agents
~/.codex/subagents  -> agents/.cursor/subagents
```

Cursor also has matching links under `~/.cursor` so both tools discover the
same shared assets.
