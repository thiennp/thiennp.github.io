# Global and browser mocking

## Window and browser globals

- Use **`setGlobal`** / **`getGlobal`** from the repository test setup (see **`setupTest`** / **`rules-bundle-testing.mdc`**). These utilities patch **`window`** properties without replacing the entire object.
- Do **not** assign `global.window = …` or `Object.defineProperty(global, "window", …)` unless a documented harness requires it—those patterns leak across tests.

### Example: location and vendor globals

```typescript
import { setGlobal, getGlobal } from "../../setupTest"; // repo root setupTest.tsx — adjust relative depth per test file

describe("browserUtility", () => {
  afterEach(() => {
    // restore helpers provided by setupTest / project conventions
  });

  it("reads location href", () => {
    setGlobal("location", { href: "https://example.com/path" } as Location);
    // exercise code under test
    expect(getGlobal("location")?.href).toContain("example.com");
  });
});
```

Typing: cast targeted slices (**`as Location`**, **`as unknown as Window["Check24"]`**) when narrowing vendor shapes—avoid **`any`**.

## Storage APIs (`localStorage`, `sessionStorage`)

Use **`Object.defineProperty(global, "localStorage", { value: mockStorage, writable: true, configurable: true })`** (and symmetrical teardown in **`afterEach`**) when utilities touch Web Storage APIs.

## Timers

Prefer **`vi.useFakeTimers()`** only when needed; components using **`React.lazy`** may require **`vi.useRealTimers()`** for that file (see **`rules-bundle-testing.mdc`**).

## Cleanup

Always restore globals after each test (`afterEach`). Pair destructive setups with the narrowest scope possible so unrelated suites do not inherit polluted **`window`** state.
