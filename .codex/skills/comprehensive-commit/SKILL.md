---
name: comprehensive-commit
description: >-
  Comprehensive Code Review and Commit Process
---

# Comprehensive Code Review and Commit Process

INSTRUCTIONS:
When you see this prompt with "do it" or ".", you should:

- [ ] Ask for ticket number, if not provided
- [ ] For each rule below, add ✅ (passing) or ❌ (failing) in response

## 1. Initial Review Phase

A. Ticket Verification

- [ ] If .env configured:

```bash
pnpm tsx .cursor/scripts/assign-ticket.ts PRE-XXX
```

- [ ] Verify ticket exists using branch name
- [ ] Review requirements and acceptance criteria
- [ ] Understand scope and impact
- [ ] Note dependencies/related tickets

B. Architecture Review

- [ ] Review application architecture
- [ ] Verify alignment with existing patterns
- [ ] Check component relationships
- [ ] Review data flow and state management
- [ ] Assess API integration
- [ ] Evaluate performance implications

## 2. Implementation Review Phase

A. Code Quality Checklist

- [ ] Clean and readable code
- [ ] No code duplication
- [ ] Proper error handling
- [ ] Consistent naming conventions
- [ ] Efficient algorithms
- [ ] Memory management
- [ ] Bundle size optimization
- [ ] Type safety

B. Documentation Checklist

- [ ] Inline documentation
- [ ] JSDoc comments
- [ ] README/MDX updates
- [ ] API documentation
- [ ] Type documentation
- [ ] Example usage
- [ ] Migration guides (if needed)
- [ ] Breaking changes noted

## 3. Rule Verification Phase

A. API & Implementation

- [ ] api-error-handling-patterns
- [ ] api-integration-pattern
- [ ] api-request-pattern
- [ ] api-response-processing
- [ ] api-validation-patterns

B. Component & Structure

- [ ] component-patterns
- [ ] component-structure
- [ ] folder-organization
- [ ] yagni-folder-organization

C. Code Quality

- [ ] functional-principles
- [ ] jsx-best-practices
- [ ] performance-architecture-standards

D. Types & Validation

- [ ] type-file-organization
- [ ] typeguard-patterns
- [ ] typescript-standards

## 4. Technical Verification Phase

A. Code Verification

- [ ] Run: `pnpm run typecheck`
- [ ] Run: `pnpm test`
- [ ] Run: `pnpm test-update-snapshot`
- [ ] Fix any issues before proceeding

B. Branch Verification

- [ ] Run: `git branch --show-current`
- [ ] Verify branch pattern: - Feature: `feature/PRE-XXX` - Fix: `fix/PRE-XXX` - Refactor:
      `refactor/PRE-XXX`
- [ ] If on release branch, STOP and create proper branch

## 5. Change Analysis (SCOPE Framework)

A. Separate

- [ ] Run: `git status`
- [ ] Group files by type:
      `    Documentation: .cursor/rules/*.mdc, *.mdx, README.md
Implementation: *.tsx, *.ts, *.css
Tests: *.test.tsx, __tests__/*
Configuration: package.json, vite.config.ts`

B. Classify

- [ ] Determine change type for each file: - feat: New feature - fix: Bug fix - refactor: Code restructuring - docs:
      Documentation - test: Test changes - chore: Maintenance

C. Outline

- [ ] Run: `git diff --name-only`
- [ ] List files for current commit scope
- [ ] Verify scope alignment

D. Purpose

- [ ] Verify conceptual unity
- [ ] Check for mixed concerns
- [ ] Plan multiple commits if needed

E. Exclude

- [ ] Document excluded files and reasons

## 6. Commit Process

A. File Verification

- [ ] Review changes: `git diff file_name`
- [ ] Check for debug code/logs
- [ ] Check for sensitive data
- [ ] Verify formatting

B. Staging

- [ ] Stage relevant files including .cursor and coverage
- [ ] NEVER update .gitignore automatically
- [ ] Verify staged files: `git diff --staged --name-only`

C. Message Creation
Format:

```
# For ticket-related work
PRE-XXX: type(scope): description

# For non-ticket work
00000: type(scope): description
```

D. Commit Execution

- [ ] Review final message
- [ ] Execute: `git commit -m "PRE-XXX: type(scope): description"`

