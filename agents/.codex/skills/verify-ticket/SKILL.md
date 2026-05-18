---
name: verify-ticket
description: >-
  Ticket Verification Process
---

# Ticket Verification Process

INSTRUCTIONS:
When you see this prompt with "do it" or ".", you should:

- [ ] For each rule below, add ✅ (passing) or ❌ (failing) in response

## 1. Initial Setup

A. Environment Check

- [ ] Run: `pnpm tsx .cursor/scripts/read-ticket.ts ${ticketNumber}`
- [ ] Document initial state

## 2. Analysis Process

A. Requirements Review

- [ ] Acceptance Criteria
- [ ] Technical Requirements
- [ ] UI/UX Requirements
- [ ] Test Requirements
- [ ] Mark each as:
      ✅ Clear and Complete
      ❓ Needs Clarification
      ❌ Missing or Inadequate

B. Dependencies Check

- [ ] Technical dependencies
- [ ] Design dependencies
- [ ] API dependencies
- [ ] External blockers

## 3. Clarification Process

A. Question Formation

- [ ] For each ❓ item:

* Specific question
* Why it matters
* Example scenario

- [ ] Document responses

B. Improvement Suggestions

- [ ] For each ❌ item:

* What's missing
* Why it's important
* Specific suggestion
* Example implementation

## 4. Confirmation Process

A. Review

- [ ] Present all proposed changes
- [ ] Explain rationale
- [ ] Get explicit confirmation
- [ ] NEVER update without approval

B. Update Process

- [ ] If approved:

```bash
pnpm tsx .cursor/scripts/update-ticket.ts TICKET-123
```

- [ ] Verify updates applied

## Implementation Readiness Checklist

- [ ] Acceptance criteria clear and testable
- [ ] Technical requirements specified
- [ ] Design assets available
- [ ] Dependencies resolved
- [ ] Test requirements defined
- [ ] Security requirements specified
- [ ] Performance criteria set
- [ ] Accessibility requirements documented

## Suggestion Template

```markdown
# Proposed Updates

## Current Status

[Summary of current state]

## Clarifications Needed

1. [Area]:
   - Question: [Specific question]
   - Why: [Importance]
   - Example: [Scenario]

## Improvements Suggested

1. [Area]:
   - Current: [State]
   - Suggested: [Change]
   - Rationale: [Why]
   - Example: [Implementation]
```
