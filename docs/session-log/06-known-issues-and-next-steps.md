# Part 6 — Known Issues and Next Steps

## Real bugs noticed but not fixed (out of scope at the time)

- **`contact.html`'s form is broken for every real visitor.** It `fetch()`s
  `http://localhost:3001/api/contact`, which only exists when someone is
  running `server/contact-server.js` locally. The homepage's new "Let's
  Talk" modal (see `05-homepage-ux-and-contact.md`) deliberately avoids this
  by using a `mailto:` link instead. `contact.html` itself was never
  updated to match — worth doing the same fix there, or replacing its form
  with a link to the homepage modal.
- **`guardz-mcp.html`'s type-guard generator is fully client-side** (no real
  backend call despite `server/server.js` existing to serve a similar API)
  — this is fine, it works as a demo, just noting it's not actually wired to
  the Guardz codebase's real generator logic.

## Suggested but not done (needs the user's own action)

These all came up in the "how do I get real benefit from this page"
discussion (see `05-homepage-ux-and-contact.md`) and need Thien's own
login/account, not something an agent can do unilaterally:

- Add the site link to LinkedIn's **Featured** section.
- Add the site URL to the **Stack Overflow** profile's website field.
- Add the site link to the **Guardz** npm package README and its GitHub
  repo description.
- Publish a real Medium article (e.g., a version of the Agent Witch case
  study) and cross-link it from the site's "Blog" nav item and the Agent
  Witch card — right now "Blog" just points at the generic Medium profile.
- If there's a GitHub profile README repo (`github.com/thiennp/thiennp`) —
  checked, **it does not exist yet**. Creating one and linking the site
  from it would be another easy distribution win.

## Design/content gaps still open

- **No `og:image`.** Social shares of any page currently show no preview
  image. A simple branded card (name + title on the site's warm-paper
  background) would materially improve how shared links look on
  LinkedIn/Slack/Twitter.
- **Font loading is render-blocking.** Google Fonts (Fraunces/Inter/IBM
  Plex Mono) load via a blocking `<link>`. Self-hosting them (or at minimum
  confirming `&display=swap` is doing its job) would help Core Web Vitals.
- **Only one case study exists** (Agent Witch). Guardz and the CHECK24
  AI-native SDLC work are both strong candidates for the same treatment —
  real narrative + honest trade-offs, not a feature list. This is probably
  the single highest-leverage thing to do next, per the earlier content
  strategy discussion.
- **No analytics.** There's currently no way to know whether any of this
  SEO/distribution work is landing traffic. A privacy-friendly option
  (Plausible, Fathom, or GitHub's own traffic insights under the repo's
  Insights tab) would close the loop.
- **`resume.json` and `llms.txt` were written once and not automated.** If
  the resume or project list changes again, both files need to be updated
  by hand to stay in sync with `resume.html`/`index.html`. Worth a mention
  if this drifts.

## A note on the local machine

`automation-report/` (deleted from the repo — see
`02-cleanup-and-security.md`) had a `launchd` plist
(`com.thiennp.automation-report.plist`) that may still be loaded on this
Mac via `launchctl`, independent of the repo. Deleting the repo file does
**not** unload it. If the local dashboard/watchdog process is still
running, that's a local machine cleanup step (`launchctl unload
~/Library/LaunchAgents/com.thiennp.automation-report.plist` or similar),
not something committed to git.

## If you're a future Claude session picking this up

Read `README.md` in this folder first, then whichever numbered part is
relevant to what you're asked to do. The GitHub auth quirk (switching
between `thien-infusion` and `thiennp`) is real and will bite you on the
first `git push` if you don't `gh auth switch --hostname github.com --user
thiennp` first — see the root `README.md` in this folder.
