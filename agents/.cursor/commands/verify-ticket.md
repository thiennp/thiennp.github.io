# Verify ticket

Compare implementation against Jira acceptance criteria and ticket metadata.

Follow: **`.cursor/docs/workflows/playbooks/quality/verify-ticket.md`**.

Jira CLI: **`npm --prefix .cursor/tools run pm:read-ticket -- POST-<n>`** when credentials are available.

**Frontend `test-update`:** if verification requires changing **`frontend/`** application code (**`.cursor/rules/task-verification.mdc`**), run **`npm run test-update`** from **`frontend/`** before completing the task.
