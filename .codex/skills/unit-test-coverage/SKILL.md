---
name: unit-test-coverage
description: >-
  Comprehensive Unit Test Coverage Improvement Process
---

# Comprehensive Unit Test Coverage Improvement Process

INSTRUCTIONS:
When you see this prompt with "do it" or ".", you should:

- [ ] Run current test suite and check coverage
- [ ] Identify files with lowest coverage
- [ ] Write comprehensive tests for the lowest coverage file
- [ ] **MANDATORY: Achieve 100% coverage for Statements, Branches, Functions, and Lines**
- [ ] Follow testing best practices and avoid unnecessary mocking
- [ ] **MANDATORY: Prettify all files before committing**
- [ ] Proceeding to next iteration

## 1. Initial Assessment Phase

A. Coverage Exclusions

- [ ] **Constants folder**: Exclude from testing and coverage analysis
- [ ] **Enums folder**: Exclude from testing and coverage analysis
- [ ] **Files ending with .constant.ts**: Exclude from testing and coverage analysis
- [ ] **Files ending with .enum.ts**: Exclude from testing and coverage analysis
- [ ] **Files ending with .type.ts**: Exclude from testing and coverage analysis
- [ ] **Files named utilityTypes.ts**: Exclude from testing and coverage analysis
- [ ] **Simple exports**: Exclude constant values, objects, arrays, enum definitions, and type definitions

B. Test Suite Execution

- [ ] Run: `pnpm test`
- [ ] Verify all existing tests pass
- [ ] Note any failing tests that need fixing first
- [ ] Run: `pnpm test -- --coverage`
- [ ] Generate coverage report
- [ ] **EXCLUDE constants, enums, type files, and utilityTypes files from coverage analysis**

C. Coverage Analysis

- [ ] Review coverage report output
- [ ] **IGNORE coverage for constants, enums, type files, and utilityTypes files in coverage reports**
- [ ] Identify files with lowest coverage percentages (excluding constants/enums/type files/utilityTypes files)
- [ ] Prioritize files by:
  - Business critical functions
  - Complex logic
  - Public API functions
  - Recently modified code
- [ ] **MANDATORY: Document 100% coverage requirement for all metrics**

## 2. File Selection Phase

A. File Exclusions

- [ ] **DO NOT test files in the constants folder**
- [ ] **DO NOT test files ending with .constant.ts**
- [ ] **DO NOT test files in the enums folder**
- [ ] **DO NOT test files ending with .enum.ts**
- [ ] **DO NOT test files ending with .type.ts**
- [ ] **DO NOT test files named utilityTypes.ts**
- [ ] **DO NOT test simple constant exports (single values, objects, arrays)**
- [ ] **DO NOT test simple enum exports (enum definitions)**
- [ ] **DO NOT test simple type exports (type definitions, interfaces)**
- [ ] Focus testing efforts on utility functions, components, and business logic

B. Coverage Prioritization

- [ ] List files with coverage below 100% in ANY metric
- [ ] Sort by coverage percentage (lowest first)
- [ ] Consider file importance and complexity
- [ ] **EXCLUDE constants, enums, type files, utilityTypes files, and files ending with .constant.ts, .enum.ts, or .type.ts from testing**
- [ ] Select the file with lowest coverage for testing
- [ ] **MANDATORY: Target 100% coverage across ALL metrics**

B. File Analysis

- [ ] Review the selected file's code
- [ ] **SKIP if file is in constants/enums folder, ends with .constant.ts/.enum.ts/.type.ts, or is named utilityTypes.ts**
- [ ] Identify untested functions and branches
- [ ] Understand the function's purpose and behavior
- [ ] Note dependencies and external calls
- [ ] Plan test strategy to achieve 100% coverage

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

## 5. Test Execution Phase

A. Individual Test Execution

- [ ] Run: `pnpm test path/to/testFile.test.ts`
- [ ] Verify all tests pass
- [ ] Check coverage for the specific file
- [ ] **MANDATORY: Verify 100% coverage across ALL metrics**

B. Coverage Verification

- [ ] Run: `pnpm test path/to/testFile.test.ts -- --coverage`
- [ ] **MANDATORY: Verify coverage report shows 100% for:**
  - Statements: 100%
  - Branches: 100%
  - Functions: 100%
  - Lines: 100%
