# Utility test coverage

See **`rules-bundle-testing.mdc`** for authoritative gates (100% new/changed lines and conditions on touched files).

## Focus

- Target branches and guards that encode business decisions; unreachable lines deserve deletion, not speculative tests.
- Cover negative paths, validation failures, and timeouts—not only happy paths.
- Use coverage output to find **clusters** of risk in the files you modified, not to chase repository-wide vanity percentages.

## Structure

- Co-locate **`utilityName.test.ts`** beside **`utilityName.ts`**.
- Name cases after behaviors (“returns empty string when undefined”) not after implementation (“calls helper X”).
- For utilities reaching **`document`**, explicitly cover the SSR branch where **`document`** is absent when applicable.

## Assertions

- Prefer equality on concrete outputs over snapshotting tiny pure helpers unless output is large/stable text.
- When utilities compose formatters, **`vi.spyOn`** on the boundary formatter is acceptable; avoid spying on every internal step.

## Related

- Snapshot + DOM guidance for UI: **`rules-bundle-react.mdc`**
- Folder boundaries for constants/maps: **`rules-typescript-clean-code.mdc`**
