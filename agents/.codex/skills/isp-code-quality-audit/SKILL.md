---
name: isp-code-quality-audit
description: Runs the Interface Segregation Principle audit loop with repo-local audit drivers and the ISP violations ledger for SOLID review work.
---

# ISP Code Quality Audit

## Purpose

Audit one TypeScript or React file at a time for Interface Segregation Principle
issues. Clients should not depend on methods or properties they do not use.
Prefer small role-specific contracts over broad "everything" interfaces.

## Driver Workflow

Run from the repository root:

```bash
python3 .cursor/scripts/audit/isp_interactive_audit_loop.py --next
```

The command prints one repo-relative `.ts` or `.tsx` path, excluding tests and
stories. If it prints nothing, the audit queue is complete.

For each path:

1. Read the selected file and nearby interfaces or implementations when needed.
2. Decide whether project-owned contracts force consumers to implement or depend
   on unused members.
3. Produce a one-line verdict JSON.
4. Persist through the driver:

```bash
echo 'VERDICT_JSON' | ISP_NO_TTY=1 python3 .cursor/scripts/audit/isp_interactive_audit_loop.py --merge-stdin "PATH"
```

Never edit `.cursor/todo/ISP_VIOLATIONS.json` by hand.

## Heuristics

Use `status: 1` for meaningful ISP issues:

- Empty, dummy, or "not implemented" methods exist only to satisfy a broad contract.
- A class or object implements a large interface while call sites use only a small role.
- A project-owned interface mixes unrelated responsibilities that should be split.

Do not flag third-party, DOM, React, Node, or framework types the team cannot
change. Use `status: 0` when the file only consumes external APIs or has no
project-owned contract surface.

## Verdict JSON

The driver adds `timestamp`.

```json
{ "status": 0, "fat_interface": "", "unused_methods": [], "split_suggestion": "" }
```

```json
{ "status": 1, "fat_interface": "TariffRepository", "unused_methods": ["delete", "archive"], "split_suggestion": "Split read and write roles into TariffReader and TariffWriter" }
```

## Reporting

Report the sampled path, interface name, unused members, and the smallest useful
split. Keep the verdict JSON valid and on one line when it will be piped into
the driver.
