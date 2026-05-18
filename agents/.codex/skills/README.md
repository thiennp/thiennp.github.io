# Codex Skills

Custom portable skills for Codex and Cursor live here. The source of truth is:

```text
agents/.codex/skills/
```

The live `~/.codex/skills` and `~/.cursor/skills` paths are symlinked to this
directory so new custom skills can be versioned and reused across machines.

## Scope

- Edit custom skills in this directory.
- Do not edit `.system/`; those skills are bundled and managed by Codex.
- Keep repo-specific workflows here only when they are intentionally portable.
- Remove empty runtime folders, IDE state, logs, credentials, and generated cache files.

## Naming and Metadata

- Folder name must match the `name` field in `SKILL.md`.
- Use lowercase kebab-case.
- The `description` must explain what the skill does and when to use it.
- Keep `SKILL.md` concise; move detailed optional material into a directly linked reference file.
- Optional UI metadata belongs in `agents/openai.yaml`.

## Current Custom Skills

| Skill | Purpose |
| --- | --- |
| `component-snapshot-tests-codemod` | Generate co-located React snapshot tests with repo codemods. |
| `comprehensive-commit` | Review broad changes before staging and committing. |
| `dip-code-quality-audit` | Audit Dependency Inversion Principle violations. |
| `energycenter-agent-prompt-pipelines` | Route EnergyCenter work to the correct Cursor workflow. |
| `energycenter-commit-prompts` | Choose the right EnergyCenter commit workflow. |
| `enrg-activity-list-staging-style` | Style, publish, and stage the ENRG ActivityList package. |
| `enrg-pr-rebase-test-update` | Rebase ENRG PR branches and refresh `test-update` output. |
| `enrg-release-branch-rebase` | Explicit-only local release rebase workflow that never pushes. |
| `extract-to-util` | Extract reusable logic into utilities, hooks, guards, or transformers. |
| `git-staging-and-split-commits` | Manage staging/release and split agent assets from app commits. |
| `isp-code-quality-audit` | Audit Interface Segregation Principle violations. |
| `local-rag-two-pass` | Run the EnergyCenter local RAG grounding workflow where available. |
| `lsp-code-quality-audit` | Audit Liskov Substitution Principle violations. |
| `ocp-code-quality-audit` | Audit Open-Closed Principle violations. |
| `quick-commit` | Prepare a small focused commit. |
| `release-styleguide-react-19` | Trigger the ENRG styleguide React 19 Jenkins release job. |
| `split-cursor-commit-rebase` | Split agent asset commits from application commits and rebase. |
| `srp-code-quality-audit` | Audit Single Responsibility Principle violations. |
| `unit-test-coverage` | Improve meaningful unit test coverage. |
| `verify-ticket` | Review Jira tickets for implementation readiness. |
