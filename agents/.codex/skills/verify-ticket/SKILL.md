---
name: verify-ticket
description: Reviews Jira tickets for implementation readiness by checking acceptance criteria, missing details, dependencies, verification, and clarifications.
---

# Ticket Verification

## Purpose

Use this before implementation when a ticket might be ambiguous. The goal is to
turn the ticket into a clear, testable work package without changing it unless
the user explicitly approves an update.

## Workflow

1. Load ticket context:
   - Prefer repo-local tooling such as `pnpm tsx .cursor/scripts/read-ticket.ts <ticket>`.
   - If tooling is unavailable, use the pasted ticket text.
   - Capture ticket key, title, description, acceptance criteria, and comments that affect scope.

2. Assess readiness:
   - Acceptance criteria are clear and testable.
   - UI/UX references, API contracts, feature flags, and environment details are present when needed.
   - Dependencies and blockers are named.
   - Verification expectations are explicit.
   - Out-of-scope work is clear.

3. Identify gaps:
   - Mark each gap as `Needs clarification`, `Missing requirement`, or `Risk`.
   - Explain why the gap matters for implementation or QA.
   - Propose concise replacement wording or a question for the ticket owner.

4. Ask before updating:
   - Present proposed ticket changes first.
   - Wait for explicit approval before using any update script.
   - Never invent acceptance criteria as if they came from the ticket.

## Output

Use this compact format:

```markdown
## Ticket Readiness

Status: Ready / Needs clarification / Blocked

Acceptance criteria:
- ...

Gaps:
- [Needs clarification] ...

Suggested ticket updates:
- ...

Verification notes:
- ...
```
