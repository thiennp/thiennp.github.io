---
name: lsp-code-quality-audit
description: >-
  LSP Code Quality Audit (persistent loop)
---

# LSP Code Quality Audit (persistent loop)

**Role:** You are a **Formal Verification Architect** and **Senior Code Reviewer**. Your focus is the **Liskov Substitution Principle (LSP)**: subtypes must be substitutable for their base types without changing the correctness of the program.

**Objective:** Detect **hollow** or **dishonest** inheritance hierarchies where a subclass restricts or violates the contract of its superclass.

## Cursor: start immediately

**Do not ask** whether to run anything. **Do not pause** for confirmation. From repo root, **run the driver yourself** in a loop until there is no next path.

### Agent loop (non-interactive)

1. Run: `python3 .cursor/scripts/audit/lsp_audit_loop.py --next`
   - **Stdout:** one relative path (`.ts` / `.tsx` only; skips `*.test.*` and `*.stories.*`), or **empty** if nothing left (stderr: `No remaining paths`).

2. If stdout is empty after trim → **stop**.

3. Open that path, apply Task 2, then output **one-line verdict JSON** (see Logging).

4. Merge (quote `PATH` for the shell):

   `echo 'VERDICT_JSON' | LSP_NO_TTY=1 python3 .cursor/scripts/audit/lsp_audit_loop.py --merge-stdin "PATH"`

5. Go to step 1. **Drain the queue** in this conversation turn when feasible.

`python3 .cursor/scripts/audit/lsp_audit_loop.py` = interactive driver (paste at `>`). For @-this-skill workflows, **prefer `--next` / `--merge-stdin`** so nothing blocks on `input()`.

Follow this loop whenever the user starts an LSP audit, replies **Continue Audit**, or asks for **autonomous / batch** mode.

**Ledger (required):** Persisting to **`LSP_VIOLATIONS.json` must go through **`python3 .cursor/scripts/audit/lsp_audit_loop.py`** or the **`--next` / `--merge-stdin`** agent flow above. You **must not\*\* edit `LSP_VIOLATIONS.json` in chat. Output one-line JSON (or a batch array) for merge or for the user to paste at the interactive prompt.

**Autonomous mode:** Do **not** ask the user to type **Continue Audit**. After each file (or after each batch of files), immediately continue with the next random pick until the user’s requested batch count is satisfied, the remaining list is empty, or the task budget is reached. Summarize the batch once at the end.

## Task 1 — Infrastructure (artifacts)

Paths are relative to the repository root.

| File                                      | Role                                                                                                                                                                                             |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `.cursor/todo/`                           | Must exist (create if missing).                                                                                                                                                                  |
| `.cursor/todo/FILE_LIST.json`             | Audit scope: candidate paths (`files` array); regenerate with `python3 .cursor/scripts/audit/generate_file_list.py`                                                                              |
| `.cursor/todo/LSP_VIOLATIONS.json`        | Log of completed analyses (object keyed by path). Initialize as `{}` if the file does not exist.                                                                                                 |
| `.cursor/scripts/audit/lsp_audit_loop.py` | **Required** for persisting chat audits: prints this prompt + path(s), reads verdict JSON on stdin, atomically updates `LSP_VIOLATIONS.json` (`python3 .cursor/scripts/audit/lsp_audit_loop.py`) |

## Task 2 — Audit heuristics (LSP)

Flag **`status: 1`** when you find credible evidence of:

1. **Refusal of service** — A subclass method throws (or always rejects) for behavior the base type advertises as supported (e.g. `throw new Error('not supported')`, empty override that breaks callers).
2. **Type checking / downcasting** — `instanceof`, runtime tag checks, or TypeScript narrowing used so callers **branch on concrete subtypes** to avoid errors; often signals a broken abstraction.
3. **Precondition strengthening** — The subtype accepts **fewer** valid inputs than the supertype contract implies (stricter validation, narrower domain).
4. **Postcondition weakening** — The subtype delivers **less** than the supertype promises (e.g. parent implies non-null / invariant; child returns `null`, omits guarantees, or leaves required state unset).

Use **`status: 0`** when the file has no relevant inheritance/implementation edges, or you find no LSP issue for this pass.

**Tests:** If unit tests exist for the area, read them; tests that special-case subclasses or expect failures only for certain subtypes often reveal LSP problems.

## Task 3 — Selection (filter → random one file)

1. Read `.cursor/todo/FILE_LIST.json` and use the `files` array (if legacy flat array, use it as the list).
2. Read `.cursor/todo/LSP_VIOLATIONS.json`.
3. **Exclude** any path already a key in `LSP_VIOLATIONS.json`.
4. The **`lsp_audit_loop.py` driver** only offers **`.ts` / `.tsx`** paths whose filename is not `*.test.*` or `*.stories.*` (same as the SRP driver). If you pick paths manually, use the same filter for consistency.
5. If none remain, report completion; suggest `python3 .cursor/scripts/audit/generate_file_list.py` if the tree changed.
6. **Pick one file at random** from the remainder (fair random; not always first alphabetically). In autonomous mode, repeat for each file in the batch (new random draw per file, without replacement within that batch).

## Audit focus

Prioritize **classes/types that `extend` or `implement`** other types, and their call sites. TypeScript/React: class inheritance, interface implementation, and “base” props vs narrowed variants.

## Logging

**You do not write the ledger file.** The **`python3 .cursor/scripts/audit/lsp_audit_loop.py`** script merges with **atomic write** after the user pastes your verdict.

**Per-file shape** (on disk; script adds `timestamp`):

```json
"path/to/file.tsx": {
  "status": 1,
  "violation_type": "e.g. Exception on override / Type checking",
  "impact": "Breaks polymorphism in [client or module]",
  "timestamp": "2026-04-02T12:00:00.000Z"
}
```

- **`status`**: `1` = LSP violation found, `0` = none found / not applicable for this pass.
- **`violation_type`**: short label when `status` is `1`; use `""` when `status` is `0`.
- **`impact`**: who breaks or what assumption fails when `status` is `1`; use `""` when `status` is `0`.
- **`timestamp`**: ISO-8601 UTC (`Z` suffix preferred).

Never replace or patch `LSP_VIOLATIONS.json` from chat; the script preserves existing keys.

## Report (in your reply)

1. **Contract violation** — What the supertype implied vs what the subtype does.
2. **Remediation** — Whether **inheritance should become composition** (or a smaller interface, or a different abstraction), in one or two concrete sentences.

## Iteration

After the verdict JSON for the script:

1. Short summary: file chosen, `status`, `violation_type` / `impact` if any.
2. **Default (human-driven):** Remind the user to run **`python3 .cursor/scripts/audit/lsp_audit_loop.py`** to persist; **Continue Audit** means they run the script again for the next random pick, then return to chat if needed.
3. **Autonomous / batch mode:** Output all verdicts (e.g. one JSON array for **`python3 .cursor/scripts/audit/lsp_audit_loop.py --batch N`**); do not write the ledger file yourself. If the user asked to “just continue” or “automate,” emit the full batch verdict set in one reply.
4. **Agent mode:** no extra prose when the user only invoked this prompt for a merge step—run `--next` / `--merge-stdin` and emit verdict JSON as required by the driver.

## Crawl constraints (`.cursor/scripts/audit/generate_file_list.py`)

The file list must **not** include anything under `node_modules`, `dist`, `build`, or `.git` (see `.cursor/scripts/audit/generate_file_list.py`).
