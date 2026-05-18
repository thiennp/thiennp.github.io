# Pull Request Review Process

> **Modular review:** Prefer **`@.cursor/commands/command-workflow-pull-request-review.md`** (see **`.cursor/skills/README.md`**). This file remains supplementary detail.

⚠️ IMPORTANT: Always provide constructive feedback and be thorough in your review!
⚠️ After completing the review, you will AUTOMATICALLY generate and post a review comment to the PR.
⚠️ For well-implemented PRs, ALWAYS include a compliment to the author at the end of your review.

## Scope and non-goals (read first)

- **Rebase onto `release` before reviewing** so the diff matches what will merge. Steps are in §1.B.
- **Review only the changes** introduced on the branch relative to `origin/release` after that rebase (changed files and hunks). Do not audit the whole codebase.
- **Reasonable review only:** prioritize ticket alignment, regressions, security/sensitive data, incorrect API usage, and clear violations of project rules in **touched** code. Avoid nitpicks, style debates unrelated to rules, and requests to refactor unrelated pre-existing code unless it is a **critical** issue introduced or exposed by this PR.
- **Do not run CI or local verification commands** as part of this workflow: no `pnpm test`, `pnpm run typecheck`, `pnpm lint`, `pnpm run cursor:verify`, snapshot updates, or similar. Assume CI and the author cover those. You may still **mention** if the diff obviously omits tests when the ticket requires them, without executing test commands.

INSTRUCTIONS:
When you see this prompt with "do it" or ".", you should:

- [ ] For each box below, add ✅ (passing) or ❌ (failing) in response

---

## 0. Verification checklist (ticket + rules) — build this early, finish it last

**Purpose:** Do not forget acceptance criteria and applicable rules. Create and keep this list visible while reviewing; before posting the review, ensure every item has ✅ or ❌ (with brief note if ❌).

### A. From ticket(s)

After loading ticket(s) (see §1.B), copy into a numbered list:

- [ ] **Acceptance criteria** (verbatim or summarized from Jira)
- [ ] **Explicit QA / verification notes** from the ticket (environments, feature flags, edge cases)
- [ ] **Out of scope** called out on the ticket (confirm PR does not expand scope)

### B. From project rules (applicable subset only)

Derive from **changed files and features** (do not enumerate every rule in `.cursor/rules/` unless the PR touches those areas). Typical buckets — include only what applies:

- [ ] **Always-applied / generic** (e.g. `rules-bundle-core.mdc`, `rules-typescript-clean-code.mdc`, immutables/DTO policy if relevant)
- [ ] **API / data** if services or DTO consumers changed (`api-*`, `json-safety`, guards)
- [ ] **UI / components** if TSX changed (`component-patterns`, `react-standard`, styleguide usage)
- [ ] **State** if stores/hooks changed (`zustand-memo-optimization`, `state-representation-standards`)
- [ ] **Tests** if test files changed (`testing-standards`) — review expectations only, do not run tests

Use **`.cursor/rules/rules-bundle-core.mdc`** to avoid missing a category that applies to this PR.

**Final gate:** Paste the completed checklist (ticket + rules) into the PR feedback (see §5) so reviewers and the author see what was verified.

---

## 1. Initial Setup Phase

### A. PR Overview

- [ ] Ask for PR URL, take PR number and title from that URL
- [ ] Run: `pnpm tsx .agents/scripts/bb/pr-changes.ts <pr-id>` and read the changes
- [ ] Take ticket number from the url, it will following this pattern `PRE-*`, one PR could contain more than 1 ticket
- [ ] Run `git fetch origin`
- [ ] Recap PR description and purpose
- [ ] Note linked tickets and dependencies

### B. Branch sync — rebase onto `release` (mandatory before diff-based review)

Perform these steps so all diffs and file lists are against an up-to-date **`release`** base:

- [ ] `git fetch origin release` (and `git fetch origin` if not already done)
- [ ] Check out the PR branch (the branch that will be reviewed), e.g. `git checkout <branch-name>`
- [ ] `git rebase origin/release`
  - If conflicts: resolve, `git rebase --continue`, until complete
  - If rebase is not possible in the environment, **state that explicitly** in the review and fall back to describing the risk; still use `origin/release...HEAD` for diffs **after** any successful local rebase
- [ ] Confirm review base: all `git diff` / `git diff --name-only` commands use **`origin/release...HEAD`** (three-dot), matching “what this branch adds on top of current `release`”

### C. Ticket alignment

