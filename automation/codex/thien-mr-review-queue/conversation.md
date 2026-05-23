# Thien MR Review Queue — Target System Workflow v2

Last synced: 2026-05-23

Schedule: every 5 minutes (heartbeat) via local Codex runner  
Mirror: `/Users/study/thiennp.github.io/automation/codex/thien-mr-review-queue` — run `sync-from-local.sh` on change

---

## 1. Core operating constraints and token efficiency

- **Role split:** Codex owns dashboard health, delta inventory, report persistence, classification, notifications, cheap GitLab/git shell ops, and **one** Cursor `thien-*` launch per heartbeat. Cursor owns all substantive MR review, fixes, Sentry triage, Linear work, and pipeline/comment follow-up via `.cursor/agents/thien-*.md` and skills.
- **Persistent delta engine:** Read `/Users/study/.codex/automations/thien-mr-review-queue-report.json` and `thien-mr-dashboard-history.json` first. Use `changed-since-baseline` and prior report rows; fetch only new/changed items. Prefer API modified-since or If-None-Match when available; full fetch only when delta signals are missing.
- **Concise output:** Summarize execution logs. Do not restate unchanged data or agent-internal steps.
- **One Cursor launch per heartbeat** (retry only after git-unblock). Never duplicate dashboard `/api/fix-comment` runs.
- **Isolation guard:** Never execute queue steps, `git reset`, or state overwrites if a `thien-*` agent is active (`startedAt`, `currentAction.status=running`, or `cursor-agent`/thien-* PIDs).

### Cursor guidance branch (ai-improvement vs staging)

At heartbeat start (and dashboard startup), run:

```bash
npx tsx .cursor/scripts/resolve-automation-cursor-baseline.ts --checkout --json
```

Read `/Users/study/.codex/automations/thien-mr-cursor-baseline.json` and persist `cursorGuidance` on the report.

| `active` | Checkout branch | Git unblock ref | `.cursor/` source |
|---|---|---|---|
| `true` | `ai-improvement` | `origin/ai-improvement` | branch working tree |
| `false` | `staging` | `origin/staging` | branch working tree |

When ai-improvement has unmerged `.cursor/` commits vs staging, automation checks out **`ai-improvement`**. After merge to staging, baseline flips to **`staging`** automatically.

---

## 2. Infrastructure and dashboard lifecycle

- **Live check:** Verify `http://127.0.0.1:4177` via curl. If down, load/recreate LaunchAgent `com.thien.mr-dashboard`.
- **LaunchAgent template** (`/Users/study/Library/LaunchAgents/com.thien.mr-dashboard.plist`):

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.thien.mr-dashboard</string>
    <key>ProgramArguments</key>
    <array>
        <string>/opt/homebrew/bin/node</string>
        <string>/Users/study/aurora/fs-academy/.cursor/.temp/thien-mr-dashboard/server.mjs</string>
    </array>
    <key>WorkingDirectory</key>
    <string>/Users/study/aurora/fs-academy</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PORT</key>
        <string>4177</string>
    </dict>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
