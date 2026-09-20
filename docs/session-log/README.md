# Session Log: Resume + thiennp.github.io Overhaul

This folder documents one long Claude Code chat session (started from the
`infusiontv` project, working cross-repo into `thiennp.github.io`) that took
Thien's resume from a LaTeX file to a full, verified, redesigned personal
site. It exists so a future session (human or agent) can pick up context
without re-deriving everything from git history alone.

**Not linked from the public site nav** — this is internal continuity
documentation, not portfolio content.

## Read order

1. [`01-resume.md`](01-resume.md) — the resume artifact: design system, content
   verification, pagination fixes, hosting
2. [`02-cleanup-and-security.md`](02-cleanup-and-security.md) — the big
   dead-content removal + Dependabot security fix pass
3. [`03-redesign-and-content.md`](03-redesign-and-content.md) — shared
   `site.css`, official icons, per-project content accuracy fixes
4. [`04-seo-and-machine-readability.md`](04-seo-and-machine-readability.md) —
   structured data, sitemap/robots, `resume.json`, `llms.txt`
5. [`05-homepage-ux-and-contact.md`](05-homepage-ux-and-contact.md) — Agent
   Witch case study, real usage numbers, About Me, the Let's Talk modal
6. [`06-known-issues-and-next-steps.md`](06-known-issues-and-next-steps.md) —
   what's still open, what was suggested but not done, and why

## The one rule that shaped everything

Every factual claim on the resume and the site was checked against the
actual source (the `daily-magic` repo for Agent Witch, the `chords` repo for
Wishees, npm/GitHub APIs for download counts and star counts, live favicons
for icons) before being written down. Several claims that couldn't be
verified were removed or corrected rather than left in place — see
`01-resume.md` for the specific example (an unverifiable "MicroVM Sandboxing"
skill claim) and `03-redesign-and-content.md` for the Wishees description
rewrite. If you're continuing this work, keep that standard: don't add a
claim about a project without reading its actual code or a live, checkable
source first.

## Repo/account quirk worth knowing

This machine has two GitHub accounts configured (`thien-infusion` and
`thiennp`). The `thiennp.github.io` repo is owned by `thiennp`, but `gh`'s
active account kept reverting to `thien-infusion` between shell invocations
in this session (cause not fully diagnosed — possibly per-process `gh`
config not persisting). Before every push, this was required:

```bash
gh auth switch --hostname github.com --user thiennp
git push origin master
```

If a push fails with `Permission ... denied to thien-infusion`, that's why.
