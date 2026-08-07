# Work Memory — Master Index

> **Agents: read this file first** before substantive work in any project.
> Absolute path: `/Users/thien.nguyen/thiennp.github.io/agents/work-memory/INDEX.md`

## Quick links

| Bucket | Path | When |
|--------|------|------|
| Mistakes | [mistakes/INDEX.md](mistakes/INDEX.md) | **Always** before implementing |
| Lessons | [lessons/INDEX.md](lessons/INDEX.md) | Related domain/tooling |
| Decisions | [decisions/INDEX.md](decisions/INDEX.md) | Preferences / cross-project choices |
| Projects | [projects/INDEX.md](projects/INDEX.md) | Repo-specific quirks |
| Tasks | [tasks/INDEX.md](tasks/INDEX.md) | Recent big work |
| Tags | [tags/INDEX.md](tags/INDEX.md) | Keyword lookup |
| Schema | [SCHEMA.md](SCHEMA.md) | How to write entries |

## Pinned mistakes (never skip)

| id | summary | tags | path |
|----|---------|------|------|
| wm-20260807-001 | GitHub SSH on custom port 42022 times out; use HTTPS or `ssh -p 22` | git, ssh, github | [mistakes/2026-08-07--github-clone-ssh-custom-port-timeout.md](mistakes/2026-08-07--github-clone-ssh-custom-port-timeout.md) |

## Recent entries (newest first)

| id | date | type | severity | summary | path |
|----|------|------|----------|---------|------|
| wm-20260807-002 | 2026-08-07 | decision | medium | Cross-project memory lives in `agents/work-memory`; consult before tasks; log after big tasks | [decisions/2026-08-07--cross-project-work-memory-home.md](decisions/2026-08-07--cross-project-work-memory-home.md) |
| wm-20260807-001 | 2026-08-07 | mistake | high | GitHub clone via default SSH (port 42022) timed out | [mistakes/2026-08-07--github-clone-ssh-custom-port-timeout.md](mistakes/2026-08-07--github-clone-ssh-custom-port-timeout.md) |

## By project

| project | notes |
|---------|-------|
| global | [projects/global.md](projects/global.md) |
| thiennp.github.io | [projects/thiennp.github.io.md](projects/thiennp.github.io.md) |
| nrg-core | [projects/nrg-core.md](projects/nrg-core.md) |

## How to search quickly

```bash
rg -n --type md -i "KEYWORD" /Users/thien.nguyen/thiennp.github.io/agents/work-memory
rg -n "^id:|^tags:|^summary:" /Users/thien.nguyen/thiennp.github.io/agents/work-memory
```
