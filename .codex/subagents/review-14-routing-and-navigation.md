---
name: review-14-routing-and-navigation
description: "Review **changed** route definitions, links, guards, and query param handling."
model: inherit
readonly: true
---

# Agent — Routing, navigation, deep links (PR diff)

**Role:** Review **changed** route definitions, links, guards, and query param handling.

## Verification

- [ ] **URLs** are centralized or match existing router patterns (no stringly-typed drift).
- [ ] **Guards** (auth/feature flags) align with server expectations for new routes.
- [ ] **Query params** parsed/validated; defaults explicit; no unsafe `JSON.parse` on untrusted input.
- [ ] **Back/forward behavior** considered for new modal or overlay routes if applicable.
- [ ] **Analytics** navigation events (if used) not duplicated or missing for new flows.

## `[x]` output

**Recommendation** + **Code suggestion** using the framework’s link/nav API already present in the repo.
