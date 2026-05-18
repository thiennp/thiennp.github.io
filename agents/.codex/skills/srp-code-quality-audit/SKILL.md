---
name: srp-code-quality-audit
description: Runs the Single Responsibility Principle audit loop with repo-local audit drivers and the SRP violations ledger for SOLID review work.
---

# SRP Code Quality Audit

## Purpose

Audit one TypeScript or React file at a time for Single Responsibility Principle
violations. A file should have one primary reason to change. Flag files that mix
unrelated roles, such as rendering plus data fetching plus persistence.

## Driver Workflow

Run from the repository root:

```bash
python3 .cursor/scripts/audit/srp_audit_loop.py --next
```

The command prints one repo-relative `.ts` or `.tsx` path, excluding tests and
stories. If it prints nothing, the audit queue is complete.

For each path:

1. Read only the selected file and any immediately necessary local context.
2. Decide whether the file has one coherent responsibility.
3. Produce a one-line verdict JSON.
4. Persist through the driver:

```bash
echo 'VERDICT_JSON' | SRP_NO_TTY=1 python3 .cursor/scripts/audit/srp_audit_loop.py --merge-stdin "PATH"
```

Never edit `.cursor/todo/SRP_VIOLATIONS.json` by hand.

## Heuristics

Use `status: 1` for meaningful SRP issues:

- UI rendering mixed with API calls, persistence, routing, or unrelated business logic.
- A utility module that combines unrelated transformations.
- A component or hook responsible for multiple independent workflows.
- A file whose tests or callers reveal unrelated reasons to change.

Use `status: 0` when the file has one clear purpose, is type-only, is generated,
or is out of scope for SRP.

## Verdict JSON

The driver adds `timestamp`. Your JSON must include `responsibility`.

```json
{ "status": 0, "reason": "", "responsibility": "renders the tariff price chip" }
```

```json
{ "status": 1, "reason": "Mixes UI rendering with tariff API orchestration", "responsibility": "renders tariff results and coordinates loading" }
```

## Reporting

When the user only asked to run the loop, keep the chat minimal: path, verdict,
and any required remediation hint. In batch mode, return a JSON array in the
same shape.
