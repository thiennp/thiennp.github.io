# Wishees Growth Loop - 2026-06-22

Goal: bring qualified creators to Wishees so they join or apply at `/affiliate/program`, save their own marketplace affiliate tags, share wishlists, and earn through their own affiliate accounts.

## Current State

- Registered/open accounts known from the user: TikTok, YouTube, Pinterest.
- No new platform registration needed yet.
- Recommended active channel: Pinterest discovery -> creator blog/email.
- Outreach must not happen through Pinterest DMs.
- Primary KPI: affiliate tags saved, not account signups alone.
- Platform content queue created: `wishees-platform-content-queue-2026-06-22.md`.
- Profile readiness checklist created: `wishees-profile-readiness-checklist-2026-06-22.md`.
- Posting tracker created: `wishees-posting-tracker-2026-06-22.csv`.
- Chrome publishing runbook created: `wishees-chrome-publishing-runbook-2026-06-22.md`.
- Outreach approval packet created: `wishees-outreach-approval-packet-2026-06-22.md`.
- Execution index created: `wishees-growth-execution-index-2026-06-22.md`.
- Run state created: `wishees-growth-run-state-2026-06-22.json`.

## Wishees Demo Assets Created

Created in the `growth@wishees.com` Wishees account:

- Sample kids birthday wishlist: `https://www.wishees.com/friends/16686?wish=wish_207a971307904240&lang=en`
- Sample wedding wishlist - registry supplement: `https://www.wishees.com/friends/16686?wish=wish_d830f899ce184bfb&lang=en`
- Sample baby shower wishlist: `https://www.wishees.com/friends/16686?wish=wish_3726747bd4ed43d7&lang=en`
- Account/profile invite link: `https://www.wishees.com/friends/16686`

## Product Friction Seen While Creating Demo Wishes

- The post-save dialog shows two duplicate `Add another` buttons.
- The share modal says `I added this wish on Wishees...`, which is too self-oriented for creator demo assets.
- The `/me` page only shows the first few wishes; `/my-wishees` was needed to verify the baby shower sample.
- The wish wizard can be completed without a support amount, which is fine, but the flow feels long for a demo wish.
- Public campaign links need explicit `lang=en`; without it, unauthenticated visitors in this environment saw German copy.
- Public wish links show a preview and ask visitors to sign in/register before the full wishlist is connected. Use them as demo/invite links, not as frictionless landing pages.
- Public social posts now use the English homepage for broad gift-moment traffic and the English affiliate page for creator traffic.

## Channel Execution Rule

Run one discovery source at a time:

1. Pinterest search.
2. Open a pin that links to a real blog/site.
3. Qualify the blog, not the Pinterest profile.
4. Find a contact path: contact form, media kit, work-with-me page, or professional email.
5. Draft first outreach.
6. Human approves first five messages.
7. Send max 10 personalized contacts in batch 1.
8. Measure replies, joined/applied, and tags saved.
9. Scale, iterate, or pivot.

## Messaging Rule

Use:

> Wishees is a simple shareable wishlist for gift moments where your readers need an easy list. Your own marketplace affiliate tags stay yours, and stores/networks pay you under their normal rules.

Avoid:

> Switch from your current wishlist, registry, storefront, or affiliate tool.

## Next Actions

1. In Chrome, inspect TikTok, YouTube, and Pinterest profiles using `wishees-profile-readiness-checklist-2026-06-22.md`.
2. Publish or queue ready content using `wishees-chrome-publishing-runbook-2026-06-22.md`.
3. Paste published URLs into `wishees-posting-tracker-2026-06-22.csv`.
4. Keep Pinterest as the first active discovery channel.
5. Get human review for the first 5 personalized outreach messages in `wishees-outreach-approval-packet-2026-06-22.md`.
6. Send from a real Wishees inbox or approved growth console flow only after review.
7. Measure replies, joined/applied, and affiliate tags saved.

## First Batch Status

