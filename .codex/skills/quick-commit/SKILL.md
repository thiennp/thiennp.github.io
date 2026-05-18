---
name: quick-commit
description: >-
  Quick Commit Process
---

# Quick Commit Process

INSTRUCTIONS:
When you see this prompt with "do it" or ".", you should:

- [ ] Ask for ticket number, if it is not a part of the branch name. Use 00000 if I response with another "." or "," or "y"
- [ ] For each rule below, add ✅ (passing) or ❌ (failing) in response

1. Change Verification
   A. Status Check

- [ ] Run: `git status`
- [ ] Identify changes to be committed
- [ ] Note special directories:

* .cursor (include)
* .gitignore (NEVER modify automatically)

B. Import Path Check

- [ ] Check for all changes related to `import`, suggest shorten version, wait for confirmation

Common paths to use:

- hooks/
- utils/
- components/
- features/
- types/
- stores/

```typescript
// BEFORE: Overly long relative path
import { useNumberFormValue } from "../../../../../hooks/useNumberFormValue";

// AFTER: Shortened absolute path
import { useNumberFormValue } from "hooks/useNumberFormValue";
```

C. File Review

- [ ] Run: `git diff --name-only`
- [ ] Group changes by type:

* Implementation
* Documentation
* Tests
* Configuration

2. Staging Process
   A. File Staging

- [ ] Stage specific files:

```bash
git add path/to/files
```

OR

- [ ] Stage all changes if appropriate:

```bash
git add .
```

B. Verification

- [ ] Run: `git diff --staged --name-only`
- [ ] Confirm all necessary files included
- [ ] Verify no unintended files staged

3. Message Creation
   A. Format

```bash
# For ticket-related work
PRE-XXX: type(scope): description

# For non-ticket work
00000: type(scope): description
```

B. Type Selection

- [ ] Choose appropriate type:

* feat: New feature
* fix: Bug fix
* docs: Documentation
* refactor: Code restructuring
* test: Adding tests
* chore: Maintenance

C. Message Quality

- [ ] Be specific about changes
- [ ] Focus on what, not how
- [ ] Use clear, actionable verbs:

* add: new features/files
* update: existing functionality
* fix: bug fixes
* remove: deletions
* refactor: code restructuring

- [ ] Include context when needed

4. Commit Execution
   A. Confirmation

- [ ] Present commit message for review
- [ ] Get explicit confirmation
- [ ] NEVER commit without confirmation

B. Execution

- [ ] Run commit with approved message:

```bash
git commit -m "PRE-XXX: type(scope): description"
```

5. Post-Commit
   A. Verification

- [ ] Verify commit was created
- [ ] Check for remaining changes

B. Push Decision

- [ ] Ask if changes should be pushed
- [ ] If confirmed:

```bash
git push
```

## Common Mistakes to Avoid

1. Modifying .gitignore without explicit approval
2. Using vague commit messages
3. Not verifying staged files
4. Using "and" in messages (split into multiple commits)
5. Not being specific about changes
6. Using overly long relative import paths
7. Not using available absolute import paths

## Message Examples

```bash
# UI Change
PRE-1234: fix(button): correct hover state in dark mode

# Content Update
PRE-1234: fix(teaser): update consumption input placeholders

# Documentation
00000: docs(rules): add commit message guidelines

# Refactor
PRE-1234: refactor(validation): extract form validation logic

# Import Path Update
PRE-1234: refactor(imports): shorten relative import paths
```