E. Post-Commit

- [ ] Verify commit: `git log -1`
- [ ] Check remaining changes
- [ ] Update documentation if needed
- [ ] Push only after explicit confirmation

## Review Comment Format

📝 Code Review Summary:

✅ Strengths:

- Well-structured components
- Clear documentation
- Efficient performance optimizations

❌ Issues:

1. Architecture:

- Component coupling in X module
- Inconsistent state management
- Performance bottleneck in Y

2. Implementation:

- Duplicate logic in service A
- Missing error boundaries
- Type safety issues in B

3. Documentation:

- Outdated API docs
- Missing migration guide
- Unclear example usage

🔨 Required Changes:

1. Architecture Improvements:

- Refactor X module for better separation
- Implement consistent state management
- Optimize Y for performance

2. Implementation Fixes:

- Extract shared logic from service A
- Add error boundaries
- Fix type issues in B

3. Documentation Updates:

- Update API documentation
- Add migration guide
- Improve example usage

⚠️ Breaking Changes:

- List any breaking changes
- Include migration steps
- Note version impacts

## Rule Verification Process

Example format for violations:

```
❌ component-patterns:
- Missing skeleton component for async operation
- No loading state implementation
- Fix required: Add proper loading states

✅ typescript-standards:
- All interfaces properly typed
- No 'any' types used
- Proper type guards implemented
```

## Architecture Alignment

Before committing any changes, verify alignment with the application architecture:

1. Review `.cursor/diagrams/application-architecture.md`
2. Ensure changes follow established patterns
3. Verify proper integration with existing components/services
4. Document any architectural impacts in commit message

## Pre-Commit Verification

1. Branch Verification

- [ ] Run: `git branch --show-current`
- [ ] Verify output matches expected pattern:

* Feature: `feature/PRE-XXX`
* Fix: `fix/PRE-XXX`
* Refactor: `refactor/PRE-XXX`

- [ ] If on release branch, STOP and create proper branch

2. Code State Verification

- [ ] Run: `pnpm run typecheck`
- [ ] Run: `pnpm test`
- [ ] Run: `pnpm test-update-snapshot`
- [ ] Fix any issues before proceeding

## Change Analysis (SCOPE Framework)

1. Separate

- [ ] Run: `git status`
- [ ] List all modified files
- [ ] Group files by type:

```
Documentation:
- .cursor/rules/*.mdc
- *.mdx
- README.md

Implementation:
- *.tsx
- *.ts
- *.css

Tests:
- *.test.tsx
- *.test.ts
- __tests__/*

Configuration:
- package.json
- vite.config.ts
- tsconfig.json
```

2. Classify

- [ ] For each file, determine primary change type:

* feat: New feature
* fix: Bug fix
* refactor: Code restructuring
* docs: Documentation
* test: Test changes
* chore: Maintenance

- [ ] Document classification:

```
feat:
- app/features/NewFeature/NewFeature.tsx
- app/features/NewFeature/types/NewFeatureProps.ts

test:
- app/features/NewFeature/NewFeature.test.tsx
```

3. Outline

- [ ] List files for current commit scope
- [ ] Run: `git diff --name-only`
- [ ] Verify each file belongs to current scope
- [ ] Document files to be included:

```
Current Scope: Feature Implementation
Files:
- file1.tsx
- file2.ts
```

4. Purpose

- [ ] Verify all files serve same conceptual purpose
- [ ] Check for mixed concerns:

* No mixing implementation and documentation
* No mixing feature code and configuration
* No mixing tests and implementation

- [ ] If mixed concerns found, plan multiple commits

5. Exclude

- [ ] Identify files to exclude from current commit
- [ ] Document excluded files and reason:

```
Excluded:
- file.ts (belongs to different feature)
- temp.txt (temporary file)
```

## Staging Process

1. File Verification

- [ ] Review each file's changes:

```bash
git diff file_name
```

- [ ] Check for:

* Debug code/console.logs
* Temporary comments
* Sensitive data
* Proper formatting

2. Staging

- [ ] Stage files by group:

```bash
git add path/to/specific/files
```

- [ ] Verify staged files:

```bash
git diff --staged --name-only
```

## Commit Creation

1. Message Formatting

