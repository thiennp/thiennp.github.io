# Part 1 — The Resume

## Starting point

Thien provided an existing LaTeX resume (the classic "Jake's Resume"
template) with his real work history. The request evolved over the session
from "design a professional resume" into a fully verified, printable,
web-hosted resume with a matching design system that later became the basis
for the whole site redesign.

## Design system (defined here, reused everywhere later)

Established in the resume and later extracted into `styles/site.css` for the
rest of the site:

- **Palette**: warm-paper light theme (`--paper: #faf8f4`, `--ink: #1c1e22`,
  `--accent: #2f4a52` deep teal) with a full dark-mode equivalent via
  `prefers-color-scheme` + `data-theme` override blocks.
- **Type**: "Fraunces" (serif, headings/name), "Inter" (sans, body), "IBM
  Plex Mono" (uppercase uppercase section labels, dates, stat lines).
- **Components**: pill-shaped tag badges (`.pill`), card sections
  (`.entry`/`.card`), mono-label section headers with a bottom rule.

## Content decisions worth remembering

- **Chronological compression**: pre-Wagawin roles (Fiverr, Assignar, Open
  Digital, Viet Wedding Invitation, Kim Tuoc Software, VMG/Lam Tung Photo
  Lab) were condensed into single-line "Earlier Experience" entries to keep
  the resume to a reasonable length for a senior/architect-level
  application, while keeping every role's real title and dates.
- **Job title corrections** (from user feedback, one at a time): Fiverr role
  is Full-Stack, not just Front-End; Open Digital Ltd title is "Front-End
  Team Manager / Project Manager"; Viet Wedding Invitation co-founder role is
  Full-Stack; VMG/Lam Tung is "Graphic Designer & Game Developer / Photo
  Editor".
- **Guardz Ecosystem verified against npm**: read the actual npm page for
  `guardz` to confirm the description, then found (via `npm search`) that
  it's a real multi-package ecosystem — `guardz-generator`, `guardz-axios`,
  `guardz-event`, `structure-validation`, `guardz-generator-mcp` — and
  rewrote the resume entry to say "ecosystem" honestly instead of just
  listing the one package.
- **Agent Witch verified against the actual `daily-magic` repo** (Thien's
  local checkout of the Agent Witch source). Key finding: the original resume
  draft claimed "host-level execution sandboxing... automatic zombie-process
  termination (SIGKILL on timeout)... strict path containment." None of that
  held up:
  - The code uses `SIGTERM`, not `SIGKILL`, and only for killing a stale
    duplicate client process (`terminateOtherAgentWitchClientProcesses.ts`),
    not for a task-timeout/zombie-cleanup mechanism.
  - No path-containment/traversal-prevention logic was found anywhere in the
    repo.
  - What *is* real and was substituted in: HTTPS-only WebSocket upgrades
    (`isSecureAgentWitchUpgrade`), origin allow-listing
    (`isAllowedAgentWitchOrigin`), and the single-instance process
    supervision via `ps`-table scanning + `SIGTERM`.
  - This same investigation is the source for the later Agent Witch case
    study page (see `05-homepage-ux-and-contact.md`).
- **Wishees verified against the `chords` repo** (the actual source of
  wishees.com, confirmed live via `gh repo view` and its README). The
  original assumption (a "wishing wall" app) was wrong for the *current*
  product — the real README describes a free wishlist/friends social network
  with a local-first data model syncing to Neon Postgres. Corrected
  everywhere it appeared (resume, later the site).
- **A skill claim was flagged and left to the user's judgment, not silently
  removed or silently kept**: "MicroVM Sandboxing" appeared in the original
  skills list but had no supporting evidence in any verified codebase. Rather
  than deleting it unilaterally (it might be true from work outside what was
  checked) or leaving it risky for an interview, it was surfaced explicitly:
  *"I can't verify this — do you have real work backing it, or should I drop
  it?"* This is the pattern to repeat: flag unverifiable claims, don't
  silently resolve them either way.

## Formatting/print engineering

- Resume needed to work as a real, printable PDF (for HR to download), not
  just a webpage. Print CSS was iterated multiple times:
  - Fixed page-break rules so multi-bullet role entries can break *between*
    bullets across a page boundary (never mid-bullet-text, never right after
    a role's heading) instead of forcing the whole block to the next page —
    this fixed a specific bug where page 2 was ending ~40% empty because a
    5-bullet CHECK24 entry didn't fit the remaining space and jumped whole.
  - PDF exports were generated with headless Chrome
    (`--headless --print-to-pdf`) and visually spot-checked by rendering
    each page to PNG with PyMuPDF (`pip install pymupdf` in a throwaway
    venv) — this is the repeatable way to verify pagination without a human
    opening the PDF.
- Every linked project title (Agent Witch, Guardz) also shows its plain URL
  in small mono text next to the name, specifically because a printed PDF
  loses hyperlinks — the URL needs to be readable on paper.

## Hosting

The resume was eventually published two ways:
1. As a **Claude Artifact** (interactive web page) — this is the artifact
   the user has now asked to be deleted, since the content is duplicated at
   thiennp.github.io/resume.html and that's meant to be the single source of
   truth going forward.
2. As **`resume.html`** in this repo, replacing a much older, generic
   full-site-nav-style placeholder resume that was already sitting at that
   path. GitHub Pages (no Jekyll, `.nojekyll` present) resolves the
   extensionless URL `/resume` to `/resume.html` automatically — confirmed
   this works, no `resume/index.html` folder needed.

Later in the session, `resume.html` also got: a "Download PDF" button (the
actual generated PDF, `Thien_Nguyen_Resume.pdf`, committed to the repo root)
as the primary action, with "Print / Save as PDF" and a "JSON" (structured
data) link as secondary actions — see `04-seo-and-machine-readability.md`
for `resume.json`.
