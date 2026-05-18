---
name: component-snapshot-tests-codemod
description: >-
  Lists React TSX files without co-located tests and generates Vitest snapshot
  tests via TypeScript codemods. Use when bulk-adding component tests, closing
  snapshot coverage gaps, or when the user runs the component snapshot codemod
  workflow.
---

# Component snapshot test codemod

## When to use

Adding **`*.test.tsx`** with **`createSnapshotRootElm`** patterns for components that lack tests (see **`.cursor/rules/component-patterns.mdc`** if present).

## Steps

1. From the repository root, list components missing tests (run once):

   ```bash
   npx tsx .cursor/scripts/codemods/list-tsx-without-test.ts
   ```

2. For each path printed in step 1:

   ```bash
   npx tsx .cursor/scripts/codemods/write-component-test.ts "<path>"
   ```

   Use the exact path from the list (repo-relative or absolute as emitted).

3. Each run creates or overwrites **`<ComponentName>.test.tsx`** next to the component. Review snapshots and apply the **`post-action-verification`** skill after batches.

## Scripts

- **`.cursor/scripts/codemods/list-tsx-without-test.ts`**
- **`.cursor/scripts/codemods/write-component-test.ts`**

See **`.cursor/scripts/README.md`** for related codemods.

## Related

- **`reference-bulk-all-components.md`** — end-to-end “all components without tests” batch instructions (optional; same scripts as above).