- Demo assets: 3 public demo wish links created.
- Daily run sheet: `wishees-growth-daily-run-sheet-2026-06-22.md` created as the operator entry point.
- Current report: `wishees-growth-current-report-2026-06-22.md` created with worked/blocked/ready/next-action summary.
- Measurement guide and ledger created: `wishees-growth-measurement-guide-2026-06-22.md`, `wishees-growth-measurement-ledger-2026-06-22.csv`.
- Outreach follow-up template created: `wishees-outreach-follow-up-template-2026-06-22.md`.
- Leads discovered: 20 starter rows created.
- Platform content: Pinterest/YouTube/TikTok first queue drafted.
- Pinterest assets: 4 upload-ready PNGs generated in `marketing/wishees-pin-assets/`.
- YouTube/TikTok assets: 4 vertical PNGs generated in `marketing/wishees-video-assets/`.
- Upload-ready video assets: 4 verified 1080x1920 MP4s generated in `marketing/wishees-upload-ready/`.
- Posting tracker: planned posts and metric columns created; CSV structure validated at 13 columns per row.
- Publishing runbook: Chrome upload steps and copy updated to use MP4 upload files for TikTok and YouTube Shorts.
- Profile QA: Pinterest inspected in logged-in browser. Name, username, bio, and first pin are visible. Pinterest reverted attempted HTTPS website saves back to `http://www.wishees.com`, so use English HTTPS links in individual pins/descriptions.
- YouTube/TikTok QA: YouTube is signed out in the in-app browser and `https://www.youtube.com/@wisheesgrowth` returns 404, but Chrome public channel check verifies `https://www.youtube.com/channel/UC5Yp4peJDwgNr_rg5ok2PKg` as Wishees with visible handle `@Wishees-g8e`. TikTok is signed out in the in-app browser and `https://www.tiktok.com/@wisheesgrowth` shows the account cannot be found; use logged-in Chrome for TikTok.
- Chrome TikTok check: Chrome is logged into TikTok Studio and is currently on the upload page at `https://www.tiktok.com/tiktokstudio/upload?from=webapp&tab=video`. The page shows `Select video to upload`. Codex can navigate Chrome by URL, but cannot click/upload yet because Chrome JavaScript automation is disabled and macOS denied assistive UI clicks for `osascript`.
- TikTok profile fit check: Chrome profile route resolves to `https://www.tiktok.com/@nguyenphongthiennp?lang=en`, visible as personal account `Nguyen Phong Thien` / `@nguyenphongthiennp`, with no bio and 0 followers. Do not publish Wishees brand content from it unless the user explicitly approves personal-account use or rebrands it.
- TikTok rebrand approval: user approved renaming/changing avatar for Wishees use. Avatar created at `marketing/wishees-profile-assets/wishees-avatar-purple-w.png`; manual profile edit is needed because TikTok edit controls are not exposed to automation.
- Chrome YouTube check: Chrome now has a logged-in YouTube Studio channel content page. It shows Wishees, no content available, and an `Upload videos` button. Publishing is now blocked only by manual file selection / disabled Chrome automation.
- TikTok discovery seed: Chrome is on `birthday wish` search and visibly shows useful related terms: `birthday wishlist`, `birthday wishes`, `Birthday wish ideas`, `birthday wishes for friend`, and `birthday wishlist ideas`. This can guide TikTok content hooks even before upload automation is unlocked.
- TikTok upload asset: first birthday MP4 generated at `marketing/wishees-upload-ready/wishees-tiktok-birthday-wishlist-2026-06-22.mp4`. Use caption: `Gift guessing is optional now. Make a simple birthday wishlist and share one link.`
- Pinterest Pin 2 draft: board, title, description, and destination link prepared in Pinterest pin builder. Publishing is blocked only by image upload because the in-app browser runtime cannot attach the local PNG to Pinterest's file input.
- Outreach drafts: first 5 personalized messages and approval packet ready for user review.
- Outreach data QA: `wishees-us-pinterest-leads-2026-06-22.csv` validated at 20 leads and 20 columns per row; `wishees-posting-tracker-2026-06-22.csv` validated at 13 columns per row.
- Outreach path QA: first 5 contact paths verified on 2026-06-22. Leap of Faith Crafting, Fresh Mommy Blog, Mikkel Paige, and Lovely Lucky Life have direct email paths recorded; Marryza has a reachable contact form. Approval packet now includes send-path notes and friction warnings.
- Outreach batch 2 prep: contacts 6-10 verified and drafted in `wishees-outreach-approval-packet-batch-2-2026-06-22.md`. Use only after batch 1 is approved or intentionally skipped.
- Outreach sent: 0.
- Replies: 0.
- Joined/applied: 0.
- Affiliate tags saved: 0.
