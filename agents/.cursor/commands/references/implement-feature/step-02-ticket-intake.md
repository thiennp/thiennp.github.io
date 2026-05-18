# Agent — Ticket intake & assignment

**Role:** Load ticket context, summarize requirements, and pause for human confirmation markers (`1.A done`).

## Ticket readiness (before heavy implementation)

- Acceptance criteria should be observable, finite, and ordered for incremental delivery.
- Dependencies, designs, or flags must resolve before branching large refactors.
- Escalate scope creep early—better a ticket split now than rework mid-QA.

Executable workflows: **`command-jira-verify-ticket.md`**, **`command-README.md`**.

## Verification

- [ ] Ticket URL received; id `PRE-*` extracted.
- [ ] `pnpm tsx .agents/scripts/assign-ticket.ts ${ticketNumber}` run (or `[?]` if script unavailable — document fallback).
- [ ] **Acceptance criteria** listed.
- [ ] **Comments / dependencies / related tickets** noted.
- [ ] **Hybrid RAG (implementation grounding):** After ticket text and acceptance criteria are in hand — **not** to learn how to fetch the ticket — run **`RAG query:`** built from **ticket description**, ids, and mentioned components/routes/paths; run **`pnpm --dir .agents/tools/rag run query`** per **`.cursor/commands/command-rag-query-hybrid-index.md`**; merge chunk hints into architecture-fit / planning (procedural steps like assign-ticket use this command’s script or **`command-*`** docs, not RAG).
- [ ] Explicit pause: user confirmed `1.A done` (or document pending confirmation).

## `[x]` output

If ticket unclear: **Recommendation** — questions to ask PM/engineering; propose smallest clarifying spike.

---
