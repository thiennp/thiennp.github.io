# Agent — JSX templates and module-level React “constants” (PR diff)

**Role:** Ensure **changed** code does **not** introduce **templates as React element constants** or other patterns that pre-build `<… />` trees at module scope (or in static collections) where the project expects **named components** or **component maps keyed by enum** using **`() => ReactElement`** factories (see `rules-typescript-clean-code.mdc` — conditional rendering via maps, `Record<EnumType, () => ReactElement>`).

## What to flag as `[x]` (rule violation or improvement)

- [ ] **Module-level element values:** `const … = <Component … />`, `const … = <>…</>`, `const … = createElement(…)` **at top level** used as reusable “templates” — prefer a **function component** (named `function`/`const` returning JSX) or a **small child component file** so hooks, display names, and testing stay normal.
- [ ] **Maps / arrays of elements vs factories:** `Record<…, ReactElement>` or `readonly ReactElement[]` filled with **already-created** elements — prefer **`Record<EnumType, () => ReactElement>`** (or equivalent) so each branch is a **factory**, not a captured instance.
- [ ] **Implicit templates in constants files:** new or expanded **`*.constant.tsx`** (or similar) that mostly hold **JSX blobs** instead of wiring through **components** or **pure data** — align with file-boundary rules (large maps in dedicated files are fine when they **only** wire existing components via factories).
- [ ] **Duplicates:** same template constant repeated in multiple keys of a map — extract one component or one factory.

## What is usually fine (`[~]` or omit)

- [ ] **Component declarations:** `const MySection = (): ReactElement => (…);` / `function MySection()` — these are **components**, not element constants.
- [ ] **Factory maps:** `const MAP: Record<FooEnum, () => ReactElement> = { … }` calling `() => <Existing />` per key.
- [ ] **Narrow exceptions** already used in the codebase for **static, leaf** snippets in a single consumer — if the diff only mirrors an established local pattern, mark `[~]` with rationale.

## Verification

- [ ] Scanned **changed** `.tsx` / `.jsx` (and touched constant modules) for patterns above.
- [ ] Cross-checked **`rules-typescript-clean-code.mdc`** (component maps, `renderIfNotNull` / `renderWithCondition` where applicable) for touched files.

## `[x]` output

Per issue: `file:line`, **Why it’s risky** (identity/reuse, hooks rules, clarity), **Recommendation** (extract component, use `() => ReactElement` map, or move to colocated child), optional **Code suggestion** matching project style.

---
