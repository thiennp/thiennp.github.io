# Codex Skills

Portable Codex skills stored in this repository. These are intended for reuse and restoration across devices, with the source of truth kept under `codex-skills/`.

## Skills

- `enrg-pr-rebase-test-update` - CHECK24 EnergyCenter workflow for rebasing a Bitbucket PR branch onto `release`, running frontend `npm run test-update`, amending regenerated changes, and pushing with `--force-with-lease`.
- `enrg-release-branch-rebase` - explicit-only CHECK24 ENRG workflow for rebasing a Bitbucket PR branch through `release`, opening PhpStorm for review, and never pushing.

## Layout

Each skill is stored as:

```text
codex-skills/<skill-name>/SKILL.md
```

Optional agent UI metadata is stored under:

```text
codex-skills/<skill-name>/agents/
```
