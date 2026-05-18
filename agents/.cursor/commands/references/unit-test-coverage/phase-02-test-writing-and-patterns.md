## 3. Test Writing Phase

A. Test Strategy Planning

- [ ] Determine test approach:
  - Unit tests for pure functions
  - Integration tests for complex interactions
  - Component tests for React components
  - Hook tests using test components
- [ ] Identify test cases needed:
  - Happy path scenarios
  - Edge cases
  - Error conditions
  - Boundary values
  - **ALL conditional branches**
  - **ALL function calls**
- [ ] Plan test data and fixtures
- [ ] **MANDATORY: Ensure every line of code will be executed**

B. Mocking Strategy (Minimal Mocking)

- [ ] **AVOID mocks when possible**:
  - Use real function calls
  - Test actual behavior
  - Avoid mocking internal dependencies

- [ ] **Use spies instead of mocks for 3rd parties**:
  - Only when real access is not available
  - Use `vi.spyOn()` to observe behavior
  - Don't change return values unless necessary

- [ ] **Mock only when absolutely necessary**:
  - `window` object (when not available in test environment)
  - `process.env` (when environment-specific)
  - External APIs that can't be accessed in tests
  - Browser-specific APIs in Node.js environment

- [ ] **For React hooks**:
  - Create test components that use the hook
  - Test the component's behavior
  - Avoid mocking the hook itself

## 4. Test Implementation Phase

A. Test File Structure

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { utilityFunction } from "./utilityFunction";

describe("utilityFunction", () => {
  // Test all input types and edge cases
  it("handles valid input", () => {
    // Test implementation
  });

  it("handles edge cases", () => {
    // Test edge cases
  });

  it("handles error conditions", () => {
    // Test error scenarios
  });

  // MANDATORY: Test ALL branches and conditions
  it("handles all conditional branches", () => {
    // Test every if/else, switch case, ternary operator
  });
});
```

B. **MANDATORY Coverage Requirements**

- [ ] **Statements**: 100% coverage required - NO EXCEPTIONS
- [ ] **Branches**: 100% coverage required - NO EXCEPTIONS
- [ ] **Functions**: 100% coverage required - NO EXCEPTIONS
- [ ] **Lines**: 100% coverage required - NO EXCEPTIONS

C. Test Patterns

### For Simple Utilities

```typescript
describe("simpleUtility", () => {
  it("returns expected result for valid input", () => {
    expect(simpleUtility("input")).toBe("expected");
  });

  it("handles edge cases", () => {
    expect(simpleUtility("")).toBe("default");
    expect(simpleUtility(null)).toBe("default");
    expect(simpleUtility(undefined)).toBe("default");
  });

  // MANDATORY: Test ALL branches
  it("handles all conditional logic", () => {
    // Test every if statement, ternary operator, switch case
  });
});
```

### For Utilities with Dependencies

```typescript
describe("utilityWithDependencies", () => {
  it("calls dependencies correctly", () => {
    const mockDependency = vi.fn().mockReturnValue("mocked");
    vi.spyOn(dependencyModule, "dependency").mockImplementation(mockDependency);

    utilityWithDependencies("input");

    expect(mockDependency).toHaveBeenCalledWith("input");
  });

  // MANDATORY: Test error branches
  it("handles dependency errors", () => {
    vi.spyOn(dependencyModule, "dependency").mockImplementation(() => {
      throw new Error("Dependency failed");
    });

    expect(() => utilityWithDependencies("input")).toThrow("Dependency failed");
  });
});
```

### For Server-Side Utilities

```typescript
describe("serverUtility", () => {
  it("returns correct value for each environment", () => {
    vi.spyOn(envModule, "getEnv").mockReturnValue(EnvironmentEnum.PROD);
    expect(serverUtility()).toBe("production-value");
  });

  // MANDATORY: Test ALL environment cases
  it("handles all environment types", () => {
    vi.spyOn(envModule, "getEnv").mockReturnValue(EnvironmentEnum.DEV);
    expect(serverUtility()).toBe("development-value");

    vi.spyOn(envModule, "getEnv").mockReturnValue(EnvironmentEnum.TEST);
    expect(serverUtility()).toBe("test-value");
  });
});
```

### For Browser-Dependent Utilities

```typescript
describe("browserUtility", () => {
  it("returns null when document is undefined (SSR)", () => {
    const originalDocument = global.document;
    delete global.document;

    expect(browserUtility()).toBeNull();

    global.document = originalDocument;
  });

  // MANDATORY: Test when document exists
  it("works when document is available", () => {
    Object.defineProperty(global, "document", {
      value: { title: "Test" },
      writable: true,
    });

    expect(browserUtility()).toBe("expected-result");

    delete global.document;
  });
});
```

### For React Hooks

```typescript
describe("useCustomHook", () => {
  it("returns expected state", () => {
    const TestComponent = () => {
      const result = useCustomHook();
      return <div data-testid="result">{result}</div>;
    };

    render(<TestComponent />);
    expect(screen.getByTestId("result")).toHaveTextContent("expected");
  });

  // MANDATORY: Test ALL hook states and conditions
  it("handles all hook states", () => {
    const TestComponent = () => {
      const { data, loading, error } = useCustomHook();
      return (
        <div>
          <span data-testid="loading">{loading.toString()}</span>
          <span data-testid="data">{data}</span>
          <span data-testid="error">{error}</span>
        </div>
      );
    };

    render(<TestComponent />);
    // Test all possible states
  });
});
```
