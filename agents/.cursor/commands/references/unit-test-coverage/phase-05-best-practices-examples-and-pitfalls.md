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
