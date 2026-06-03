---
name: automation-improvement-review-loop
description: Use whenever Thien asks Codex to improve, update, refactor, clarify, or redesign an automation. Runs a Claude/Cursor/Claude/Cursor critique loop before Codex saves and syncs the final automation.
---

# Automation Improvement Review Loop

## Trigger

Use this skill whenever the user asks to improve, update, refactor, clarify,
redesign, or otherwise change an existing Codex automation.

## Ownership

- Codex remains the orchestrator and final editor.
- Claude AI and Cursor Agent provide proposed updates and critiques only.
- Do not let Claude AI or Cursor Agent write automation files directly unless
  Thien explicitly asks for a separate manual tool session.
- Codex applies the final patch, validates it, saves it, and syncs it.

## Required Loop

1. Read the current automation:
   - Locate the target `automation.toml`.
   - Read the current prompt and any related memory needed to understand recent
     blockers or rules.
   - Capture the user's new requirement exactly.

2. Ask Claude AI for an updated automation:
   - Provide the current automation content.
   - Provide the user's requirement.
   - Explicitly ask Claude AI to return an updated automation proposal, not only
     advice.
   - Ask Claude AI to preserve existing critical requirements unless they
     conflict with the new requirement.

3. Send Claude's updated automation to Cursor Agent for critique and update:
   - Ask Cursor Agent to criticize the proposed automation for ambiguity,
     missing gates, unsafe ownership, conflicting instructions, and practical
     execution issues.
   - Ask Cursor Agent to return an improved automation proposal.

4. Send Cursor's proposal back to Claude AI for critique and update:
   - Ask Claude AI to criticize Cursor's proposal.
   - Ask Claude AI to return another improved automation proposal.

5. Send Claude's second proposal back to Cursor Agent for final critique:
   - Ask Cursor Agent to identify remaining risks and contradictions.
   - Ask Cursor Agent to return final critique notes and, when useful, a final
     edited proposal.

6. Codex produces the final automation:
   - Review all proposals and critiques.
   - Resolve conflicts explicitly.
   - Apply the final automation update locally.
   - Validate syntax and any available automation metadata.
   - Record if Claude AI or Cursor Agent was unavailable, timed out, unauthenticated,
     or produced unusable output. Tool unavailability should not silently skip the
     review loop; it must be reported.

7. Save and sync:
   - Save the updated automation in `~/.codex/automations/<automation_id>/automation.toml`.
   - Sync the automation to `/Users/thien.nguyen/thiennp.github.io/codex-automations/`
     when that mirror exists or when the automation sync workflow applies.
   - Update related index/README files if automation metadata changed.
   - Commit and push the shared `thiennp.github.io` repo when sync changes are
     made and it is safe to do so.

## Output

Report:

- Automation id/name updated.
- Claude AI proposal status.
- Cursor Agent first critique status.
- Claude AI second critique status.
- Cursor Agent final critique status.
- Files changed.
- Validation performed.
- Sync/commit/push result.
- Any skipped step and the concrete reason.
