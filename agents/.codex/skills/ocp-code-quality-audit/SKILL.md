---
name: ocp-code-quality-audit
description: Runs the Open-Closed Principle audit loop with repo-local audit drivers and the OCP violations ledger for SOLID review work.
---

# OCP Code Quality Audit

## Purpose

Audit one file at a time for Open-Closed Principle issues. Adding new behavior
should usually mean adding a strategy, handler, adapter, or module rather than
editing a growing conditional in existing policy code.

## Driver Workflow

Run from the repository root:

```bash
python3 .cursor/scripts/audit/ocp_audit_loop.py --next
```

The command prints one repo-relative path from `.cursor/todo/FILE_LIST.json`. If
it prints nothing, the audit queue is complete.

For each path:

1. Read the selected file and only the context needed to judge extension points.
2. Decide whether adding a new case would require editing closed policy code.
3. Produce a one-line verdict JSON.
4. Persist through the driver:

```bash
echo 'VERDICT_JSON' | OCP_NO_TTY=1 python3 .cursor/scripts/audit/ocp_audit_loop.py --merge-stdin "PATH"
```

Never edit `.cursor/todo/OCP_VIOLATIONS.json` by hand.

## Heuristics

Use `status: 1` for meaningful OCP issues:

- Large `switch` or `if/else` chains dispatch behavior by type code, string tag, enum, or route.
- Hardcoded construction prevents adding a new implementation without editing policy code.
- Multiple special cases are handled inline where a registry, strategy map, or plugin boundary would fit.

Use `status: 0` for trivial files, generated files, pure styles, constants, or
third-party integration glue that does not need a local extension point.

## Verdict JSON

The driver adds `timestamp`.

```json
{ "status": 0, "smell": "N/A - single-purpose file", "refactor_suggestion": "" }
```

```json
{ "status": 1, "smell": "Rigid conditional dispatch by tariff type", "refactor_suggestion": "Move tariff-specific behavior behind a TariffTypeHandler registry" }
```

## Reporting

Report the sampled path, status, smell, and concrete extension boundary. Keep
the verdict JSON valid and on one line when it will be piped into the driver.