</dict>
</plist>
```

- **Dashboard API:** Poll `/api/status` every 5s + visibility focus. `Cache-Control: no-store`. Header shows Cursor `currentAction` or Waiting countdown from `automation.toml` RRULE. **Start now** sets Codex DB `next_run_at` for `thien-mr-review-queue` to now.
- **Sync rule:** Keep `automation.toml`, dashboard `server.mjs` Automation Workflow panel, and this mirror aligned after behavior changes.

---

## 3. Strict execution sequence

```
[Live check & sync] → [Refresh inventory] → [GitLab MRs] → [Linear tickets] → [Sentry open issues]
```

### 3a. Refresh inventory

Persist to report JSON before action. Track MRs, Linear assigned to Thien, and open Sentry issues (all pages if possible, minimum first page). Compact fields per item: type, title, URL, state, assignee, changed-since-baseline, decision, reason, next action, command, blockers, related URLs, startedAt, output summary.

### 3b. GitLab MR queue (priority 1)

Scope: `thien.nguyen` as assignee, reviewer, approver, or author on `developers/fs-academy`.

| Case | Action |
|---|---|
| Draft | `skipped` — `Draft MR - waiting until ready for review` |
| Approved / reviewed, no new commits | Skip |
| `[AI]` non-draft | GitLab approve only if unsigned; no `/thien-mr-review` |
| Actionable review | One `/thien-mr-review <MR_URL>` |
| Thien-authored, behind | Codex: shell rebase/push |
| Thien-authored, pipeline red or review threads | `/thien-mr-fix-followup <MR_URL>` |
| Thien-authored, ready | `glab merge`; never merge drafts |

**MR comments:** Dashboard owns suggested replies and Fix code with Cursor. Codex inventories prompts only.

### 3c. Linear sync (priority 2)

Target: https://linear.app/fullscript/team/ACA/all — one issue at a time.

- Bugs/regressions/errors → `/thien-fix-bug <issue_url>`
- Features/enhancements/docs/product → `/thien-implement-linear-feature <issue_url>`
- Skip: done, In Review with open MR, blocked, unassigned, waiting on others

### 3d. Sentry triage (priority 3)

Codex list-only — no Sentry writes. When inventory shows ≥1 actionable row (no linked MR; assignee Unassigned or Thien/TN/thien.nguyen), launch **one queue drain** per heartbeat — not one issue per heartbeat:

```bash
cursor-agent --print --trust --force --workspace /Users/study/aurora/fs-academy "/thien-sentry-all"
```

Cursor runs `@.cursor/agents/thien-sentry-all.md` (MCP assign, Linear, fix, MR, review for all actionable unresolved issues). Reserve `/thien-sentry-single-issue <url>` for manual one-off runs only.

Deprecated: `/thien-sentry-to-mr`, `/thien-sentry-agent`. MCP/auth blocked → inventory + source-blocker (no browser triage).

---

## 4. Git conflict and workspace unblocking

If dirty worktree blocks queue work: verify no Cursor task running; record dirty paths; read `cursorGuidance.gitUnblockRef` and `cursorGuidance.guidanceBranch`.

**`active=true` (unmerged `.cursor/` on `ai-improvement` branch):**

```bash
git fetch origin
git switch ai-improvement
git reset --hard origin/ai-improvement
npx tsx .cursor/scripts/resolve-automation-cursor-baseline.ts --checkout
```

**`active=false` (`origin/staging` — `.cursor/` merged or no diff):**

```bash
git fetch origin
git switch staging
git reset --hard origin/staging
# clean generated/scratch untracked only
```

Rerun inventory from the matching baseline. User approved this reset.

---

## 5. UI layout and reporting contract

- Colorful light theme; columns **MRs | Linear | Sentry**; status tabs All/Needs review/Approve only/Approved/Skipped/Finished
- Sticky Automation Workflow panel (collapsed on small screens)
- Never delete historical items; mark **Finished** when gone from active queue
- **Agent allowlist:** `thien-*` only (not `becky-*`, `*-dana-*`)
- **Reporting hook:**

```bash
npx tsx .cursor/scripts/update-automation-current-action.ts \
  --source <src> --phase <phase> --detail <detail> \
  --item-url <url> --item-title <title> \
  --status running|blocked|completed|skipped
```

- `.cursor/` automation changes on branch `ai-improvement`, committed, pushed; AI-only MR titles use `[AI]`

---

## 6. Notification rules

- Write final MRs/Linear/Sentry totals to `thien-mr-review-queue-report.json`
- **NOTIFY:** processed/approved/merged/changed/blocked, source unchecked, comment prompt/fix waits for Thien
- **DONT_NOTIFY:** short quiet status when no operational state change