- [ ] Run: `pnpm tsx .agents/scripts/read-ticket.ts ${ticketNumber}` (for each ticket)
- [ ] Review related ticket requirements and acceptance criteria
- [ ] Fill §0.A verification items from the ticket(s)
- [ ] Compare PR implementation with ticket requirements
- [ ] Note any discrepancies between implementation and requirements

---

## 2. Code Review Phase

### A. Changes overview (after rebase onto `release`)

- [ ] Run: `git diff --name-only origin/release...HEAD` and `git diff --stat origin/release...HEAD`
- [ ] Identify scope of changes
- [ ] Look for unexpected file changes (noise, accidental commits)
- [ ] Note test file additions/modifications **by inspection** (do not run tests)
- [ ] Count files changed and lines added/removed (approximate from `--stat` is fine)
- [ ] Check whether changes match the ticket’s requirement and §0 checklist

### B. Detailed code review (diff only, reasonable scope)

- [ ] Review **ONLY** files and hunks changed vs `origin/release...HEAD`
- [ ] Focus on clarity, maintainability, correctness for **new or modified** behavior
- [ ] Check type safety and error handling **in changed code**
- [ ] Verify consistency with surrounding patterns **where touched**
- [ ] Flag likely performance issues **when introduced by this PR**
- [ ] Assess whether tests **in the diff** plausibly cover the change (no test execution)

### C. Rule compliance (changed code only, applicable rules)

- [ ] Consider **only** `.cursor/rules/` that apply to files/areas this PR changes (see §0.B and **`rules-bundle-core.mdc`** / rule bundles). Do not require ✅/❌ for every rule filename in the repo.
- [ ] For each **applicable** rule area, add ✅ or ❌ in the report
- [ ] Document specific violations with `file:line` references
- [ ] Optional inline examples in the **review comment** (not necessarily editing local files):

  ```typescript
  // ❌ typescript-standards: Not using readonly for interface properties
  interface UserData {
    id: number; // Should be: readonly id: number;
    name: string; // Should be: readonly name: string;
  }
  ```

- [ ] Include reference to applicable rule in each finding
- [ ] Provide clear recommendation when asking for a change
- [ ] Complete §0.B checklist items with ✅/❌

---

## 3. What this workflow does NOT include (CI / local scripts)

**Do not run** as part of this PR review prompt:

- `pnpm run typecheck`, `pnpm test`, `pnpm lint`, `pnpm run cursor:verify`, snapshot refresh, or other CI-equivalent commands

**You may still:**

- Note missing or weak tests **from reading** changed test files
- Refer to §0 ticket verification if QA steps are specified there

---

## 4. Security and performance (proportionate)

### A. Security review

- [ ] Check **changed code** for obvious security issues (injection, unsafe HTML, secrets, authz)
- [ ] Verify input validation **where this PR adds or alters** inputs
- [ ] Flag data exposure risks **introduced** by the diff

### B. Performance review

- [ ] Look for obvious N+1 or redundant calls **in new code paths**
- [ ] Check for unnecessary re-renders or heavy work **introduced** in changed components
- [ ] Review state usage **where modified**

Keep this proportional: **reasonable** findings only, tied to the diff.

---

## 5. Feedback compilation

### A. Categorize feedback

- [ ] Critical issues (must fix)
- [ ] Suggestions for improvement
- [ ] Code style / best practices (only when tied to project rules or real maintainability)
- [ ] Documentation improvements (if docs are in scope)
- [ ] Test coverage observations (read-only; no command output)
- [ ] Rule violations (specific references to `.cursor/rules/`)

### B. Feedback format

## PR Review Feedback

### Verification checklist (ticket + rules)

- **Ticket:** [paste completed §0.A with ✅/❌]
- **Rules (applicable):** [paste completed §0.B with ✅/❌]

### Critical Issues

- [file:line] Issue description and suggested fix

### Rule Violations

- ❌ [rule-name] [file:line] Violation description and recommended fix

Example inline comment format:

```typescript
// ❌ typescript-standards: Missing readonly modifier
interface UserData {
  id: number; // Should be: readonly id: number;
  name: string; // Should be: readonly name: string;
}
```

### Improvements Suggested

- [file:line] Suggestion description and reasoning

### Best Practices

- [file:line] Practice description and example

### Documentation

- [file:line] Documentation improvement suggestion

### Testing (observations only)

- [file:line] Test gap or improvement suggestion (no CI runs)

### Rule Compliance Summary (applicable rules only)

- ✅ rules-typescript-clean-code (example)
- ❌ typeguard-patterns - Missing proper type guards in [file:line]

## Recommendation

[Include recommendation for approval or changes]

## Compliments

[For well-implemented PRs, include specific compliments to the author about their work quality]

