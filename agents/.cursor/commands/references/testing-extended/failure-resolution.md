# Test failure resolution

## Investigate actual behavior first

1. Read the implementation under test—especially type guards and early returns.
2. Reproduce inputs from the failing test in isolation (debugger, `console`, or a scratch case).
3. Check recent refactors: renamed exports, default vs named imports, path alias changes.

## Expectation mismatches

When assertions disagree with outputs:

- Update expectations **only after** confirming the implementation matches the ticket—not to silence red CI.
- Encode domain rationale in the test name or a short comment when behavior is non-obvious.

## Import/export mismatches

- Verify default vs named exports match consumer imports.
- For lazy-loaded modules, ensure mocks are declared before imports per Vitest hoisting rules.

## Mock issues

- If mocking balloons, narrow boundaries: spy on the smallest external edge.
- When SSR-only branches fail in DOM suites, assert the null/early-return path explicitly rather than forcing browser globals everywhere.

## Type errors in tests

Use **`as Request`**, **`as Location`**, etc., for structural test doubles—never **`as any`** unless a test-only escape hatch is documented.

## Flaky order-dependent tests

- Clear timers, subscriptions, and global mutations between cases.
- Avoid sharing mutable singletons without resetting state via helpers exported from the module under test.
