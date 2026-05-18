# Generate Snapshot Tests for All Components

INSTRUCTIONS:
When you see this prompt with "do it" or ".", you should:

1. **List all .tsx components without existing tests**
   - Run: `npx tsx .cursor/scripts/codemods/list-tsx-without-test.ts`
   - Capture the full output (one absolute path per line).

2. **For each path in the output**
   - Run: `npx tsx .cursor/scripts/codemods/write-component-test.ts <path>`
   - Use the exact path from the list (full path or path relative to repo root).
   - Each run creates or overwrites `<ComponentName>.test.tsx` in the same directory with snapshot tests (one test per mock prop scenario).

3. **Scope**
   - Process every line from step 1; do not skip components unless the script fails for that path (then continue with the next).
   - Optionally report progress (e.g. N/M done) and any paths that errored.

## Commands Summary

Follow the **`component-snapshot-tests-codemod`** project skill (**`.cursor/skills/component-snapshot-tests-codemod/SKILL.md`**) for the exact **`npx tsx`** invocations.

## Notes

- `list-tsx-without-test.ts` lists only `.tsx` files that do **not** have a corresponding `*.test.tsx` or `*.spec.tsx` in the same directory. It outputs full paths.
- `write-component-test.ts` accepts either full or relative paths.
- Each generated test file includes one `it(...)` per mock scenario (from `generateMockPropScenarios`). Scenarios use distinct prop values so snapshots differ (per-prop variation, deduplicated).
