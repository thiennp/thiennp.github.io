---
name: jira-assign-ticket
description: Run assign-ticket script for a PRE ticket from repo root
---

# Assign Jira ticket (PRE)

From the repository root. Replace **`PRE-1234`** with your ticket.

## Command

```text
pnpm tsx .cursor/scripts/assign-ticket.ts PRE-1234
```

Credentials: root **`.env`** (**`JIRA_*`**, etc.). See **`.cursor/scripts/README.md`**.
