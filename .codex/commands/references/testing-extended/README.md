# Extended testing references

Policy, CI gates, and mock strategy boundaries live in **`rules-bundle-testing.mdc`**.

Use these files for **patterns and drills** after that bundle. Entry skill: **`@.cursor/skills/skill-testing-extended-patterns/SKILL.md`**.

| File                              | Use when                                                          |
| --------------------------------- | ----------------------------------------------------------------- |
| **`mock-and-import-patterns.md`** | `vi.mock`, partial modules, dynamic imports, dependency isolation |
| **`global-browser-mocking.md`**   | `setGlobal` / `getGlobal`, storage mocks, cleanup                 |
| **`failure-resolution.md`**       | Expectation mismatches, import shape issues, flaky globals        |
| **`utility-coverage.md`**         | Utility modules, branch focus, Sonar-style new-code coverage      |
