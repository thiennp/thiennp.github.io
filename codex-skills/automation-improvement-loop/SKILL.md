---
name: automation-improvement-loop
description: >-
  Use when the user asks to improve, revise, harden, or update a Codex
  automation. Run the required multi-agent critique loop: current automation to
  Claude for a full revised version, that revision to Cursor in read-only/plan
  mode for criticism and an updated proposal, back to Claude for another
  critique/revision pass, then to Cursor for a final critique before Codex
  applies, saves, and syncs the result.
---

# Automation Improvement Loop

## Scope

Use this when the user asks to improve or update a Codex automation, including:

- changing an automation prompt or workflow
- tightening blocker handling or review rules
- changing sync behavior for exported automations
- refactoring a recurring automation to use Claude/Cursor differently

This skill is for automation changes, not ordinary code changes elsewhere in a repo.

## Workflow

1. Resolve the target automation first.
   Prefer `/Users/thiennguyen/.codex/automations/<automation-id>/automation.toml` when the automation id is known.
   If the user only gives a name, search `~/.codex/automations` and verify the matching automation before editing.

2. Load the current automation definition and the requested change.
   Include the full current `automation.toml` text in the first review handoff, not a summary.
   If the automation has a memory file with recent blocker history that affects the requested change, include the relevant excerpt.

3. Run the mandatory Claude first pass.
   Use a verified Claude path available in the current environment.
   Ask Claude to return:
   - a full updated automation text, not partial notes
   - explicit critique of the old automation
   - assumptions, edge cases, and blocker handling changes
   If no verified Claude path is available, stop and report a blocker instead of skipping Claude.

4. Run the mandatory Cursor critique pass in read-only mode.
   Send Claude's full revised automation text to Cursor with `cursor agent --print --mode plan --trust --force --workspace <relevant-workspace>`.
   Ask Cursor to:
   - criticize the Claude revision
   - identify ambiguity, regressions, unsafe assumptions, and missing validation
   - return an updated proposed automation text
   Cursor must stay read-only or plan-only and must not edit files directly.

5. Run the mandatory Claude second pass.
   Send Cursor's critique and updated proposal back to Claude.
   Ask Claude to criticize Cursor's revision and return a new full updated automation text.

6. Run the mandatory Cursor final critique.
   Send the second Claude revision to Cursor in read-only/plan mode.
   Ask for final concrete criticism only.
   Codex owns the last integration step and file edits.

7. Apply the final version in Codex.
   Use the latest Claude revision plus any valid final Cursor criticism to produce the saved automation text.
   Keep role boundaries intact: Claude and Cursor review and propose; Codex edits and saves.

8. Save and sync.
   Update the local automation under `~/.codex/automations/<automation-id>/automation.toml`.
   If a repo export exists under `codex-automations/<automation-id>/automation.toml`, update that copy too.
   If the repository has `codex-automations/README.md` or `codex-automations/index.md` and the automation list, title, or status changed, update those files as well.

## Required Guardrails

- Do not silently skip Claude or Cursor.
- If Claude is unavailable, stop as blocked.
- If Cursor is unavailable, stop as blocked unless the user explicitly waives the Cursor stages.
- Preserve the user's exact non-negotiable rules unless the user explicitly asks to remove them.
- When agent feedback conflicts, prefer the stricter version unless it is clearly wrong or violates the user's request.
- Keep the final automation text complete and directly runnable; avoid leaving the file in a partial or note-like state.

## Output

Report:

- which automation was updated
- whether Claude pass 1, Cursor pass 1, Claude pass 2, and Cursor final critique all ran
- any blockers or waived stages
- which local and synced files were changed
