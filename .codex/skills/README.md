# Codex Skills

Portable Codex skills stored in this repository. These are intended for reuse and restoration across devices, with the source of truth kept under `.codex/skills/`.

## Skills

- `enrg-pr-rebase-test-update` - CHECK24 EnergyCenter workflow for rebasing a Bitbucket PR branch onto `release`, running frontend `npm run test-update`, amending regenerated changes, and pushing with `--force-with-lease`.
- `enrg-activity-list-staging-style` - CHECK24 Energy ActivityList workflow for Figma-driven style edits, Storybook visual confirmation, publishing `@check24/activity-list` pre-release packages, and updating `enrg-energymodule` staging.
- `enrg-release-branch-rebase` - explicit-only CHECK24 ENRG workflow for rebasing a Bitbucket PR branch through `release`, opening PhpStorm for review, and never pushing.
- `release-styleguide-react-19` - CHECK24 EnergyCenter workflow for triggering the frontend styleguide React 19 Jenkins release job.

## Shared ENRG/Cursor Skills

These shared skills were centralized from duplicate `.cursor/skills` folders in local `enrg-*` and `enrglib-*` repos. The matching project-local copies are symlinks back to this directory:

- `component-snapshot-tests-codemod`
- `comprehensive-commit`
- `dip-code-quality-audit`
- `energycenter-agent-prompt-pipelines`
- `energycenter-commit-prompts`
- `extract-to-util`
- `git-staging-and-split-commits`
- `isp-code-quality-audit`
- `local-rag-two-pass`
- `lsp-code-quality-audit`
- `ocp-audit-loop`
- `quick-commit`
- `split-cursor-commit-rebase`
- `srp-code-quality-audit`
- `unit-test-coverage`
- `verify-ticket`

## Local setup

Make Codex load skills directly from this repo:

```bash
if [ -e ~/.codex/skills ] && [ ! -L ~/.codex/skills ]; then
  mv ~/.codex/skills ~/.codex/skills.backup.$(date +%Y%m%d-%H%M%S)
fi
ln -sfn ~/thiennp.github.io/.codex/skills ~/.codex/skills
```

After that, any new skill created under `~/.codex/skills` is created in this repository folder and can be synced with git.

## Layout

Each skill is stored as:

```text
.codex/skills/<skill-name>/SKILL.md
```

Optional agent UI metadata is stored under:

```text
.codex/skills/<skill-name>/agents/
```
