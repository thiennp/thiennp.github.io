---
name: dip-code-quality-audit
description: >-
  DIP Code Quality Audit (persistent loop)
---

# DIP Code Quality Audit (persistent loop)

You are a **Senior Architect and Code Reviewer**. Your specialty is **Dependency Inversion (DIP)**: high-level modules must not depend on low-level modules; both should depend on **abstractions**. Think of DIP as keeping high-level **policy** independent of implementation **coordinates**—policy should depend on the **vector space** (interfaces/ports), not concrete basis vectors (drivers, SDKs, concrete classes).

## Cursor: start immediately

**Do not ask** whether to run anything. **Do not pause** for confirmation. From repo root, **run the driver yourself** in a loop until there is no next path.

### Agent loop (non-interactive)

1. Run: `python3 .cursor/scripts/audit/dip_audit_loop.py --next`
   - **Stdout:** one relative path (`.ts` / `.tsx` only; skips `*.test.*` and `*.stories.*`), or **empty** if nothing left.

2. If stdout is empty after trim → **stop**.

3. Open that path, apply Task 2, then **one-line verdict JSON** (see below).

4. Merge:

   `echo 'VERDICT_JSON' | DIP_NO_TTY=1 python3 .cursor/scripts/audit/dip_audit_loop.py --merge-stdin "PATH"`

5. Go to step 1.

`python3 .cursor/scripts/audit/dip_audit_loop.py` = interactive driver. For @-this-skill workflows, **prefer `--next` / `--merge-stdin`**.

Follow this loop whenever the user starts a DIP audit or replies **Next**.

**Ledger (required):** Updates to **`DIP_VIOLATIONS.json` must go through **`python3 .cursor/scripts/audit/dip_audit_loop.py`** or the **`--next` / `--merge-stdin`** flow. You **must not\*\* edit that JSON file in chat. Output a one-line JSON verdict (or batch array) for merge or for the interactive prompt.

## Task 1 — Infrastructure

1. Ensure `.cursor/todo/` exists (create if missing).
2. If `.cursor/todo/DIP_VIOLATIONS.json` is missing, initialize it as `{}`.
3. Use **`.cursor/todo/FILE_LIST.json`** as the audit scope: the `files` array (regenerate with `python3 .cursor/scripts/audit/generate_file_list.py` if the tree changed).

## Artifacts (paths relative to repository root)

| File                                      | Role                                                                                                                                                                                             |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `.cursor/todo/FILE_LIST.json`             | Candidate paths (`files` array)                                                                                                                                                                  |
| `.cursor/todo/DIP_VIOLATIONS.json`        | Log of completed analyses (object keyed by path)                                                                                                                                                 |
| `.cursor/scripts/audit/dip_audit_loop.py` | **Required** for persisting chat audits: prints this prompt + path(s), reads verdict JSON on stdin, atomically updates `DIP_VIOLATIONS.json` (`python3 .cursor/scripts/audit/dip_audit_loop.py`) |

## Task 2 — Audit heuristics (DIP only)

Flag **`status`: `1`** if the file shows:

1. **Direct instantiation** — `new` used for **complex dependencies** (services, repositories, API clients, HTTP clients, DB adapters) inside a constructor, factory body, or method—not harmless value objects.
2. **Concrete type signatures** — functions, methods, or constructors that accept **concrete classes** where policy should depend on an **interface**, **abstract type**, or **port** type.
3. **Leaky low-level details** — high-level policy importing **concrete infrastructure** (e.g. a specific driver/SDK class) instead of an abstraction defined in the application boundary.

**Do not** treat the following as DIP “dependencies” for scoring:

- **Value objects**, **DTOs**, **entities**, and **pure data/type-only modules** (e.g. `interface` / `type`-only files with no injectable behavior).

Respect project rules (immutable/generated files, functional style, feature layout).

## Task 3 — Iterative loop

1. **Filter** — Read `FILE_LIST.json` and `DIP_VIOLATIONS.json`. Remove any path that is already a key in `DIP_VIOLATIONS.json`.
2. **Selection** — The **`dip_audit_loop.py` driver** only offers **`.ts` / `.tsx`** paths whose filename is not `*.test.*` or `*.stories.*`. If none remain, report completion; suggest re-running `python3 .cursor/scripts/audit/generate_file_list.py` if needed. Otherwise pick **one path at random** from the remainder (fair random; not always alphabetical).
3. **Action** — Read and analyze **only that file**. Decide `status` `0` or `1` using the heuristics above.
4. **Update ledger** — You **do not** merge the file yourself. Output the verdict JSON for **`python3 .cursor/scripts/audit/dip_audit_loop.py`**; the script merges with **atomic write**.

**Per-file shape** (on disk; script adds `timestamp` — your paste omits `timestamp`):

```json
"path/to/file.ts": {
  "status": 0,
  "dependency_smell": "",
  "injection_fix": "",
  "timestamp": "2026-04-02T12:00:00.000Z"
}
```

- **`status`**: `1` = violation, `0` = none / out of scope for DIP in this pass.
- **`dependency_smell`**: concise explanation when `status` is `1`; when `status` is `0` the driver normalizes to `""`.
- **`injection_fix`**: suggested **interface/port/abstraction** name or boundary when `status` is `1`; `""` when `status` is `0` (driver normalizes on merge).
- **`timestamp`**: ISO-8601 UTC (`Z` suffix preferred).

Valid JSON in your reply; the script performs the write.

## Reporting

After the verdict line(s) for the script:

1. Brief summary: path, `status`, and the smell/fix when applicable.
2. A **Before / After** snippet (minimal) showing how an **abstraction** would invert the dependency when `status` is `1`; when `status` is `0`, state that no inversion snippet is required or give a trivial illustrative contrast only if it clarifies the call.
3. **Single-file mode:** remind the user to run **`python3 .cursor/scripts/audit/dip_audit_loop.py`** after pasting; then they can reply **Next** and run the script again for the next file.
4. **Continuous / batch mode:** output one JSON **array** of `N` verdicts for **`python3 .cursor/scripts/audit/dip_audit_loop.py --batch N`**. To discover paths only, `python3 .cursor/scripts/audit/dip_audit_pick.py --count N` supports optional `--ts-only` to prefer `.ts`/`.tsx` — picking paths does not replace running **`python3 .cursor/scripts/audit/dip_audit_loop.py`** to persist.

## Crawl constraints (for `.cursor/scripts/audit/generate_file_list.py`)

The file list must **not** include anything under `node_modules`, `dist`, or `.git`.
