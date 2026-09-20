# Part 5 — Case Study, Real Numbers, About Me, and the Contact Modal

## Content strategy discussion (before any of this was built)

When asked "what should I do with this page to get real benefit," the
advice given (and then largely acted on) was:

1. Write a real architecture case study, not just feature lists — proves
   the skill instead of asserting it.
2. Put real numbers on the projects instead of vague claims.
3. Keep the resume and the site telling exactly the same story (checked —
   they already matched by this point, nothing needed fixing).
4. Treat this as a distribution problem, not an SEO problem: nobody finds
   this site by searching, they find it *from* LinkedIn/npm/GitHub/Stack
   Overflow — so the link needs to be planted in all of those places (most
   of that needs the user's own login, see part 6).
5. Make "Blog" earn its place by actually cross-linking a real article to a
   real project, instead of being a dead-end generic profile link.

## The Agent Witch case study (`agent-witch-case-study.html`)

Built from the same verified facts established while writing the resume
(see `01-resume.md`'s Agent Witch section) — no new claims invented, just
turned into a readable narrative:

1. **The Problem** — why running agents only in the IDE breaks down for a
   team.
2. **Realtime Bridge & Security** — the AWC/AWL/AWB topology with a simple
   inline SVG box diagram, WebSocket origin allow-listing + HTTPS-only
   upgrade enforcement.
3. **Durable Workflow & Human-in-the-Loop** — the persisted step-graph
   model and the `[[AWAITING_INPUT]]` mid-run pause/resume protocol.
4. **Operational Hardening** — the `ps`-table single-instance process
   supervision and watchdog/self-update LaunchAgents.
5. **Trade-offs I'd call out** — a deliberately honest section: origin
   allow-listing vs. mTLS, `ps`-table matching vs. a lockfile. Real
   architectural self-critique, not marketing copy — this is what makes it
   read as genuine engineering judgment rather than a sales pitch.

Linked from the Agent Witch project card ("Read the Architecture Case
Study") and added to `sitemap.xml`.

## Real usage numbers

Guardz Ecosystem and Structure Validation cards got a `.stat-line` chip
with live-checked numbers, computed carefully so every number is something
a visitor could actually go verify:

- npm weekly downloads pulled from `https://api.npmjs.org/downloads/point/last-week/<pkg>`
  and summed: Guardz (603) + guardz-generator (60) + guardz-axios (6) +
  guardz-event (34) = "700+ weekly npm downloads across 4 packages."
- GitHub stars: **only counted from repos that are actually public** —
  `guardz` (3), `guardz-axios` (1), `guardz-event` (1) = 5. The
  `guardz-generator` repo is private (confirmed via `gh api user/repos`),
  so its star was deliberately excluded from the public claim even though
  it's a real number — a visitor can't verify a private repo's star count,
  so citing it would create an unverifiable claim. This is the same
  "don't assert what you can't back up" principle from the resume work.
- Structure Validation: "50+ weekly npm downloads" (its repo is also
  private, so no star count is shown for it at all).

## About Me + Let's Talk

Went through three iterations based on direct feedback:

1. First pass: a standalone "About Me" section above Featured Projects, and
   a separate "Let's Talk" section with an inline contact form below
   Featured Projects.
2. Feedback: "Let's Talk should be a button in About Me... About Me should
   be a bit more humble, but don't make me too small... clicking Let's Talk
   should show a modal." Result:
   - The About Me paragraph was rewritten to soften assertive phrasing
     (dropped "I care about... prove it, not claim it" and the "lead" title
     emphasis) in favor of "I'm still learning as I go" and "I tinker on" —
     same length, same facts, humbler delivery.
   - The separate Let's Talk section was removed; a "Let's Talk" `<button>`
     now sits inside the About Me card.
   - The contact form (Topic / Message / Your email fields) moved into a
     real modal dialog (`#letsTalkOverlay`) — opens on button click, closes
     on Escape, backdrop click, or the × button, focuses the first field on
     open, and returns focus to the trigger button on close.
3. Final tweak: removed the mention of CHECK24 from the About Me paragraph
   (user request, no reason given — just don't name the employer there).

### Why the contact form uses `mailto:`, not a POST

There's no backend on this static GitHub Pages site to receive a form
submission. The *existing* `contact.html` form already had this exact bug —
it `fetch()`s `http://localhost:3001/api/contact`, which only exists on
whoever's own machine is running `server/contact-server.js` locally, so it
silently fails for every real visitor. The new homepage form was
deliberately built differently: on submit, JS constructs a pre-filled
`mailto:nguyenphongthien@gmail.com?subject=...&body=...` link (topic in the
subject, message + the visitor's typed reply email in the body) and
navigates to it. This actually delivers a message today, via the visitor's
own configured mail client, with no third-party service or backend needed.
The form itself says so explicitly ("This opens your own email client...
nothing is collected or sent from this page itself") — don't remove that
line, it's there so nobody assumes it's silently logging submissions
somewhere.

`contact.html`'s form was **not** fixed to match — it's a separate,
pre-existing bug that was noticed but is out of scope unless asked for
directly. See `06-known-issues-and-next-steps.md`.
