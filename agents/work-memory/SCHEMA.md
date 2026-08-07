# Work Memory Entry Schema

Every entry is one Markdown file with YAML frontmatter.

## Filename

```
YYYY-MM-DD--short-kebab-slug.md
```

Example: `2026-08-07--github-clone-ssh-custom-port-timeout.md`

## Frontmatter

```yaml
---
id: wm-YYYYMMDD-NNN          # unique, stable
date: YYYY-MM-DD
type: mistake | lesson | decision | task | project-note
severity: high | medium | low   # mistakes: how costly if repeated
projects: [nrg-core, thiennp.github.io, global]
tags: [git, ssh, docker]
status: active | superseded     # superseded → link replacement in body
summary: One-line AI-scannable fact
---
```

## Body (keep short)

```markdown
# Title

## Context
Where / when this mattered.

## What happened
Facts only.

## Do
- Concrete action to take next time

## Don't
- Concrete anti-pattern to avoid

## Related
- `[wm-…](../folder/file.md)` optional links
```

## Index rows

When adding an entry, append one line to:

1. That category’s `INDEX.md`
2. Root `INDEX.md` → Recent + By project + By tag as needed
3. `tags/INDEX.md` for each tag

Root index row format:

```markdown
| id | date | type | severity | summary | path |
```
