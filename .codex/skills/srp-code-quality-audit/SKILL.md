---
name: srp-code-quality-audit
description: >-
  SRP audit (Single Responsibility)
---

# SRP audit (Single Responsibility)

## Cursor: start immediately

**Do not ask** whether to run anything. **Do not pause** for confirmation. From repo root, **run the driver yourself** in a loop until there is no next path.

### Agent loop (non-interactive)

1. Run: `python3 .cursor/scripts/audit/srp_audit_loop.py --next`
   - **Stdout:** one relative path line (`.ts` / `.tsx` only; skips `*.test.*` and `*.stories.*`), or **empty** if nothing left (stderr: `No remaining paths`).

2. If stdout is empty after trim → **stop** (audit complete for the list).

3. Open that path, judge SRP, write a one-line **primary responsibility** for the file, then build one-line verdict JSON (see below).

4. Merge (replace `PATH` with the exact line from step 1; quote for shell):

   `echo 'VERDICT_JSON' | SRP_NO_TTY=1 python3 .cursor/scripts/audit/srp_audit_loop.py --merge-stdin "PATH"`

5. **Stderr** after a successful merge includes **`Responsibility: …`** (and the ledger stores it).

6. Go to step 1. **Drain the queue** in this conversation turn when feasible; if limits apply, continue in a follow-up **without asking**.

`python3 .cursor/scripts/audit/srp_audit_loop.py` = interactive driver (keyboard paste at `>`). For @-this-skill workflows, **prefer `--next` / `--merge-stdin`** so nothing blocks on `input()`.

## Rules

- Never edit `.cursor/todo/SRP_VIOLATIONS.json` by hand; only `--merge-stdin` or the interactive driver merges it.
- Regenerate `.cursor/todo/FILE_LIST.json` with `python3 .cursor/scripts/audit/generate_file_list.py` when the tree changes (full list; the SRP driver filters it).
- SRP driver considers only **`.ts` and `.tsx`**, and excludes paths whose filename contains **`.test.`** or **`.stories.`** (e.g. `Foo.test.tsx`, `Bar.stories.tsx`).
- SRP: one primary responsibility; flag god modules or mixed unrelated concerns. Respect immutables / generated files.

## Verdict JSON (script adds `timestamp`)

One line. **`responsibility`** is required: a **non-empty** one-line description of what that file is for (its primary role), even when `status` is `1` (then it can name the mixed concerns).

```json
{ "status": 0, "reason": "", "responsibility": "mobile layout for the price chip on small viewports" }
```

```json
{ "status": 1, "reason": "UI and fetch in one module", "responsibility": "tariff tile rendering plus tariff API calls" }
```

`status`: `0` ok, `1` violation. `reason`: non-empty **only** if `status` is `1`; else `""`. `path` optional (defaults to `EXPECTED_PATH` in `--merge-stdin`).

## Reply format

**Output nothing except** verdict JSON when the user only invoked this prompt—commands run in the tool; chat stays minimal. No prose summary, no repeating `reason` or `responsibility` outside that JSON line.

Interactive **batch** mode remains: `python3 .cursor/scripts/audit/srp_audit_loop.py --batch N` (array verdict, same order as printed paths); each object needs `"path"`, `"status"`, `"reason"`, and `"responsibility"`.

`FILE_LIST.json` omits `node_modules`, `dist`, `build`, `.git` (see `.cursor/scripts/audit/generate_file_list.py`). SRP further restricts to `.ts` / `.tsx` and drops `*.test.*` / `*.stories.*`.
