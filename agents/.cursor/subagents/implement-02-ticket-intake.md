---
name: implement-02-ticket-intake
description: "Load ticket context, summarize requirements, and pause for human confirmation markers (`1.A done`)."
model: inherit
readonly: false
---

# Agent — Ticket intake & assignment

**Role:** Load ticket context, summarize requirements, and pause for human confirmation markers (`1.A done`).

## Verification

- [ ] Ticket URL received; id `PRE-*` extracted.
- [ ] `pnpm tsx .cursor/scripts/assign-ticket.ts ${ticketNumber}` run (or `[?]` if script unavailable — document fallback).
- [ ] **Acceptance criteria** listed.
- [ ] **Comments / dependencies / related tickets** noted.
- [ ] Explicit pause: user confirmed `1.A done` (or document pending confirmation).

## `[x]` output

If ticket unclear: **Recommendation** — questions to ask PM/engineering; propose smallest clarifying spike.
