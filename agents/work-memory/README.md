# Cross-Project Work Memory

Single durable store for work history, lessons, and mistakes across **all** projects.

**Absolute root:** `/Users/thien.nguyen/thiennp.github.io/agents/work-memory/`

Cursor loads this via global assets:

- Rule: `agents/.cursor/rules/work-memory.mdc` (`alwaysApply: true`)
- Commands: `/work-memory-recall`, `/work-memory-log`, `/work-memory-finish-check`
- Skill: `agents/.codex/skills/work-memory/`

## Why this layout

| Goal | Choice |
|------|--------|
| Fast AI recall | Always start at `INDEX.md`, then topic `*/INDEX.md` |
| Low token cost | Short entries; frontmatter; no essay dumps |
| Searchable | Stable `id`, `tags`, `projects`, `type` in YAML |
| Mistake-first | `mistakes/` is checked before repeating past failures |
| Portable | Lives in `thiennp.github.io`; synced with the repo |

## Read order (mandatory for agents)

1. `INDEX.md`
2. `mistakes/INDEX.md` (always)
3. Matching `lessons/`, `decisions/`, `projects/<name>.md`, `tasks/` as needed
4. Open only the linked entry files — do not dump the whole tree into context

## Write order (after a big enough task)

1. Create/update one entry under the right folder
2. Update that folder’s `INDEX.md`
3. Update root `INDEX.md` (pinned / recent / by project / by tag)
4. Update `tags/INDEX.md` if new tags appear
5. Keep entries factual: Context → Outcome → Do → Don’t

## Folder map

```
work-memory/
  INDEX.md           # master catalog — read first
  SCHEMA.md          # entry format
  mistakes/          # failures & anti-patterns (highest priority)
  lessons/           # durable learnings (not necessarily failures)
  decisions/         # cross-project decisions & preferences
  projects/          # per-repo pointers & quirks
  tasks/             # notable completed/in-flight task summaries
  tags/              # tag → entry index
```

## What belongs here

- Recurring mistakes and how to avoid them
- Non-obvious environment/tooling gotchas
- Cross-project preferences and decisions
- Big-task outcomes worth remembering next time

## What does **not** belong here

- Secrets, tokens, passwords, private customer data
- Full chat transcripts or huge diffs
- Project rules that already live in that repo’s `.cursor/rules/`
- Transient TODO noise

## Related systems

- Daily Magic Knowledge Base API — product/docs grounding (separate)
- Per-repo RAG (e.g. EnergyCenter) — repo-local corpus (separate)
- This store — **your** cross-project agent memory and mistake log
