# Sentry Jira Cursor Triage Loop Memory

- 2026-06-19: After this automation creates a Jira ticket from a Sentry issue, it must open the newly created Jira issue and use the "Improve description" control when available. The action is non-blocking: click once, accept/apply the generated improvement if Jira presents a confirmation, log the exact warning reason if unavailable or failed, and continue the ticket creation flow.