- [ ] Determine ticket number
- [ ] Select change type
- [ ] Write descriptive message following format:

```
# For ticket-related work:
PRE-XXX: type(scope): description

# For non-ticket work:
00000: type(scope): description
```

2. Commit Execution

- [ ] Review final commit message
- [ ] Execute commit:

```bash
git commit -m "PRE-XXX: type(scope): description"
```

## Post-Commit Verification

1. Commit Verification

- [ ] Verify commit was created:

```bash
git log -1
```

- [ ] Check commit message format
- [ ] Verify included files

2. Push Preparation

- [ ] Run final verification:

```bash
git status
```

- [ ] Check for remaining changes
- [ ] Decide if changes need separate commit

## Documentation

1. Update Development Documentation

- [ ] Update development.mdx if needed
- [ ] Document significant decisions
- [ ] Note any breaking changes

2. Commit History

- [ ] Verify commit appears in history
- [ ] Check commit message is correct
- [ ] Ensure all files are included

## SCOPE Framework

- **S**tructural: Architecture/design changes
- **C**omponent: UI component updates
- **O**ptimization: Performance improvements
- **P**latform: Infrastructure changes
- **E**nhancement: Feature additions

## Expected Changes to Handle

The following changes should be included when committing:

1. `.cursor` directory changes SHOULD be included in commits
2. `coverage` directory changes SHOULD be included in commits
3. NEVER modify `.gitignore` automatically - this requires explicit user approval

## Commit Format

```bash
# For ticket-related work
PRE-${ticketNumber}: type(scope): description

# For non-ticket work
00000: type(scope): description

# Body (if needed)
- Key changes
- Breaking changes
- Migration steps
```

## Writing Declarative Commit Messages

1. Be specific about what changed:

- BAD: "update component"
- GOOD: "update error message display in validation"

2. Focus on the what, not the how:

- BAD: "modify code in consumption component"
- GOOD: "update consumption input placeholders for clarity"

3. Use clear, actionable verbs:

- add: for new features/files
- update: for changes to existing functionality
- fix: for bug fixes
- remove: for deletions
- refactor: for code restructuring

4. Include context when needed:

- BAD: "fix button"
- GOOD: "fix button hover state in dark mode"

5. For breaking changes, clearly mark with '!' and explain in body:

- BAD: "update API"
- GOOD: "refactor(api)!: change authentication flow"

```
BREAKING CHANGE: New token format required

Migration:
1. Update token generation
2. Update token validation
```

## Process Steps

1. Rule Verification:

```bash
# Run all checks
pnpm run verify

# Check ticket
pnpm run ticket:check TICKET-123
```

2. Stage Changes:

```bash
# Show all changes
git status

# Stage all changes including .cursor and coverage
git add .

# Verify staged changes
git diff --staged --name-only
```

3. Commit:

```bash
git commit -m "TICKET-123: type(scope): description" -m "Details: ..."
```

4. Post-Commit:

- Run final type check
- Verify test coverage
- Check documentation updates
- Review bundle size impact

## Examples

```bash
# Example 1: Feature with UI changes
pnpm run verify
git add app/features/Teaser/
git commit -m "PRE-2123: fix(teaser): update consumption input placeholders for clarity"

# Example 2: Breaking API change
pnpm run verify
git add app/services/
git commit -m "PRE-1234: refactor(api)!: change authentication flow" -m "BREAKING CHANGE: New token format required\n\nMigration:\n1. Update token generation\n2. Update token validation"

# Example 3: Performance optimization
pnpm run verify
git add app/features/
git commit -m "PRE-1235: perf(validation): optimize form validation with memoization"

# Example 4: Documentation update
pnpm run verify
git add .cursor/rules/
git commit -m "00000: docs(rules): add accessibility testing guidelines"
```

## Common Mistakes to Avoid

1. Using vague commit messages like "update code" or "fix bug"
2. Not verifying staged files before commit
3. Using "and" in commit messages (split into multiple commits instead)
4. Not being specific about what changed
5. Missing breaking change markers when needed
6. Skipping verification steps

## Rule Compliance Checklist

- [ ] Ticket requirements met
- [ ] All tests passing
- [ ] Documentation updated
- [ ] Performance verified
- [ ] Accessibility checked
- [ ] Security reviewed
- [ ] Clean git history
