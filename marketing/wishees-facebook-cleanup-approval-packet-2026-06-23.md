# Wishees Facebook Cleanup Approval Packet - 2026-06-23

Purpose: make `https://www.facebook.com/wisheescom/` look fully Wishees-owned before using it for Vietnamese-first growth content.

## Current Clean State

- Page identity is now Wishees-branded.
- Avatar is the warm Wishees gift-style `W`.
- Cover is Wishees/Vietnamese-first with English support.
- Bio is Wishees-related:
  `Tạo wishlist dễ chia sẻ cho sinh nhật, cưới, baby shower & quà gia đình. Simple wishlists for gift moments.`
- Old visible `thiepcuoiviet.net` link is removed/replaced.
- Old public contact email `phamngoclinh83@gmail.com` is removed from Contact info and was verified after reload.
- Reels surface currently looks Wishees-related.

## Remaining Public Legacy Content

The public Photos/Albums area still exposes old unrelated wedding-card content.

Public photo links observed from `https://www.facebook.com/wisheescom/photos`:

- `https://www.facebook.com/photo.php?fbid=1499411562199881&set=pb.100063931535488.-2207520000&type=3`
- `https://www.facebook.com/photo.php?fbid=1499409902200047&set=pb.100063931535488.-2207520000&type=3`
- `https://www.facebook.com/photo.php?fbid=1499408072200230&set=pb.100063931535488.-2207520000&type=3`
- `https://www.facebook.com/photo.php?fbid=465064065634641&set=pb.100063931535488.-2207520000&type=3`
- `https://www.facebook.com/photo.php?fbid=465064062301308&set=pb.100063931535488.-2207520000&type=3`
- `https://www.facebook.com/photo.php?fbid=1168306996516405&set=pb.100063931535488.-2207520000&type=3`
- `https://www.facebook.com/photo.php?fbid=1168302409850197&set=pb.100063931535488.-2207520000&type=3`
- `https://www.facebook.com/photo.php?fbid=1168301749850263&set=pb.100063931535488.-2207520000&type=3`

Legacy signals confirmed by delegated read-only audit:

- Public Photos shows old entries from 2022 and 2015.
- A photo detail still contains a wedding-card related Vietnamese comment:
  `cho minh hoi o cho ban co cung cap phoithiep cuoi khong`
- Albums still expose old unrelated album/title:
  `Mẫu thiệp ưu đãi tháng 8`

## Control Limitation

Facebook did not expose a non-destructive hide/archive/private option for the legacy Page photos.

Confirmed options/state:

- Public/logged-out view: no Hide, Archive, or Private controls.
- Logged-in/admin audit state: `Delete photo` was exposed, but not Hide, Archive, or Private.
- Therefore, removal currently requires permanent deletion.

Latest Chrome recheck on 2026-06-23:

- Page top still shows Wishees branding, Vietnamese-first bio, `wishees.com`, about 1.9K followers, and page admin controls.
- Current cover image is the Wishees VN/EN cover asset; current avatar image is the Wishees `W` avatar. No avatar replacement was needed in this pass.
- About text still shows the Wishees bio and did not expose the old public Gmail contact in the visible page text.
- Reels surface still exposes the Wishees birthday Reel via `https://www.facebook.com/reel/1682922216093334/`.
- Photos still exposes legacy photo links. Opening `More options for this photo` exposed only:
  `Change alt text`, `Edit location`, `Delete photo`, `Download`.
- Albums still exposes `Mẫu thiệp ưu đãi tháng 8` with 4 items. Opening the album options exposed only:
  `Download Album`.
- No non-destructive hide/archive/private control was visible for either old photos or the old album.
- Result: unrelated content could not be hidden safely in the current UI. Permanent deletion remains the only observed cleanup path and still needs explicit approval.

## Approval Needed

Please approve before deleting:

1. Delete old unrelated wedding-card photos listed above.
2. Delete or remove old unrelated album `Mẫu thiệp ưu đãi tháng 8` if Facebook exposes album deletion.
3. Do not delete the new Wishees avatar, cover, or birthday Reel.

## Recommended Deletion Rule

Delete only content that matches at least one of these:

- wedding-card / invitation-card business content
- old `Thiệp Cưới Việt` or similar legacy branding
- old unrelated promotional album/photo from before Wishees repositioning
- comments/details that make the page look like a wedding-card provider

Keep content that matches:

- Wishees avatar
- Wishees cover
- Wishees birthday/baby-shower/wedding wishlist content
- anything clearly created for the current Wishees growth plan

## After-Deletion Verification

After cleanup, verify:

1. Public page top still shows Wishees avatar and cover.
2. About section still shows Wishees bio/link and no old contact email.
3. Photos tab no longer shows old wedding-card content.
4. Albums tab no longer shows `Mẫu thiệp ưu đãi tháng 8`.
5. Reels tab still shows the Wishees birthday Reel:
   `https://www.facebook.com/reel/1682922216093334/`

## Growth Recommendation

After cleanup, publish or pin one Vietnamese-first Wishees intro post so the first content impression is not the old Photos history:

`Wishees giúp bạn tạo danh sách quà tặng dễ chia sẻ cho sinh nhật, gia đình và những dịp đặc biệt.`

English support:

`Simple shareable wishlists for birthdays, family gifts, and special moments.`
