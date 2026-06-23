# Wishees Public Signal Check - 2026-06-23

Purpose: refresh the public, non-destructive status of the current growth loop without sending outreach, publishing content, deleting Facebook content, or relying on private mailbox/admin panels.

## What Was Checked

### Wishees Pages

All checked Wishees URLs returned `200`.

| URL | Result | Notes |
| --- | --- | --- |
| `https://www.wishees.com/?lang=en` | `200` | English page source present. |
| `https://www.wishees.com/?lang=vi` | `200` | Vietnamese page source present. |
| `https://www.wishees.com/affiliate/program?lang=en` | `200` | English affiliate program source includes Amazon Associates copy. |
| `https://www.wishees.com/friends/16686?wish=wish_207a971307904240&lang=en` | `200` | English public preview source includes sample wishes, login, and sign-up. |
| `https://www.wishees.com/friends/16686?wish=wish_3726747bd4ed43d7&lang=en` | `200` | English public preview source includes sample wishes, login, and sign-up. |
| `https://www.wishees.com/friends/16686?wish=wish_d830f899ce184bfb&lang=en` | `200` | English public preview source includes sample wishes, login, and sign-up. |

### Public Social URLs

All checked public social URLs returned `200`.

| Channel | URL | Public result | Counter confidence |
| --- | --- | --- | --- |
| TikTok Video 1 | `https://www.tiktok.com/@wishees_growth/video/7654324811610492182` | `200` | Page source contains generic views/likes/comments terms, but no trustworthy current counter was extracted. |
| YouTube Short 2 corrected | `https://youtube.com/shorts/bwNPQzPIYZc` | `200` | Public page resolves; no trustworthy current counter was extracted. |
| Pinterest Pin 3 | `https://de.pinterest.com/pin/1082834304184166760/` | `200` | Public page resolves; no trustworthy current counter was extracted. |
| Facebook Reel 1 | `https://www.facebook.com/reel/1682922216093334/` | `200` | Page source includes Wishees, wishlist, and birthday terms. |
| Facebook page | `https://www.facebook.com/wisheescom/` | `200` | Page source includes `wishees.com`; old Gmail and old `thiepcuoiviet` string were not present in this fetch. This does not prove old photos are removed because prior page/browser checks showed old photo links in the Photos area. |

## Decision

Do not send second-wave outreach yet.

This public check proves the current public URLs are reachable, but it does not prove:

- creator replies
- affiliate applications
- affiliate tags saved
- private Wishees dashboard movement
- reliable social engagement counters

## Next Best Action

1. If a manual publishing window is available, publish Pinterest Pin 6 using `wishees-manual-execution-packet-2026-06-23.md`.
2. If Pinterest remains blocked, manually publish TikTok Video 2 and verify the caption does not duplicate.
3. Keep second-wave outreach paused until a reply, application, saved tag, meaningful signal, or the 2026-06-27 follow-up decision pass.
4. Facebook legacy photo deletion still requires explicit permanent-delete approval.

