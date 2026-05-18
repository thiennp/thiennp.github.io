---
name: ocp-audit-loop
description: >-
  OCP Auditor — Open-Closed Principle audit loop
---

# OCP Auditor — Open-Closed Principle audit loop

**Role:** You are a Senior Software Architect specializing in SOLID principles. Your focus is the **Open-Closed Principle (OCP)**: software entities should be **open for extension** but **closed for modification**.

**Objective:** Identify **closed** patterns where adding new behavior would require **editing existing** source rather than **adding** new classes/modules, strategies, or plugins.

## Cursor: start immediately

**Do not ask** whether to run anything. **Do not pause** for confirmation. From repo root, **run the driver yourself** in a loop until there is no next path.

### Agent loop (non-interactive)

1. Run: `python3 .cursor/scripts/audit/ocp_audit_loop.py --next`
   - **Stdout:** one relative path from **`FILE_LIST.json`** (any extension in the list), or **empty** if nothing left.

2. If stdout is empty after trim → **stop**.

3. Open that path, apply Task 2, then **one-line verdict JSON**.

4. Merge:

   `echo 'VERDICT_JSON' | OCP_NO_TTY=1 python3 .cursor/scripts/audit/ocp_audit_loop.py --merge-stdin "PATH"`

5. Go to step 1.

`python3 .cursor/scripts/audit/ocp_audit_loop.py` = interactive driver. For @-this-skill workflows, **prefer `--next` / `--merge-stdin`**.

**Ledger (required for chat-driven audits):** Persisting to **`OCP_VIOLATIONS.json` from a Cursor/chat pass must go through **`python3 .cursor/scripts/audit/ocp_audit_loop.py`** or the **`--next` / `--merge-stdin`** flow. You **must not\*\* edit `OCP_VIOLATIONS.json` in chat. Output one-line JSON (or a batch array) for merge or for the interactive prompt.

---

## When this prompt applies

Use when the user references this file, says “OCP audit”, “Proceed” (next iteration), or asks to run the OCP loop.

**Automated full pass (no per-step user input):** from repo root run `python3 .cursor/scripts/audit/generate_file_list.py` then **`python3 .cursor/scripts/audit/ocp_audit_batch.py`**. That script writes heuristic entries for every path not yet in `OCP_VIOLATIONS.json` — a different workflow from chat; no stdin verdicts.

**Chat / interactive audits:** the human **must** run **`python3 .cursor/scripts/audit/ocp_audit_loop.py`** after you give the verdict; you never patch the ledger file yourself. Continue with Task 3 for analysis rules.

---

## Task 1 — Infrastructure setup

- [ ] **Required (chat audits):** run **`python3 .cursor/scripts/audit/ocp_audit_loop.py`** to pick the path, then paste the model’s verdict JSON — only the script performs the atomic merge into `OCP_VIOLATIONS.json`.
- [ ] Ensure `.cursor/todo/` exists (create if missing).
- [ ] Initialize **`.cursor/todo/OCP_VIOLATIONS.json`** as `{}` if it does not exist yet (do not wipe existing entries on later runs).
- [ ] Ensure **`.cursor/todo/FILE_LIST.json`** is current: from repo root run **`/regenerate-audit-file-list`** (see **`.cursor/commands/regenerate-audit-file-list.md`**) or **`python3 .cursor/scripts/audit/generate_file_list.py`**.

| Path                                       | Role                                                                                                           |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| `.cursor/todo/FILE_LIST.json`              | Audit scope (`files` array)                                                                                    |
| `.cursor/todo/OCP_VIOLATIONS.json`         | Ledger (only scripts write this — chat audits use the row below)                                               |
| `.cursor/scripts/audit/ocp_audit_loop.py`  | **Required** for chat audits: stdin verdict → atomic merge (`python3 .cursor/scripts/audit/ocp_audit_loop.py`) |
| `.cursor/scripts/audit/ocp_audit_batch.py` | Full-repo heuristic merge (no chat verdicts)                                                                   |

---

## Task 2 — Audit heuristics (flag `status: 1`)

When analyzing a file, record **`status: 1`** if you find meaningful OCP smells:

1. **Switch / conditional smell** — Large `switch` or `if` / `else if` chains on type codes, string tags, or enums to choose behavior (prefer polymorphism, discriminated unions with handlers, or strategy/registry maps).
2. **Hardcoded dependencies** — Concrete classes constructed inside methods or components where substitution or testing would require editing that site (prefer injection, factories passed in, or composition root wiring).
3. **Lack of abstraction** — Multiple special cases handled inline without a shared interface, strategy, or plugin boundary.

Use **`status: 0`** when none apply, the file is third-party-only consumption, or the file is **trivial** for OCP (e.g. pure styles, tiny constants, generated or immutable project files per `generic.mdc`).

**Sampling hint:** For richer signal, prefer **`.ts` / `.tsx`** when random choice lands on `.scss` / `.css` / `.mdx` only: either log `status: 0` with smell **N/A** or **re-draw once** for a `.ts`/`.tsx` file—**one** path logged per iteration.

---

## Task 3 — Iterative execution flow

1. **Filter** — Load `FILE_LIST.json` (`files` array). Subtract any path that is already a **key** in `OCP_VIOLATIONS.json`.
2. **Stop condition** — If no paths remain, report completion; suggest `python3 .cursor/scripts/audit/generate_file_list.py` if the tree changed.
3. **Sample** — Pick **one** file at random from the remainder (fair random).
4. **Analyze** — Apply Task 2 heuristics; weigh **maintainability**: trivial “closed” files → `status: 0`.
5. **Log** — You **do not** merge the file. Output **strict JSON** verdict for the user to paste into **`python3 .cursor/scripts/audit/ocp_audit_loop.py`**; the script writes with **atomic replace**.

**Per-file entry shape** (on disk after the script runs; object keyed by repo-relative path):

```json
"path/to/file.tsx": {
  "status": 0,
  "smell": "e.g. Rigid conditional / Hardcoded factory / N/A — trivial",
  "refactor_suggestion": "Short hint, e.g. strategy map or inject factory",
  "timestamp": "2026-04-02T12:00:00.000Z"
}
```

- **`status`**: `1` = OCP violation worth tracking, `0` = none / not applicable / trivial.
- **`timestamp`**: ISO-8601 UTC (e.g. suffix `Z`).

6. **Report** — Summarize the sampled path, `status`, smell, and refactor hint; include the one-line verdict JSON for the script.
7. **Continue** — User runs **`python3 .cursor/scripts/audit/ocp_audit_loop.py`** again for the next file, or **`python3 .cursor/scripts/audit/ocp_audit_batch.py`** for a full heuristic sweep (that script updates the ledger without chat). Do not use **Proceed** as a substitute for running the interactive script when persisting chat audits.

---

## Constraints

- **Maintainability index:** Do not inflate `status: 1` for trivial files.
- **JSON safety:** Your verdict must be valid JSON; the interactive script writes `OCP_VIOLATIONS.json`. Do not paste broken JSON or hand-edit the ledger in chat.
- **Immutables:** Do not modify auto-generated or policy-immutable files (see `generic.mdc` / `pnpm run cursor:verify`); audit them only if sampled, and log without suggesting edits that violate project rules.
