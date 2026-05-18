---
name: component-snapshot-tests-codemod
description: Lists React TSX files without co-located tests and generates Vitest snapshot tests via TypeScript codemods for bulk component coverage work.
---

# Component Snapshot Test Codemod

## When to use

Add co-located **`*.test.tsx`** files with the repository's
**`createSnapshotRootElm`** pattern for React components that lack tests.
Check **`.cursor/rules/component-patterns.mdc`** first when it exists.

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

3. Each run creates or overwrites **`<ComponentName>.test.tsx`** next to the component. Review snapshots and run the repository's normal verification after each practical batch.

## Scripts

- **`.cursor/scripts/codemods/list-tsx-without-test.ts`**
- **`.cursor/scripts/codemods/write-component-test.ts`**

See **`.cursor/scripts/README.md`** for related codemods.

## Related

- **`reference-bulk-all-components.md`** - end-to-end batch instructions for all components without tests.
