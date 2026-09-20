# Part 2 — Cleanup and Security

## Why this happened

Once the resume was live, the user asked to redesign the whole site — which
meant first understanding what was actually on it. A survey turned up a
repo that mixed a personal portfolio with a lot of unrelated internal
automation tooling, several dead pages, and 18 open GitHub Dependabot
alerts (6 critical, 4 high, 8 moderate). This work was done in **Plan
Mode** (explored first, wrote a plan file, got explicit approval) because of
its size and because it touched a live public repo.

## What got removed, and why

| Removed | Reason |
|---|---|
| `blog.html`, `blogs/` | User wanted the "Blog" nav item to link directly to the real Medium profile instead of a local blog page |
| `earning-hub.html` + its whole satellite cluster (`earning-operating-plan.html`, `paid-user-testing-platforms.html`, `ai-evaluator-kit.html`, `ai-evaluator-platforms.html`, `user-testing-practice-kit.html`, `bug-report-template-pack.html`, `qa-review-service.html`) and `assets/downloads/*` | Old side-income/content-marketing experiment, no longer wanted public. Confirmed via `grep` that nothing outside this cluster linked to any of these pages before deleting. |
| Nav links "Automations" (→ `codex-automations/`) and "Skills" (→ `agents/.codex/skills/`) | Both targets have no `index.html`, so they 404'd on GitHub Pages — literally "the broken URL" the user asked to fix. The underlying folders (real, still-used personal automation tooling) were **not** deleted, only the dead public links to them. |
| `automation-report/` (a whole internal Next.js dashboard) + its `report/` static export + `.github/workflows/deploy.yml` | This was the actual source of the **critical** Dependabot alerts (Next.js Image Optimization RCE, sharp libheif CVEs). Investigated first: confirmed it wasn't part of the deployed public site (GitHub Pages serves from the branch root directly; this was a separate CI job that built its own `report/` export and ran `npm audit`), confirmed via `.github/workflows/deploy.yml` that it was the only thing gating that CI check. Deleted rather than patched — user's explicit choice between two offered options ("delete entirely" vs "patch in place"), since the code wasn't otherwise used. Also removed a second workflow (`automation-report-ingest.yml`) that was discovered afterward — it only existed to run a script inside the now-deleted `automation-report/`, so it would have started failing on its own dispatch trigger. |
| `codex-automations/hourly-bitbucket-dependency-pr-cleanup/report-app/` only (not the rest of `codex-automations/`) | Confirmed orphaned — not referenced by that automation's own `automation.toml` or scripts, and pinned to a vulnerable Next.js version. The five *sibling* automation folders under `codex-automations/` are real, active, personal tooling and were left untouched. |
| The "🎸 ChordFlow" project card on `index.html` | Superseded by Wishees — `chords` was the old name/repo before the Wishees rebrand (confirmed via `git log` in the `chords` repo: `rebrand: Wishees name, package, and clickable logo`, `Replace chords app with Wishees`, dated 2026-04-23). |
| "🤖 AI Bot Agent" project + its page | User request, no reason given beyond wanting Agent Witch featured instead — swapped one for the other directly. |

## What got fixed instead of removed

`server/` (a local-dev-only backend for the contact form and a Guardz API
proxy — confirmed via investigation that it's not deployed or CI-wired,
just used for local testing) had real vulnerable dependencies:

- `nodemailer` `^9.0.3` → bumped to `^9.1.1` (direct dependency)
- `qs`, `js-yaml`, `@humanfs/node` → added as explicit `overrides` entries
  pinned to their first-patched versions (`6.16.0`, `4.3.2`, `0.16.8`),
  following the same `overrides` pattern the repo already used for
  `glob`/`lodash`

Exact patched versions were pulled from the live GitHub Dependabot alert
data (`gh api repos/.../dependabot/alerts`) rather than guessed — each
alert's `security_vulnerability.first_patched_version` field gives the exact
number. After `npm install` + `npm audit` in `server/`: **0 vulnerabilities**.

## Verifying the fix actually worked

After both rounds of changes: `gh api repos/thiennp/thiennp.github.io/dependabot/alerts`
went from 18 open alerts to **0 open alerts**. This is worth re-running
if dependencies are touched again later:

```bash
gh auth switch --hostname github.com --user thiennp
gh api repos/thiennp/thiennp.github.io/dependabot/alerts --paginate \
  --jq '[.[] | select(.state=="open")] | length'
```

## A caution for next time

Before deleting anything in this repo, the actual approach used was:
`grep`/`find` across the whole tree for references to the path first, then
delete. This caught the `automation-report-ingest.yml` workflow that would
otherwise have been left silently broken (it referenced a script inside
`automation-report/` that had already been deleted in an earlier commit).
Always re-run a repo-wide reference search *after* a deletion pass, not just
before it, since one deletion can orphan something else.
