## 1. Initial Assessment Phase

### Intent (meaningful coverage)

- Target branches and guards that encode business decisions; idle lines merit deletion, not hacks.
- Cover negative paths and timeouts—happy paths often self-insure via broader suites.
- Use coverage dashboards to find **clusters** of risk in the files you touch, not to chase a vanity global percent.

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
