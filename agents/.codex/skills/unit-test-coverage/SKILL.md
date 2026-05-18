---
name: unit-test-coverage
description: Improves unit test coverage with focused behavior-driven tests and repository verification for TypeScript and React coverage gaps.
---

# Unit Test Coverage

## Purpose

Use this workflow to improve meaningful coverage without testing constants,
types, generated files, or implementation trivia. Prefer behavior-focused tests
that would fail for real regressions.

## Scope Selection

1. Run the repository's normal test and coverage command, or use the coverage
   report the user provides.
2. Exclude files that do not need behavioral tests:
   - `*.type.ts`, `*.enum.ts`, `*.constant.ts`.
   - constant and enum folders.
   - generated files, barrel-only exports, and simple type-only modules.
3. Prioritize files with business logic, branching, data transformation,
   validation, hooks, or user-visible behavior.

## Test Strategy

- Cover happy paths, edge cases, and error branches.
- Prefer real functions and lightweight fixtures over broad mocks.
- Use spies for external boundaries when observation is enough.
- For React hooks, test through a component or hook test harness instead of mocking the hook.
- For components, assert behavior and stable rendered output according to repo patterns.

## Implementation Loop

1. Read the target file and existing tests.
2. List uncovered behavior in plain language.
3. Add the smallest useful set of tests.
4. Run the relevant test command for the file or package.
5. Run broader verification when local rules require it.
6. Repeat until the requested target is reached or remaining gaps are not worth testing; explain any residual gap.

## Verification

Use repository commands, for example:

```bash
pnpm test
pnpm test -- --coverage
```

For EnergyCenter frontend application changes, run `npm run test-update` from
`frontend/` when required by `.cursor/rules/task-verification.mdc`.

## Output

Report the target file, behavior covered, tests added, commands run, coverage
movement, and any justified exclusions.
