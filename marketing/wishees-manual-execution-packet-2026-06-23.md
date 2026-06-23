# Wishees Manual Execution Packet - 2026-06-23

Purpose: finish the next growth-loop action when browser automation cannot attach files or render the creator UI.

Do not send outreach batch 2 from this packet.

## Current Decision

The next useful action is one low-risk channel test:

1. Publish Facebook Post 2 as a Vietnamese-first baby-shower Reel.
2. If Facebook upload is unavailable, publish Pinterest Pin 6 if Pinterest upload is available in Chrome.
3. If Pinterest is still blocked, publish TikTok Video 2 if TikTok Studio upload is available.

Keep outreach paused until one of these happens:

- creator reply
- affiliate application
- saved affiliate tag
- meaningful click/comment signal
- 2026-06-27 follow-up decision point

Reason for the Facebook-first change:

- Facebook Reel 1 is the only channel with meaningful public awareness so far: latest public check shows `6.5K` plus visible counters `12` and `60`.
- Wishees-owned conversion has not moved yet, so the next post should test whether a second Vietnamese-first Facebook post can turn awareness into link opens, registrations, wishes, or affiliate requests.
- Pinterest, TikTok, and YouTube all currently have file/control automation blockers, so keep them as manual fallbacks.

## Option A - Facebook Post 2

Use this first.

### Asset

`/Users/thien.nguyen/thiennp.github.io/marketing/wishees-upload-ready/wishees-photo-short-baby-shower-2026-06-22.mp4`

### Destination

`https://www.wishees.com/?lang=vi`

### Surface

`https://www.facebook.com/wisheescom/`

### Caption

```text
Baby shower dễ hơn khi mọi món cần thiết nằm trong một wishlist: tã, sách, khăn, đồ sơ sinh và những món giúp bố mẹ mới.

Baby shower wishlist made easy.

Tạo wishlist tại https://www.wishees.com/?lang=vi
```

### Publish Settings

- Audience: public / everyone
- Do not boost
- Keep Vietnamese first
- Do not delete old Facebook photos unless permanent deletion is approved

### After Publishing

1. Copy the live Facebook post or Reel URL.
2. Open the public URL immediately.
3. Confirm the CTA link is visible or reachable.
4. Record immediate visible views/reactions/comments/shares if Facebook shows them.
5. Update `wishees-posting-tracker-2026-06-22.csv` row `Facebook Post 2`.
6. Update `wishees-growth-run-state-2026-06-22.json`.
7. Recheck Wishees growth dashboard for current-week link opens, connections, gift reservations, product clicks, affiliate requests, and creator replies.

### Known Cleanup Limitation

The Facebook page identity, link, and contact surfaces are clean, but old Photos/Albums still expose wedding-card legacy content. Facebook exposed deletion, not hide/archive/private controls. Do not remove those photos unless permanent deletion is explicitly approved.

## Option B - Pinterest Pin 6

Use this only if Facebook upload is unavailable and Chrome/Pinterest upload works.

### Asset

`/Users/thien.nguyen/thiennp.github.io/marketing/wishees-pin-assets/wishees-pin-grandparent-gift-coordination.png`

### Destination

`https://www.wishees.com/?lang=en`

### Board

Preferred:

`Birthday Wishlist Ideas`

Alternate:

`Family Gift Ideas`

### Title

`Gift ideas grandparents can actually use`

### Description

`Make one simple wishlist for birthdays or holidays, then share it with grandparents and relatives so everyone can pick from approved gift ideas.`

### Alt Text

`A warm family gift-planning Pinterest image about sharing one wishlist with grandparents for birthdays and holidays.`

### Known Blocker

The in-app browser and Chrome retries could not reliably expose usable Pinterest upload controls. Use this only if the visible logged-in UI renders correctly for the user.

## Option C - TikTok Video 2

Use this if Facebook and Pinterest remain blocked and TikTok Studio upload is available.

### Asset

`/Users/thien.nguyen/thiennp.github.io/marketing/wishees-upload-ready/wishees-photo-short-baby-shower-2026-06-22.mp4`

### Caption

`Baby shower gifts get easier when essentials, books, diapers, and help for new parents live in one shareable list.`

### Publish Settings

- Privacy: Everyone
- Hashtags: none
- Use the caption once only.

### Known Blocker

Automation could not attach the MP4:

- macOS file chooser did not select it.
- localhost page fetch was blocked.
- browser chunk injection briefly created a File, but TikTok cleared it.
- synthetic drag/drop did not start processing.

Use manual TikTok Studio upload.

## Immediate Measurement After Any Publish

Record:

- live URL
- visible views/clicks/comments
- any warning/rejection from the platform
- whether the destination link resolves
- whether the post caption/title appears exactly as intended

Then keep checking:

- `growth@wishees.com` replies in Chrome owner mailbox
- affiliate requests
- Wishees statistics current-week loop
- product clicks

## Do Not Do

- Do not send batch 2 outreach yet.
- Do not send first-batch follow-ups before 2026-06-27.
- Do not delete Facebook legacy photos unless permanent deletion is approved.
