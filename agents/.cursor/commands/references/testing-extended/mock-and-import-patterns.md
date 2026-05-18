# Mock and import patterns (Vitest)

Align with **`rules-bundle-testing.mdc`**: prefer real code, mock only external boundaries, never mock internal project modules except where that bundle explicitly allows (e.g. router/fetcher spies).

## Principles

- Prefer simple mocks over elaborate ones when behavior is unchanged.
- Mock dependencies, not the unit under test.
- Document limitations when full isolation is impractical (server-only paths, router-heavy loaders).

## Function export smoke checks

When full mocking would dwarf the utility, assert export shape and callability:

```typescript
describe("complexUtility", () => {
  it("exports a callable function", async () => {
    const { complexUtility } = await import("./complexUtility");
    expect(typeof complexUtility).toBe("function");
  });
});
```

Use this sparingly—prefer real behavior tests when dependencies are mockable.

## Dependency mocking

```typescript
vi.mock("external-dependency", () => ({
  dependencyFunction: vi.fn(),
}));

describe("utilityWithDependencies", () => {
  it("calls the dependency", async () => {
    const { dependencyFunction } = await import("external-dependency");
    vi.mocked(dependencyFunction).mockReturnValue("mocked");

    const { utilityWithDependencies } = await import("./utilityWithDependencies");
    const result = utilityWithDependencies("input");

    expect(dependencyFunction).toHaveBeenCalledWith("input");
    expect(result).toBe("expected");
  });
});
```

## `vi.hoisted` for mocks referenced in factories

Use **`vi.hoisted()`** when the mock factory and test body share the same `vi.fn()` (see **`rules-bundle-testing.mdc`** loader example).

## Partial module mocking

```typescript
vi.mock("./complexModule", async () => {
  const actual = await vi.importActual<typeof import("./complexModule")>("./complexModule");
  return {
    ...actual,
    complexFunction: {
      ...actual.complexFunction,
      parse: vi.fn(),
    },
  };
});
```

## Dynamic imports in tests

Prefer static imports when possible. When testing lazy paths, coordinate with **`vi.doMock`** / dynamic import only if the production code truly requires it, and reset module state between cases if Vitest caches bite.

## Anti-patterns

- Mocking internal components or stores when the testing bundle says not to.
- Assertions on private helpers instead of observable outcomes.
- Leaving **`vi.mock`** implementations without cleanup between files—prefer scoped factories and **`vi.restoreAllMocks()`** / **`afterEach`** where appropriate.