- [ ] **If ANY metric is below 100%, continue writing tests until 100% is achieved**
- [ ] Document any remaining uncovered code

## 6. Quality Assurance Phase

A. Test Quality Checklist

- [ ] Tests are readable and maintainable
- [ ] Test names clearly describe what they test
- [ ] No test code duplication
- [ ] Proper setup and teardown
- [ ] Mocks are cleaned up after tests
- [ ] Tests are independent and can run in any order
- [ ] **MANDATORY: 100% coverage achieved across all metrics**

B. Code Quality Verification

- [ ] Run: `pnpm run typecheck`
- [ ] Verify no TypeScript errors
- [ ] Check for any linting issues
- [ ] Ensure test files follow naming conventions
- [ ] **MANDATORY: Final coverage verification shows 100% across all metrics**

## 7. Prettify Phase

A. **MANDATORY: Prettify All Files Before Commit**

- [ ] Run: `pnpm prettier --write .`
- [ ] Check for any formatting issues
- [ ] **MANDATORY: All files pass prettier checks**

## 8. Confirmation Phase

A. Results Presentation

- [ ] Show current coverage improvement
- [ ] Present the test file written
- [ ] Explain test strategy used
- [ ] Highlight any challenges encountered
- [ ] **MANDATORY: Confirm 100% coverage achieved**
- [ ] **MANDATORY: Confirm all files are prettified**
- [ ] Back to 1.A

## Test Writing Best Practices

### 1. Avoid Unnecessary Mocking

```typescript
// ❌ BAD: Over-mocking
describe("utility", () => {
  it("processes data", () => {
    const mockProcess = vi.fn().mockReturnValue("processed");
    vi.spyOn(processModule, "process").mockImplementation(mockProcess);

    const result = utility("input");

    expect(mockProcess).toHaveBeenCalledWith("input");
    expect(result).toBe("processed");
  });
});

// ✅ GOOD: Test actual behavior
describe("utility", () => {
  it("processes data", () => {
    const result = utility("input");
    expect(result).toBe("expected-processed-result");
  });
});
```

### 2. Use Spies for 3rd Party Dependencies

```typescript
// ✅ GOOD: Use spy to observe behavior
describe("apiUtility", () => {
  it("calls external API correctly", () => {
    const apiSpy = vi.spyOn(apiModule, "callApi");

    apiUtility("endpoint");

    expect(apiSpy).toHaveBeenCalledWith("endpoint");
  });
});
```

### 3. Test React Hooks with Components

```typescript
// ✅ GOOD: Test hook through component
describe("useDataHook", () => {
  it("returns data when available", () => {
    const TestComponent = () => {
      const { data, loading } = useDataHook();
      return (
        <div>
          <span data-testid="loading">{loading.toString()}</span>
          <span data-testid="data">{data}</span>
        </div>
      );
    };

    render(<TestComponent />);
    expect(screen.getByTestId("data")).toHaveTextContent("expected-data");
  });
});
```

### 4. Handle Global Objects Properly

```typescript
// ✅ GOOD: Proper global object handling
describe("browserUtility", () => {
  beforeEach(() => {
    Object.defineProperty(global, "window", {
      value: {
        location: { href: "https://example.com" },
        setTimeout: vi.fn((callback) => {
          callback();
          return 1;
        }),
      },
      writable: true,
    });
  });

  afterEach(() => {
    delete global.window;
  });

  it("works with window object", () => {
    expect(browserUtility()).toBe("expected-result");
  });
});
```

## Coverage Improvement Examples

### Example 1: Simple Utility Function

**File**: `app/utils/formatNumber.ts`
**Original Coverage**: 60%

