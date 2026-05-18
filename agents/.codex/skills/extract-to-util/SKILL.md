---
name: extract-to-util
description: Guides extraction of duplicated or overgrown logic into a named utility, hook, type guard, or transformer with focused tests.
---

# Extract To Utility

## Purpose

Use this workflow to move reusable logic without creating vague helper buckets.
The extracted code must have a single responsibility, a clear owner, and tests
that cover the behavior being moved.

## Location Decision

- Global cross-feature logic: `src/utils/`.
- Feature-only logic: `src/features/<feature>/utils/`.
- Component-only logic: keep near the component unless reuse already exists.
- React stateful behavior: use a custom hook and name it `use...`.
- Runtime shape checks: use a type guard named `is...` or `has...`.

Prefer the repository's existing folder layout over introducing a new category.

## Workflow

1. Identify the behavior:
   - Name the responsibility in one sentence.
   - List inputs, outputs, side effects, and error behavior.
   - Confirm the logic is reused or worth isolating for clarity.

2. Choose the utility shape:
   - Pure function for deterministic transformations.
   - Hook for React lifecycle or stateful UI behavior.
   - Type guard for `unknown` or untrusted JSON.
   - Adapter/mapper for API response translation.

3. Extract narrowly:
   - Move only the target behavior.
   - Preserve existing behavior and call-site semantics.
   - Keep types explicit at the utility boundary.
   - Avoid dragging UI, store, routing, or API concerns into generic utilities.

4. Test and verify:
   - Add or update focused tests for main cases, edge cases, and error branches.
   - Run the repo's relevant typecheck and test commands.
   - For EnergyCenter frontend application changes, run `npm run test-update` from `frontend/` when required by local rules.

## Naming

- Functions: strong verb phrase, such as `normalizeTariffInput`.
- Hooks: `use...`, such as `useSelectedProvider`.
- Type guards: `is...` or `has...`, such as `isTariffResponse`.
- Files: match the exported symbol when the repo convention supports it.

## Output

Summarize the extracted responsibility, new file path, updated call sites,
tests added, and verification results.
