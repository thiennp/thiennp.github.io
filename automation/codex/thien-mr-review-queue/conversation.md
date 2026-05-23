# Thien MR Review Queue Conversation Handoff

Last synced: 2026-05-23

## Purpose

This folder mirrors the Codex heartbeat automation that runs Thien's MR, Linear, and Sentry queue and powers the local dashboard at `http://127.0.0.1:4177`.

## Current Durable Requirements

- Run every 5 minutes.
- Keep the dashboard live through LaunchAgent `com.thien.mr-dashboard`.
- Keep the dashboard, automation prompt, and Automation Workflow panel synchronized whenever behavior changes.
- Keep this GitHub Pages mirror synchronized after automation/dashboard/report changes.
- Optimize for low cloud-token cost by reusing persisted report/history, inspecting only changed/actionable items, and summarizing logs.
- Use only Cursor agents whose names/files start with `thien-`.
- The thien-agent allowlist does not apply to commands, skills, subagents, or rules.
- Do not invoke `becky-*`, `*-dana-*`, or any other non-`thien-*` agent from this automation.
- Human GitLab reviewers are not Cursor agents and may still be assigned by the normal MR workflow when needed.

## Dashboard Requirements

- Colorful light UI with `MRs`, `Linear`, and `Sentry` card columns.
- Status tabs/chips for `All`, `Needs review`, `Approve only`, `Approved`, `Skipped`, and `Finished`.
- Direct links open in new pages.
- MR number, title, author, source branch, and target branch are clickable.
- No iframe and no console/activity area.
- Poll `/api/status` every 5 seconds and refresh on focus/visibility.
- Serve dashboard and API with `Cache-Control: no-store`.
- Header shows active action from Cursor-reported `currentAction`, or `Waiting for next heartbeat round, in MM:SS`.
- Countdown must use the automation RRULE/anchor from `automation.toml`.
- Waiting header includes `Start now` to queue the heartbeat immediately.
- Active cards show `Working now` and elapsed time from persisted `startedAt`.
- Automation Workflow panel mirrors this behavior, sits in a sticky side rail on large screens, and is collapsed by default on small screens.
- Never remove seen/closed/merged/finished items; mark them `Finished` when they leave the active queue.

## MR Rules

- Check open `developers/fs-academy` MRs where `thien.nguyen` is assignee, requested reviewer, approver, or author.
- Keep approved/open and Thien-authored/open MRs visible.
- Do not review or approve draft MRs.
- Skip approved MRs and reviewed MRs with no later commits.
- For `[AI]` non-draft MRs, approve only if not already approved; do not run `/thien-mr-review`.
- For other actionable review MRs, run `/thien-mr-review <MR_URL>` one at a time.
- For Thien-authored MRs, verify rebase against target, fix broken pipelines, and merge if approved, rebased, unblocked, and mergeable.
- If git dirt or stale branch state blocks work, record the blocker, switch to `staging`, fetch, hard-reset to `origin/staging`, clean only generated/scratch untracked files, and retry. Do not reset while Cursor is active.

## MR Comments

- For developer comments on Thien's prior comments or Thien-authored code, determine whether code action is reasonable.
- Dashboard comment cards show the commenter, clickable GitLab discussion text/header, code-action or reply-only status, editable suggested reply, `Post suggested reply`, and `Fix code with Cursor`.
- Do not auto-post replies.
- Persist posted edited replies as tone memory for future suggestions.
- Persist Cursor comment-fix status with command, timestamps, summary, fixed commit SHA/link, and blockers.

## Linear Rules

- After MR pass, check Linear Aurora issues assigned to Thien.
- Persist complete assigned inventory before action.
- Bugs/regressions/Sentry/errors/broken behavior use `/thien-fix-bug <issue_url>`.
- Features/enhancements/implementation/migration/docs/product work use `/thien-implement-linear-feature <issue_url>`.
- Process one issue at a time.
- Skip done, In Review with open MR/no action, blocked, unassigned, or waiting-on-someone-else items, but keep outcomes visible.

## Sentry Rules

- After Linear, list open Sentry issues on dashboard, including unassigned and assigned-to-others.
- Inventory all pages if possible; at minimum the first page.
- Do not stop inventory for an individual blocked, duplicate, assigned-away, or unactionable issue.
- Only act when no MR is linked/created/found and the assignee is `Unassigned` or Thien Nguyen/TN/thien.nguyen.
- Actionable Sentry issues use `/thien-sentry-to-mr <sentry_issue_url>` one at a time.
- Skip MR-linked/already-handled/assigned-to-others with exact reason and next action.

## Current Action Reporting

Cursor agents/rules/skills used by this automation must update:

```text
/Users/study/.codex/automations/thien-mr-review-queue-report.json
```

before each meaningful phase change using:

```bash
npx tsx .cursor/scripts/update-automation-current-action.ts --source ... --phase ... --detail ... --item-url ... --item-title ... --status running|blocked|completed|skipped
```

All AI guidance/tooling changes under `.cursor/` must be made on branch `ai-improvement`, committed, and pushed.
