# API Export Scripts

These scripts provide an API-based alternative to the Chrome/JXA exporters.

They do not replace the current automation path in [`automation.toml`](/Users/thiennguyen/docker-localdev2/workdir/guardz-eco/thiennp.github.io/codex-automations/hourly-bitbucket-dependency-pr-cleanup/automation.toml), which is still intentionally Chrome-only.

## Supported inputs

The scripts load credentials from `~/.env` when it exists, and also accept normal environment variables from the current shell.

Bitbucket auth:

- `BITBUCKET_TOKEN` for bearer-token auth
- `BITBUCKET_USERNAME` and `BITBUCKET_APP_PASSWORD` for basic auth
- `BITBUCKET_WORKSPACE` defaults to `check24`

Jira auth:

- `JIRA_TOKEN` for bearer-token auth
- `JIRA_EMAIL` and `JIRA_API_TOKEN`
- `ATLASSIAN_EMAIL` and `ATLASSIAN_API_TOKEN` are also accepted
- `JIRA_BASE_URL` defaults to `https://c24-energie.atlassian.net`

## Example `~/.env`

```bash
BITBUCKET_USERNAME=someone@example.com
BITBUCKET_APP_PASSWORD=app-password-here
BITBUCKET_WORKSPACE=check24

ATLASSIAN_EMAIL=someone@example.com
ATLASSIAN_API_TOKEN=jira-api-token-here
JIRA_BASE_URL=https://c24-energie.atlassian.net
```

## Usage

Export the Bitbucket reviewing queue assigned to the authenticated user:

```bash
./codex-automations/hourly-bitbucket-dependency-pr-cleanup/export-bitbucket-reviewing-queue-api.sh
```

Export Bitbucket per-PR details from the API queue file:

```bash
./codex-automations/hourly-bitbucket-dependency-pr-cleanup/export-bitbucket-pr-details-api.sh
```

Export one Jira issue:

```bash
./codex-automations/hourly-bitbucket-dependency-pr-cleanup/export-jira-issue-details-api.sh PRE-3810
```

Verify credentials and live API reachability:

```bash
./codex-automations/hourly-bitbucket-dependency-pr-cleanup/verify-atlassian-api-exports.sh
```

Run a fuller live verification:

```bash
JIRA_PROBE_ISSUE_KEY=PRE-3810 ./codex-automations/hourly-bitbucket-dependency-pr-cleanup/verify-atlassian-api-exports.sh full
```

## Limits

- Bitbucket API queue discovery is an approximation of the Bitbucket "reviewing" UI. It scans open PRs in the configured workspace repos and keeps PRs where the authenticated user is a reviewer or reviewer participant.
- Bitbucket API tokens and Jira API tokens are not always interchangeable. In practice, Bitbucket often needs a Bitbucket-specific app password or token with pull-request read scope.
- The API detail export cannot fully reproduce every UI-only field that the Chrome scrapers infer from rendered pages.
