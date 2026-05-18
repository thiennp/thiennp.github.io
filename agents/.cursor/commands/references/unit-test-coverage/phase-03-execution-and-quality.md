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
