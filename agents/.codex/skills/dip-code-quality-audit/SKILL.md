---
name: dip-code-quality-audit
description: Runs the Dependency Inversion Principle audit loop with repo-local audit drivers and the DIP violations ledger for SOLID review work.
---

# DIP Code Quality Audit

## Purpose

Audit one TypeScript or React file at a time for Dependency Inversion Principle
issues. High-level policy should depend on abstractions such as ports,
interfaces, or injected functions, not concrete low-level services, SDKs, or
adapters.

## Driver Workflow

Run from the repository root:

```bash
python3 .cursor/scripts/audit/dip_audit_loop.py --next
```

The command prints one repo-relative `.ts` or `.tsx` path, excluding tests and
stories. If it prints nothing, the audit queue is complete.

For each path:

1. Read the selected file and only the nearby context needed to judge dependencies.
2. Decide whether high-level code depends directly on low-level implementation details.
3. Produce a one-line verdict JSON.
4. Persist through the driver:

```bash
echo 'VERDICT_JSON' | DIP_NO_TTY=1 python3 .cursor/scripts/audit/dip_audit_loop.py --merge-stdin "PATH"
```

Never edit `.cursor/todo/DIP_VIOLATIONS.json` by hand.

## Heuristics

Use `status: 1` for meaningful DIP issues:

- High-level modules instantiate complex dependencies directly.
- Function or constructor signatures require concrete classes where an interface,
  port, callback, or adapter boundary would preserve policy independence.
- Business logic imports concrete infrastructure such as HTTP clients, SDKs,
  storage drivers, or framework-specific adapters.

Use `status: 0` for value objects, DTOs, entities, type-only modules, generated
files, and simple local composition that does not couple policy to infrastructure.

## Verdict JSON

The driver adds `timestamp`.

```json
{ "status": 0, "dependency_smell": "", "injection_fix": "" }
```

```json
{ "status": 1, "dependency_smell": "Checkout policy constructs ConcreteTariffClient directly", "injection_fix": "Inject a TariffClient port from the composition root" }
```

## Reporting

For `status: 1`, include one short remediation sentence. Show a code sketch only
when it clarifies the abstraction boundary.
