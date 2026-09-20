# Part 4 — SEO and Machine Readability

## On-page SEO (`index.html`)

- Fixed a stale `<meta name="description">` that still referenced the
  already-removed "AI Bot Agent" project.
- Added `<link rel="canonical">`, Open Graph (`og:type`, `og:title`,
  `og:description`, `og:url`, `og:site_name`), and Twitter Card meta tags.
  **No `og:image` was added** — there's no real social-preview image asset
  yet; a placeholder/wrong image would be worse than none. See
  `06-known-issues-and-next-steps.md`.
- Added a `schema.org` **Person** JSON-LD block (name, job title, `url`,
  `sameAs` → LinkedIn/GitHub/Medium/Stack Overflow, `knowsAbout`). Later
  also added to `resume.html` (it originally only existed on the homepage),
  with an added `worksFor` field there.
- Converted the page's structure to be semantically real: `<main>` instead
  of a generic wrapping `<div>`, `<section>` (with proper `id` +
  `aria-labelledby`) for each major block, `<article>` for each project
  card. The `id="featured-projects"` anchor was the direct ask that started
  this — `index.html#featured-projects` now deep-links correctly, and the
  Agent Witch case study's "← Back to Projects" link uses it.

## Whole-site SEO

- **`robots.txt`** and **`sitemap.xml`** added at the repo root — neither
  existed before. The sitemap lists the real pages: `/`, `/resume.html`,
  `/contact.html`, `/guardz-mcp.html`, `/wishees.html`, and later
  `/agent-witch-case-study.html`.

## Machine-readable resume (the "WebMCP" question)

The user asked for something like "WebMCP" — a way for an AI agent to
easily consume the resume. There is no finalized, hostable-on-static-Pages
"WebMCP" standard; a *real* MCP server needs a running backend process to
answer protocol requests, which GitHub Pages (static hosting only) cannot
provide. That would require a genuinely different architecture (a small
serverless function on Vercel/Cloudflare Workers, for example) — a decision
explicitly left to the user rather than half-implemented.

What was built instead, using two established, already-working
conventions that achieve the same practical goal (an agent can get
structured facts without scraping rendered HTML):

- **`resume.json`** — the full work history, education, skills, and
  projects in the [JSON Resume](https://jsonresume.org/) schema
  (`basics`/`work`/`education`/`skills`/`languages`/`projects`). Any tool
  that already speaks this format (many ATS integrations, resume
  generators) can parse it directly. Linked from `resume.html` via
  `<link rel="alternate" type="application/json" href="resume.json">` and a
  visible "JSON" button in the toolbar.
- **`llms.txt`** at the repo root — a plain-text/Markdown summary, key
  facts, and a page index, following the emerging `llms.txt` convention
  that a growing number of sites use specifically to give AI
  agents/crawlers a clean entry point instead of parsing CSS/markup noise.

If a future session wants to go further (build a real MCP server, or add
JSON-LD `ItemList`/`SoftwareApplication` markup per project), that's the
natural next step — see `06-known-issues-and-next-steps.md`.
