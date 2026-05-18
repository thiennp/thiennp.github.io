---
name: release-styleguide-react-19
description: Guides the CHECK24 EnergyCenter frontend styleguide React 19 Jenkins release job, including browser login and 2FA token handoff.
---

# Release Styleguide React 19

Use this workflow only for the CHECK24 EnergyCenter frontend styleguide React 19
Jenkins release job.

## Target

Open this Jenkins job:

```text
https://jenkins.energie.check24.de/job/enrg-frontend-styleguide/job/react-19/
```

## Workflow

1. Open the target URL in the browser automation available in the current Codex environment.
2. If Jenkins asks for normal credentials, let the user complete that step or ask for only the minimum missing credential needed. Never persist credentials.
3. When Jenkins asks for a 2FA, OTP, MFA, authenticator, or verification token, pause and ask the user for the current token in chat. Do not invent, reuse, store, or log a token.
4. Enter the token exactly as provided into the Jenkins 2FA field, submit the form, and wait for Jenkins to finish authentication.
5. Confirm the loaded page is the `enrg-frontend-styleguide/react-19` job before triggering anything.
6. Start the release job:
   - Prefer the visible Jenkins control for the job, such as `Build Now` or `Build with Parameters`.
   - If parameters are required, keep Jenkins defaults unless the user supplied explicit values; ask for any required missing value.
   - If Jenkins presents a confirmation page, verify it still refers to the React 19 styleguide job, then continue.
7. After triggering, open or capture the queued/running build page if Jenkins provides one.
8. Report the result with the build number or queue item, current Jenkins status, and the build URL.

## Safety

- Treat the 2FA token as a live secret. Do not echo it back in summaries, terminal output, logs, or saved files.
- Do not attempt to bypass MFA or automate around the user's approval.
- Stop and ask before triggering a different Jenkins job, changing non-default release parameters, retrying a failed release, or cancelling an existing build.
- If the page is already authenticated, skip directly to confirming the target job and triggering the release.
