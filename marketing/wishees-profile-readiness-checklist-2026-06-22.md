# Wishees Profile Readiness Checklist

Use this when inspecting the already-registered Pinterest, YouTube, and TikTok accounts in Chrome.

Goal: each profile should look credible enough that a creator who checks Wishees after outreach sees a real, consistent presence.

## Universal Checks

- Account name is `Wishees` or clearly starts with `Wishees`.
- Handle is close to `wisheesgrowth` or another Wishees-owned handle.
- Avatar/logo is present and not a blank default.
- Bio explains the product in one sentence.
- Website link points to `https://www.wishees.com/?lang=en` or `https://www.wishees.com/affiliate/program?lang=en`.
- No claim that Wishees pays creators.
- No claim that creators should replace Amazon, LTK, ShopMy, Zola, Babylist, Giftster, Elfster, or MyRegistry.
- If affiliate wording appears, it says creator tags stay theirs and stores/networks pay under their normal rules.

## Pinterest

Known profile:

- https://de.pinterest.com/wisheesgrowth/

### QA Result - 2026-06-22

Status: partially ready for batch 1.

Verified in logged-in Pinterest:

- Profile name: `Wishees`
- Username: `wisheesgrowth`
- Bio: `Wishees helps people create shareable wishlists and discover meaningful gift ideas for birthdays, weddings, holidays, and everyday moments.`
- Website visible: `http://www.wishees.com`
- Profile edit access is available.
- Created content visible: `Birthday wishlist ideas made simple`
- Pin stats at check time: 0 impressions, 0 saves, 0 pin clicks.

Limitation:

- Attempted to save `https://www.wishees.com/?lang=en`; Pinterest reverted to `http://www.wishees.com`.
- Attempted to save `https://www.wishees.com`; Pinterest also reverted to `http://www.wishees.com`.
- Use `https://www.wishees.com/?lang=en` on new pins and descriptions where per-post links are accepted.

Must have:

- Business/profile name: `Wishees`
- Website: `wishees.com`
- Bio:
  `Wishees helps people create shareable wishlists for birthdays, weddings, holidays, family gifts, and creator audiences.`
- Boards visible:
  - Birthday Wishlist Ideas
  - Wedding Gift Ideas
  - Holiday Gift Ideas
  - Gifts for Kids
  - Creator Wishlist Inspiration
- At least 5 pins published or queued.
- First pin already published:
  `https://de.pinterest.com/pin/1082834304184118244/`

Fix if missing:

- Add website link.
- Publish next three pins from `wishees-platform-content-queue-2026-06-22.md`.
- Create a Baby Shower Gift Ideas board if Pinterest content starts leaning that way.

## YouTube

### QA Result - 2026-06-22

Status: verified in Chrome by channel ID; public handle differs from expected `@wisheesgrowth`.

Observed:

- `https://www.youtube.com/` is signed out in the in-app browser.
- Public check for `https://www.youtube.com/@wisheesgrowth` returned `404 Not Found`.
- Chrome public channel check for `https://www.youtube.com/channel/UC5Yp4peJDwgNr_rg5ok2PKg` resolved to `Wishees - YouTube`.
- Visible public handle: `@Wishees-g8e`.
- Public page shows channel name `Wishees`, purple W avatar, empty content state, and creator controls because Chrome is logged in.
- Chrome Studio/content page is reachable and shows an `Upload videos` button.
- Automation cannot click the upload button: JavaScript from Apple Events is off, accessibility search did not expose the button, and coordinate click failed with macOS error `-25200`.

Next:

- Use `https://www.youtube.com/channel/UC5Yp4peJDwgNr_rg5ok2PKg` as the public channel URL unless/until a cleaner handle is configured.
- Manually click `Upload videos` and upload the first MP4, or enable Chrome JavaScript from Apple Events / macOS automation so Codex can control the upload flow.
- Consider changing the handle to a cleaner Wishees-owned handle later if YouTube allows it.

Must have:

- Channel name: `Wishees`
- Current handle: `@Wishees-g8e`; preferred future handle: `@wisheesgrowth` or similar if available.
- Description from the platform content queue.
- Link to `https://www.wishees.com`
- Optional secondary link to `https://www.wishees.com/affiliate/program?lang=en`
- No long empty description; no personal-only wording.

First content to prepare:

- Short 1: Stop guessing birthday gifts.
- Short 2: A simple wishlist next to your registry.
- Short 3: Gift guide readers need wishlists too.

Do not spend time making long videos before Pinterest batch 1 is measured.

## TikTok

### QA Result - 2026-06-22

Status: rebrand approved; manual profile edit needed before posting.

Observed:

- `https://www.tiktok.com/@wisheesgrowth` showed `Couldn't find this account`.
- TikTok is signed out in the in-app browser.
- Chrome profile route resolves to `https://www.tiktok.com/@nguyenphongthiennp?lang=en`.
- Visible account name: `Nguyen Phong Thien`.
- Visible handle: `@nguyenphongthiennp`.
- Profile has personal photo, no bio, 0 following, 0 followers, 40 likes.
- Content area shows `Something went wrong`.
- Codex could read the active Chrome URL, but Chrome JavaScript automation is disabled.
- User approved renaming/changing avatar for Wishees use if needed.
- Avatar file is ready: `wishees-profile-assets/wishees-avatar-purple-w.png`.
- TikTok profile edit controls were not exposed to macOS accessibility automation, so manual edit is needed.

Next:

- Manually edit the profile first:
  - Display name: `Thien from Wishees`
  - Avatar: `wishees-profile-assets/wishees-avatar-purple-w.png`
  - Bio: `Building Wishees: simple shareable wishlists for gift moments.`
- Only after the edited profile is visible, upload the prepared MP4s.

Must have:

- Display name: `Wishees`
- Handle: preferably `@wisheesgrowth` or similar.
- Bio:
  `Simple shareable wishlists for birthdays, weddings, baby showers, holidays, family gifts, and creator audiences.`
- Link to `https://www.wishees.com` if link access is available.
- If links are not available yet, use bio text only and prioritize Pinterest/YouTube links.

First content to prepare:

- Birthday wishlist video.
- Baby shower wishlist video.
- Creator wishlist layer video.

Do not use TikTok DMs as the first outreach channel.

## Pass/Fail

Profile is ready when:

- Name, avatar, bio, and link are present.
- Messaging is consistent with Wishees positioning.
- At least one content item exists or is queued.
- No wrong affiliate economics appear.

Profile is not ready when:

- It looks like an empty account.
- Link is missing where the platform allows it.
- Bio is generic or confusing.
- It implies Wishees pays affiliate commission.
