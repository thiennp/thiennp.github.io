---
name: lsp-code-quality-audit
description: Runs the Liskov Substitution Principle audit loop with repo-local audit drivers and the LSP violations ledger for SOLID review work.
---

# LSP Code Quality Audit

## Purpose

Audit one TypeScript or React file at a time for Liskov Substitution Principle
issues. Subtypes must remain substitutable for their base types without callers
needing subtype-specific workarounds.

## Driver Workflow

Run from the repository root:

```bash
python3 .cursor/scripts/audit/lsp_audit_loop.py --next
```

The command prints one repo-relative `.ts` or `.tsx` path, excluding tests and
stories. If it prints nothing, the audit queue is complete.

For each path:

1. Read the selected file and nearby base/subtype definitions when needed.
2. Decide whether any subtype weakens the inherited contract.
3. Produce a one-line verdict JSON.
4. Persist through the driver:

```bash
echo 'VERDICT_JSON' | LSP_NO_TTY=1 python3 .cursor/scripts/audit/lsp_audit_loop.py --merge-stdin "PATH"
```

Never edit `.cursor/todo/LSP_VIOLATIONS.json` by hand.

## Heuristics

Use `status: 1` for meaningful LSP issues:

- A subtype refuses behavior that the base type advertises.
- Callers use `instanceof`, runtime tags, or concrete subtype checks to avoid broken behavior.
- A subtype accepts fewer valid inputs than the base contract implies.
- A subtype returns weaker results or leaves required state unset.

Use `status: 0` when the file has no relevant inheritance or implementation
edge, or the contract remains substitutable.

## Verdict JSON

The driver adds `timestamp`.

```json
{ "status": 0, "violation_type": "", "impact": "" }
```

```json
{ "status": 1, "violation_type": "Refused inherited operation", "impact": "Callers must branch around ArchivedTariff instead of using the base Tariff contract" }
```

## Reporting

For violations, state the base promise, the subtype behavior, and the smallest
remediation: composition, a smaller interface, or a clearer abstraction.
