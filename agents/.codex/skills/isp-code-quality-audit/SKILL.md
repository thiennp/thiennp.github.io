---
name: isp-code-quality-audit
description: >-
  ISP Code Quality Audit (Interface Segregation Principle)
---

# ISP Code Quality Audit (Interface Segregation Principle)

**When to use:** Paste or @-reference this file, then say **run the audit** or **Continue Audit**. **Persisting results is not optional:** updates go through **`python3 .cursor/scripts/audit/isp_interactive_audit_loop.py`** or the agent flow below — you **must not** edit `ISP_VIOLATIONS.json` in chat. For unattended **heuristic-only** batch sampling (no chat verdicts), run **`python3 .cursor/scripts/audit/isp_audit_loop.py`** from the repo root (see `--help`); that script writes the ledger itself.

## Cursor: start immediately (chat / agent audits)

**Do not ask** whether to run anything. **Do not pause** for confirmation. From repo root, **run the driver yourself** in a loop until there is no next path.

### Agent loop (non-interactive)

1. Run: `python3 .cursor/scripts/audit/isp_interactive_audit_loop.py --next`
   - **Stdout:** one relative path (`.ts` / `.tsx` only; skips `*.test.*` and `*.stories.*`), or **empty** if nothing left.

2. If stdout is empty after trim → **stop**.

3. Open that path, apply Analysis heuristics, then **one-line verdict JSON**.

4. Merge:

   `echo 'VERDICT_JSON' | ISP_NO_TTY=1 python3 .cursor/scripts/audit/isp_interactive_audit_loop.py --merge-stdin "PATH"`

5. Go to step 1.

`python3 .cursor/scripts/audit/isp_interactive_audit_loop.py` = interactive driver. For @-this-skill workflows, **prefer `--next` / `--merge-stdin`**.

You are a **Senior Software Architect** focused on the **Interface Segregation Principle (ISP)**: clients must not be forced to depend on methods they do not use. Treat violations as **fat sets**: if a type implements \(N\) surface members but only \(M\) are used (\(M < N\)) for that consumer, the contract is not minimal—partition it.

## Artifacts (paths relative to repository root)

| File                                                  | Role                                                                                                                                                                                          |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.cursor/todo/FILE_LIST.json`                         | Candidate paths (`files` array); regenerate with `python3 .cursor/scripts/audit/generate_file_list.py`                                                                                        |
| `.cursor/todo/ISP_VIOLATIONS.json`                    | Log of completed analyses (object keyed by path); start as `{}`                                                                                                                               |
| `.cursor/scripts/audit/isp_interactive_audit_loop.py` | **Required** for chat-driven audits: prints this prompt + path(s), reads verdict JSON on stdin, atomically updates the ledger (`python3 .cursor/scripts/audit/isp_interactive_audit_loop.py`) |

## Scope constraints

- Focus on **internal domain** contracts (`interface`, `type` with call signatures, abstract classes, explicit `implements` in app and project-owned packages).
- **Do not** flag third-party or standard-library types the team cannot change (e.g. DOM, React component props from upstream, Node built-ins).
- **Interactive driver and `.cursor/scripts/audit/isp_audit_loop.py` (heuristic)** only sample **`.ts` / `.tsx`** paths whose filename is not `*.test.*` or `*.stories.*` (aligned with SRP). If you pick paths manually without the driver, use the same filter.

## Selection

1. Read `.cursor/todo/FILE_LIST.json` and use the `files` array.
2. Read `.cursor/todo/ISP_VIOLATIONS.json`.
3. **Exclude** any path that is already a key in `ISP_VIOLATIONS.json`.
4. If no paths remain, report completion and suggest re-running `python3 .cursor/scripts/audit/generate_file_list.py` if the tree changed.
5. **Pick one file at random** from the remaining list (fair random choice).

## Analysis heuristics (ISP)

Flag **`status: 1`** when evidence supports a fat interface for **project-owned** code:

1. **Empty / dummy implementations** — `implements` / structural match with a method that is empty, only `throw new Error('Not implemented')`, `unsupportedOperationException`-style, or a no-op solely to satisfy the type.
2. **Partial interface usage** — A class or object implements a large interface but call sites (for that concrete type) only use a small subset; the rest exists only for the shared type.
3. **“Everything” interface** — One interface mixes unrelated roles (e.g. unrelated domains in one contract).

If none apply or the file only consumes external APIs, use **`status: 0`**.

## Logging

**You do not write the ledger file.** The **`python3 .cursor/scripts/audit/isp_interactive_audit_loop.py`** script merges atomically after the user pastes your verdict.

**Per-file shape** (stored on disk; you output the fields below as one JSON line, or a batch array with `"path"` per item — script adds `timestamp`):

```json
"path/to/file.ts": {
  "status": 0,
  "fat_interface": "",
  "unused_methods": [],
  "split_suggestion": "",
  "timestamp": "2026-04-02T12:00:00.000Z"
}
```

- **`status`**: `1` = ISP violation found, `0` = none / not applicable this pass.
- **`fat_interface`**: name of the bloated interface or type (or `""` if `status` is `0`).
- **`unused_methods`**: member names that are dead weight for the consumer (or `[]`).
- **`split_suggestion`**: concrete split (e.g. “Extract `IReader` and `IWriter`”) or `""`.
- **`timestamp`**: ISO-8601 UTC (`Z` suffix preferred).

The user must run the script after each verdict; you never patch `ISP_VIOLATIONS.json` directly.

## Iteration

After giving the verdict line(s) for the script:

1. Summarize: file chosen, `status`, `fat_interface`, `unused_methods`, `split_suggestion` (when relevant).
2. Remind the user to run **`python3 .cursor/scripts/audit/isp_interactive_audit_loop.py`** if they have not yet. For **Continue Audit**, they run the script again for the next pick. For bulk **heuristic** passes without chat, they use **`python3 .cursor/scripts/audit/isp_audit_loop.py --count <n>`** (that path writes the ledger without stdin).
