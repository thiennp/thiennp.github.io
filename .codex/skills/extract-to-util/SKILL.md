---
name: extract-to-util
description: >-
  Extract to Utility Function
---

# Extract to Utility Function

INSTRUCTIONS:
When you see this prompt with "do it" or ".", you should:

1. Analyze the code to be extracted
2. Determine appropriate utility type (pure function, hook, etc.)
3. Identify all dependencies and imports needed
4. Choose appropriate location based on utility scope
5. Generate utility function with proper TypeScript types
6. Add necessary tests and documentation
7. Update original code to use the new utility
8. Run verification steps
9. Present changes for review
10. Commit changes after confirmation

- [ ] For each rule below, add ✅ (passing) or ❌ (failing) in response

## Utility Types

- Pure functions
- Custom hooks
- Type guards
- Helper functions
- Transformers

## Location Selection

```
app/
├── utils/                    # Global utilities
│   ├── typeguards/          # Type validation utilities
│   ├── transformers/        # Data transformation utilities
│   └── helpers/             # General helper functions
├── features/
│   └── FeatureName/
│       └── utils/           # Feature-specific utilities
└── components/
└── ComponentName/
    └── utils/           # Component-specific utilities
```

## Verification Steps

```bash
# Type checking
pnpm run typecheck

# Run tests
pnpm test

# Update snapshots if needed
pnpm test-update-snapshot
```

## Implementation Guidelines

1. Pure Function Pattern:

```typescript
// utils/transformers/transformData.ts
export function transformData<T>(input: T): TransformedT {
  // Implementation
}
```

2. Custom Hook Pattern:

```typescript
// utils/hooks/useCustomHook.ts
export function useCustomHook<T>(param: T): HookResult {
  // Implementation
}
```

3. Type Guard Pattern:

```typescript
// utils/typeguards/isCustomType.ts
export function isCustomType(value: unknown): value is CustomType {
  // Implementation
}
```

## Testing Requirements

1. Unit Tests:

```typescript
describe("utilityFunction", () => {
  it("should handle valid input", () => {
    // Test implementation
  });

  it("should handle edge cases", () => {
    // Test implementation
  });
});
```

2. Integration Tests (if needed):

```typescript
describe("utilityFunction integration", () => {
  it("should work with dependent functions", () => {
    // Test implementation
  });
});
```

## Documentation

1. JSDoc Comments:

```typescript
/**
 * Description of what the utility does
 * @param param - Parameter description
 * @returns Description of return value
 * @throws Description of potential errors
 */
```

2. Usage Examples:

```typescript
// Example usage in documentation
const result = utilityFunction(input);
```

## Commit Format

```bash
# For new utilities
git commit -m "TICKET-123: feat(utils): add new utility function"

# For utility updates
git commit -m "TICKET-123: refactor(utils): improve existing utility"
```

## Checklist

- [ ] Function has clear, single responsibility
- [ ] TypeScript types are complete and accurate
- [ ] Tests cover main cases and edge cases
- [ ] Documentation is clear and includes examples
- [ ] No side effects in pure functions
- [ ] Proper error handling implemented
- [ ] Follows existing utility patterns
- [ ] Placed in appropriate location
