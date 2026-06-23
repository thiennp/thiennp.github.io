Please implement a better Facebook/Open Graph share image for Wishees.

Context:
The current Facebook link preview for `wishees.com` looks too much like a generic logo/app placeholder and weakens trust. Wishees growth posts now use warm, realistic gift-moment media, so the website share preview should match that style.

Use this generated Gemini image as the source asset:

`/Users/thien.nguyen/thiennp.github.io/marketing/wishees-share-preview-assets/wishees-og-birthday-share-loop-gemini-2026-06-23.png`

Source image details:
- 2848 x 1504 PNG
- Landscape social-share ratio, close to 1.91:1
- Vietnamese-first copy: `Một link thôi, khỏi đoán quà`
- Visual direction: realistic Vietnamese cafe birthday/gift moment, warm, premium, share-loop focused

Please do the implementation in the Wishees app:

1. Locate the current Open Graph / Twitter / social metadata implementation for the homepage and public shared pages.
2. Replace the weak/default preview image with this new Wishees gift-moment image.
3. Optimize the production image:
   - Prefer 1200 x 630 or equivalent 1.91:1 output.
   - Keep it visually close to the source.
   - Keep file size reasonable for social crawlers, ideally under 1 MB.
   - Use the repo's existing image pipeline if it has one. If not, use a simple build-safe static asset in `public/`.
4. Set metadata for at least the public homepage:
   - `og:image`
   - `og:image:width`
   - `og:image:height`
   - `twitter:card` as `summary_large_image`
   - `twitter:image`
5. If Wishees has localized metadata, use Vietnamese-first copy for `?lang=vi` and keep English fallback reasonable.
6. If public wishlist/share pages have their own metadata, check whether they still use an ugly default image. If they do, either update them to this image as a fallback or add a better share-image fallback for wishlists.
7. Do not change product behavior or unrelated UI. This is only social preview/share metadata and asset handling.

Expected result:
When someone shares `https://www.wishees.com/` or `https://www.wishees.com/?lang=vi` on Facebook, Messenger, Slack, etc., the preview should show the warm realistic Wishees gift image instead of a generic app/logo card.

Verification:
1. Run the app locally.
2. View the rendered page source or metadata output and confirm the `og:image` URL points to the new production asset.
3. Confirm the image URL is absolute or resolves correctly in production.
4. Confirm dimensions are declared correctly.
5. Use Facebook Sharing Debugger or equivalent preview tooling after deploy to scrape again and confirm the preview changed.
6. Report exactly which pages/routes were updated and which share routes still need separate dynamic images, if any.

Important:
The goal is conversion and trust, not decoration. The preview should communicate:
`create wishlist -> add a few wishes -> share one link`.
