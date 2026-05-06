# Codex Config Snapshot

Portable Codex configuration mirrored from `~/.codex`.

Included:
- `config.toml`: model, plugin enablement, trusted project paths, and marketplace pointers.
- `rules/default.rules`: approved command prefix rules.

Excluded on purpose:
- auth material, browser sessions, shell snapshots, SQLite state, logs, cache files, generated bundled/system skills, and runtime temp files.

Restore manually by copying selected files back into `~/.codex`; do not blindly overwrite a newer machine's auth or runtime state.