```typescript
// Test file: formatNumber.test.ts
describe("formatNumber", () => {
  it("formats positive numbers", () => {
    expect(formatNumber(1234.56)).toBe("1,234.56");
  });

  it("formats negative numbers", () => {
    expect(formatNumber(-1234.56)).toBe("-1,234.56");
  });

  it("handles zero", () => {
    expect(formatNumber(0)).toBe("0.00");
  });

  it("handles undefined", () => {
    expect(formatNumber(undefined)).toBe("0.00");
  });

  it("handles null", () => {
    expect(formatNumber(null)).toBe("0.00");
  });

  // MANDATORY: Test ALL branches
  it("handles edge cases", () => {
    expect(formatNumber(Number.MAX_SAFE_INTEGER)).toBe("9,007,199,254,740,991.00");
    expect(formatNumber(Number.MIN_SAFE_INTEGER)).toBe("-9,007,199,254,740,991.00");
    expect(formatNumber(0.1 + 0.2)).toBe("0.30"); // Floating point precision
  });
});
```

**Result**: 100% coverage achieved across ALL metrics

### Example 2: Complex Utility with Dependencies

**File**: `app/utils/apiClient.ts`
**Original Coverage**: 45%

```typescript
// Test file: apiClient.test.ts
describe("apiClient", () => {
  it("makes successful API calls", async () => {
    const mockResponse = { data: "test" };
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    } as Response);

    const result = await apiClient.get("/test");

    expect(fetchSpy).toHaveBeenCalledWith("/test");
    expect(result).toEqual(mockResponse);
  });

  it("handles API errors", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue({
      ok: false,
      status: 404,
    } as Response);

    await expect(apiClient.get("/test")).rejects.toThrow("API error: 404");
  });

  // MANDATORY: Test ALL error conditions
  it("handles network errors", async () => {
    vi.spyOn(global, "fetch").mockRejectedValue(new Error("Network error"));

    await expect(apiClient.get("/test")).rejects.toThrow("Network error");
  });

  it("handles JSON parsing errors", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: () => Promise.reject(new Error("Invalid JSON")),
    } as Response);

    await expect(apiClient.get("/test")).rejects.toThrow("Invalid JSON");
  });
});
```

**Result**: 100% coverage achieved across ALL metrics

## Process Iteration

After completing tests for one file:

1. **Run full test suite**: `pnpm test`
2. **Generate new coverage report**: `pnpm test -- --coverage`
3. **Identify next lowest coverage file**
4. **Prettify all files**: `pnpm prettier --write .`
5. **Ask for confirmation**: "Continue with next file? (y/n)"
6. **If yes**: Repeat entire process
7. **If no**: End process and provide summary

## Success Metrics

- [ ] All tests pass
- [ ] **MANDATORY: 100% coverage achieved for tested files across ALL metrics**
- [ ] No unnecessary mocking
- [ ] Tests are maintainable and readable
- [ ] TypeScript compilation successful
- [ ] No linting errors
- [ ] **MANDATORY: All files are prettified**
- [ ] **Constants, enums, type files, and utilityTypes files are excluded from testing (constants/enums folders, .constant.ts/.enum.ts/.type.ts files, and utilityTypes.ts files)**

## Common Pitfalls to Avoid

1. **Over-mocking**: Don't mock everything, test real behavior
2. **Testing implementation details**: Focus on what the function does, not how
3. **Incomplete coverage**: Ensure all branches and edge cases are tested
4. **Poor test names**: Use descriptive names that explain what is being tested
5. **Not cleaning up mocks**: Always restore mocks after tests
6. **Testing multiple concerns**: Each test should focus on one specific behavior
7. **Accepting less than 100% coverage**: This is NOT acceptable
8. **Forgetting to prettify**: Always prettify files before committing
9. **Testing constants, enums, type files, and utilityTypes files**: Do NOT write tests for files in constants/enums folders, ending with .constant.ts/.enum.ts/.type.ts, or named utilityTypes.ts

## Documentation

- [ ] Update test documentation if needed
- [ ] Document any complex test scenarios
- [ ] Note any testing patterns established
- [ ] Update coverage targets and goals
- [ ] **MANDATORY: Document 100% coverage achievement**

## Final Verification

Before ending the process:

- [ ] Run: `pnpm test`
- [ ] Verify all tests pass
- [ ] Check overall coverage improvement
- [ ] **Prettify all files**: `pnpm prettier --write .`
- [ ] **Verify prettier checks pass**: `pnpm prettier --check .`
- [ ] Document any remaining low-coverage files
- [ ] Provide summary of improvements made
- [ ] **MANDATORY: Confirm 100% coverage for all tested files**
- [ ] **MANDATORY: Confirm all files are properly formatted**