### C. Inline comments in repo (optional)

- [ ] If the workflow includes adding comments in code, use: `// ❌ [rule-name]: [specific violation] - [fix recommendation]`
- [ ] Ensure inline comments are reflected in the summary when used
- [ ] Prefer Bitbucket review comments via script (§6) for team visibility

---

## 6. AI Review Comment Submission (AUTOMATIC)

### A. Prepare AI Review

- [ ] Create a review file with "[AI Review - ${EMAIL}]:" prefix (or another reviewer-visible identifier your team agreed on)
- [ ] Format review with clear headings (Issues, Suggestions, etc.)
- [ ] **Include the §0 verification checklist** (ticket + rules) at the top or in a dedicated section
- [ ] Include specific code references where applicable
- [ ] Make actionable recommendations
- [ ] Include rule compliance summary for **applicable** rules with checkmarks and X marks
- [ ] For well-implemented PRs, add a "Compliments" section at the end with specific praise for the implementation
      quality
- [ ] Be specific in your compliments - mention good patterns, type safety, test coverage, etc. instead of generic
      praise

### B. Submit Using Script (ALWAYS DO THIS AUTOMATICALLY)

- [ ] Automatically generate a properly formatted review based on your analysis
- [ ] Save the review to a temporary file
- [ ] Run `pnpm tsx .agents/scripts/bb/add-pr-review.ts <pr-id> --file <review-file>` to post the comment
- [ ] Verify comment was posted successfully
- [ ] Inform the user that the review has been successfully posted to the PR

### C. Troubleshooting Authentication Issues

- [ ] If receiving 401 unauthorized errors, verify **`EMAIL`** and **`BB_API_TOKEN`** in **`.agents/cli/.env`** or repo root **`.env`** (**`loadCursorCliEnvSync`** / **`pnpm tsx .agents/scripts/bb/add-pr-review.ts`**).
- [ ] Ensure **`BB_API_TOKEN`** has PR commenting scopes (see Atlassian token settings)
- [ ] Check if token has expired and needs to be regenerated
- [ ] Try alternative methods like direct API calls or the web interface if scripts fail
- [ ] Document any persistent issues for the development team

---

## Review Focus Areas

### Code Quality

- Clean, readable, and maintainable code in **changed** areas
- Proper naming conventions
- Function/component size and complexity **where modified**
- Proper error handling in **new paths**
- Type safety in **touched** code

### Architecture

- Component structure **as affected by the PR**
- Data flow **for changed paths**
- State management **where modified**
- API integration **where modified**
- Separation of concerns **in new code**

### Performance

- Render optimization **when this PR changes rendering**
- Memoization **when added or removed**
- Bundle/API impact **when evident from the diff**

### Rule Compliance

- Only **applicable** rules — see §0.B and `.cursor/rules/rules-bundle-core.mdc`

---

## Review Comment Examples

```
### Verification checklist (ticket + rules)

- Ticket AC1 — … ✅
- Ticket AC2 — … ❌ (missing handling for …)
- rules-typescript-clean-code / touched components — ✅

### Critical Issues

- ❌ [AI Review] [Critical!] [app/features/Component/Component.tsx:42] Missing type guard for API response. Add proper validation using `isResponseDTO` type guard.

### Rule Violations

- ❌ [AI Review] [Critical!] [typeguard-patterns] [app/features/Component/types/ResponseDTO.ts:12] Not using isType utility for complex object validation
- ❌ [AI Review] [Critical!] [functional-principles] [app/features/Component/hooks/useEffect.ts:23] Including unstable references in useEffect dependencies

### Improvements Suggested

- ⚠️ [AI Review] [Improvement] [app/features/Component/Component.tsx:78] Consider extracting this logic into a custom hook for better reusability and testing.

### Best Practices

- ⚠️ [AI Review] [Improvement] [app/features/Component/Component.tsx:95] Prefer aligning with existing event-handler patterns in this feature (avoid unnecessary memoization unless required by memo children).

### Rule Compliance Summary (applicable)

- ✅ api-error-handling-patterns
- ✅ component-patterns
- ✅ folder-organization
- ❌ typeguard-patterns - Missing proper type guards
- ❌ typescript-standards - Not using readonly for interface properties
- ❌ functional-principles - Including unstable references in dependencies

## Recommendation

Based on the findings, this PR requires changes before it can be approved. Please address the type guard implementation issues and fix the dependency arrays in the useEffect hooks.

## Compliments

Despite the issues noted above, your implementation shows strong attention to component organization and the PR is well-focused on solving the specific problem at hand. The commit history is clean and the changes are minimal, which makes the PR easy to review.
```
