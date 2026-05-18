# Bulk snapshot codemod — all components without tests

INSTRUCTIONS:
When you see this prompt with "do it" or ".", you should:

1. **List all `.tsx` components without existing tests**
   - Run: `npx tsx .agents/scripts/codemods/list-tsx-without-test.ts`
   - Capture the full output (one path per line).

2. **For each path in the output**
   - Run: `npx tsx .agents/scripts/codemods/write-component-test.ts "<path>"`
   - Use the exact path from the list (repo-relative or absolute as emitted).
   - Each run creates or overwrites `<ComponentName>.test.tsx` in the same directory with snapshot tests (commonly one `it(...)` per mock-prop scenario).

3. **Scope**
   - Process every line from step 1; do not skip components unless the script fails for that path (then continue with the next).
   - Optionally report progress (for example N/M done) and any paths that errored.

## Conventions

- Snapshots are contracts: update them only when UI intent truly shifts.
- Batch runs still need spot checks for flakiness and theme variants.
- Pair mechanical updates with human review of diff noise versus meaningful drift.
- After batches, follow **`@.cursor/skills/skill-post-change-verification/SKILL.md`** and repository verification commands.

## Commands summary

```bash
npx tsx .agents/scripts/codemods/list-tsx-without-test.ts
npx tsx .agents/scripts/codemods/write-component-test.ts "<path>"
```

## Notes

- `list-tsx-without-test.ts` lists only `.tsx` files that do **not** have a corresponding `*.test.tsx` or `*.spec.tsx` in the same directory.
- `write-component-test.ts` accepts either full or relative paths.
- Generated tests use distinct mock-prop scenarios so snapshots differ where appropriate.

Orchestrator: **`@.cursor/commands/command-test-snapshot-codemod-bulk.md`**.
