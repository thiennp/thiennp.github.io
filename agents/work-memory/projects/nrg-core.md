---
id: project-nrg-core
type: project-note
projects: [nrg-core]
tags: [nrg, docker, php, frontend]
status: active
summary: CHECK24 energy platform rewrite; project rules override global when they conflict
---

# nrg-core

## Role

Main application monorepo (PHP API + React frontends). Project `.cursor/rules/` and `AGENTS.md` win over global preferences when they conflict.

## Standing notes

- Run tooling inside Docker Compose from repo root
- Prefer `pnpm` for frontend
- Do not invent tests unless asked (`no-unrequested-tests`)

## Related memory

- _(add mistake/lesson links here as they appear)_
