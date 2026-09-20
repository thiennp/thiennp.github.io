# Part 3 — Redesign and Content Accuracy

## Shared design system

Before this pass, every page on the site (`index.html`, `contact.html`,
`guardz-mcp.html`, the now-removed `ai-bot-agent.html`) had its own
copy-pasted `<style>` block — no shared tokens, generic system fonts,
purple-gradient buttons, no dark mode. A single `styles/site.css` was
extracted from the resume's design system (see `01-resume.md`) and linked
from every page instead. Kept out of scope on purpose: **`wishees.html`
keeps its own dark/purple product branding entirely untouched** — it's a
real, independently-branded product page with heavy canvas/drag JS, and the
user explicitly chose (via an `AskUserQuestion` prompt) to only unify the
site chrome, not restyle the product itself. Its own logo already links back
to `index.html`, so no changes were needed there at all.

Reusable components defined in `site.css`: `.site-nav`, `.hero`,
`.section-title` (mono uppercase label + rule), `.card`/`.card-title`
(project cards, later `<article>` elements), `.pill`/`.pills`, `.btn`/
`.btn-secondary`, `.form-group` (shared by the contact form and the later
homepage chat modal), `.stat-line` (real-numbers chip), `.modal-overlay`/
`.modal` (the Let's Talk dialog).

## Icon pass — "find and replace all icons"

Generic emoji (💫 🛡️ 🧙 📁) were replaced project-by-project:

- **Wishees** and **Agent Witch**: fetched each product's *real* favicon
  directly from its live site (`curl https://www.wishees.com/icon.svg` and
  `https://www.agentwitch.com/icon.svg`, discovered via
  `document.querySelectorAll('link[rel*="icon"]')` in the browser first),
  saved to `assets/icons/`, referenced as `<img class="card-icon">`. These
  are the actual brand marks, not lookalikes.
- **Guardz Ecosystem** and **Structure Validation**: neither has a
  meaningful site favicon, so custom minimal line-art SVGs were drawn
  instead (a shield-with-checkmark for Guardz, a simple three-node
  hierarchy/tree diagram for Structure Validation) — safe, simple
  geometry, not an attempt at a fake brand logo.
- **Contact page icons** (Email, LinkedIn, Medium, GitHub, Stack Overflow):
  the brand icons (LinkedIn/Medium/GitHub/Stack Overflow) were pulled as
  exact official SVG path data from **Simple Icons** (the standard
  MIT-licensed source for this exact purpose — accurate, single-path,
  monochrome brand marks) via jsdelivr CDN, not hand-drawn from memory.
  Email got a real solid Font Awesome envelope glyph, not a brand logo
  (deliberately — the user distinguished "redesign email" from "use
  official icon for others"). All contact icons render in a neutral tone at
  rest and transition to that brand's real color on hover (LinkedIn blue,
  Stack Overflow orange, GitHub/Medium to the ink token so they stay
  theme-adaptive).
- General principle applied: **never hand-author brand logo path data from
  memory** — fetch it from the actual source or a recognized icon library.
  A hand-drawn approximation of a trademarked logo is both a legal risk and
  usually visibly wrong in the details.

## Content accuracy fixes on the site itself

- **Wishees.com card**: rewritten from the actual `chords` repo README
  (the real current product — free wishlist/friends social network,
  local-first data model, Next.js/React/Neon Postgres) — the old
  description on this page (before this session touched it) was about an
  unrelated "wishing wall / ecard generator" concept that doesn't match
  what's actually live at wishees.com today. The card's CTA was also
  repointed from the local (outdated) `wishees.html` prototype to the real
  `https://www.wishees.com/`.
- **Contact links became single clickable cards** instead of a card row
  plus a separate row of duplicate buttons below — click anywhere on the
  "LinkedIn" row, not just a button.
- Added a **Stack Overflow** entry to Contact
  (`https://stackoverflow.com/users/7017861/nguyen-phong-thien`), requested
  directly by the user, not previously on the site.

## Reordering

Final Featured Projects order (per direct user request): **Agent Witch,
Guardz Ecosystem, Wishees.com, Structure Validation** — leads with the most
AI/agentic-relevant project first, matching the direction of the resume
work happening in parallel (see `01-resume.md`).
