# Wishees Creator Reply Demo Packet - 2026-06-23

Purpose: respond quickly if a first-batch creator replies positively or asks for more information.

Do not send anything from this packet unless a creator replies or the user explicitly asks.

## Demo Links

- Kids birthday / parent-approved gifts:
  `https://www.wishees.com/friends/16686?wish=wish_207a971307904240&lang=en`
- Baby shower:
  `https://www.wishees.com/friends/16686?wish=wish_3726747bd4ed43d7&lang=en`
- Wedding registry supplement:
  `https://www.wishees.com/friends/16686?wish=wish_d830f899ce184bfb&lang=en`
- General profile invite:
  `https://www.wishees.com/friends/16686`
- Creator affiliate program:
  `https://www.wishees.com/affiliate/program?lang=en`

## Pre-Send Link Check

Before sending any demo link to a creator, prefer one quick visual check in a logged-out/private browser session.

Current owner-session caveat:

- In the logged-in Wishees session, the `/friends/16686?...` demo links redirect to `/my-wishees/16686`.
- The logged-in view shows owner controls such as `Edit`, `Share`, and `Remove`.
- That is not the view a creator should receive.

Current no-cookie/public-source check:

- On 2026-06-23, a no-cookie request to the kids birthday demo returned `200` and stayed on `https://www.wishees.com/friends/16686?wish=wish_207a971307904240&lang=en`.
- The HTML source had `lang="en"`.
- The public invite preview included the three sample wishes: kids birthday, wedding registry supplement, and baby shower.
- The public path showed `Log in to link this invite` and `Sign up`.
- The source did not show the owner-only controls that appeared in the logged-in owner session.
- The affiliate program page also returned `200` at `https://www.wishees.com/affiliate/program?lang=en` with English Amazon Associates, eBay Partner Network, OTTO, and MediaMarkt copy.

This is strong enough to keep the demo links in the reply packet. Still do one visual logged-out/private check before sending if possible, especially if the creator will receive a specific wish link.

The final visual check should confirm:

1. The page stays in English.
2. The relevant sample wish is visible.
3. No owner-only controls are visible.
4. The page does not show a 404, German fallback, or broken state.

If the visual check is not available, the no-cookie HTML check above is acceptable evidence for a short reply, but avoid claiming that the creator sees a full interactive wishlist before they sign in. The public view is a preview plus a login/sign-up gate.

## Lead-To-Demo Map

| Lead | Best demo | Why |
|---|---|---|
| The Childhood Collective | Kids birthday / parent-approved gifts | The original angle was ADHD-friendly, parent-approved gifts relatives can choose from. |
| Ali / My Kids Made Me Buy It | Kids birthday / parent-approved gifts | The original angle was avoiding duplicate or unwanted kids gifts. |
| Caitlin Kruse / The Mama Notes | Kids birthday / parent-approved gifts, or general profile invite | The original angle was family shopping and mom readers. |
| Pjs and Paint | Baby shower, with kids birthday as backup | The original angle included baby showers, birthdays, and parties. |
| The Mint Chip Mama | Kids birthday / parent-approved gifts, with holiday wording | The original angle was holiday/family gift coordination. |

## Positive Reply Template

Subject:

Use the existing thread.

Body:

```text
Hi {{first_name}},

Thanks, happy to send a quick example.

Here is a simple demo wishlist matched to the gift-list use case I mentioned:
{{demo_link}}

The idea is not to replace your existing Amazon, LTK, ShopMy, or storefront links. Wishees is more like a shareable gift-list layer: a reader can collect or share gift ideas for a birthday, baby shower, holiday, or family moment, while creator marketplace affiliate tags can stay connected where supported.

Creator page:
https://www.wishees.com/affiliate/program?lang=en

If you want, I can also make the example more specific to one of your gift guides.

Best,
Wishees
```

## If They Ask How Creators Earn

```text
Wishees does not pay the marketplace commission itself and does not take the creator's marketplace commission.

The creator keeps using their supported marketplace affiliate tags where those tags can be connected. When a shopper clicks out and buys, the store or affiliate network handles commission under its normal rules. Buyers pay the normal store price.

Wishees is mainly the shareable wishlist layer for the gift moment.
```

## If They Ask Whether It Replaces Their Tools

```text
No, that is not the goal.

Wishees should work alongside existing tools like Amazon storefronts, LTK, ShopMy, registries, and blog gift guides. The useful use case is when an audience needs one simple gift-list link for a birthday, baby shower, holiday, or family gift moment.
```

## If They Ask For Setup Steps

```text
The basic setup is:

1. Create or open a Wishees account.
2. Add supported marketplace affiliate tags in the affiliate/program area.
3. Create a wishlist for one clear gift moment.
4. Share the wishlist link with readers or family.
5. Keep using existing storefronts and affiliate tools where they already work.

Creator page:
https://www.wishees.com/affiliate/program?lang=en
```

## If They Ask For Budget

Use this when a creator replies with a commercial question such as `What's your budget?`

```text
Hi {{first_name}},

Thanks for getting back to me.

For this first test, we are trying to keep it small and focused rather than start with a large campaign. The use case I had in mind for your readers is a simple holiday or family gift wishlist: one shareable list readers can use alongside your existing gift guides, Amazon links, and other affiliate links.

Could you send over your standard rates or media kit for a small sponsored mention, newsletter inclusion, or gift-guide placement?

Once I see your options, I can suggest the cleanest test scope. My preference would be something lightweight first: one family/holiday wishlist example, one link to Wishees, and clear tracking so we can see whether readers click or ask questions.

Best,
Wishees
```

Do not give a fixed budget before seeing their rates unless the user explicitly chooses one.

## If They Ask For A More Specific Demo

Ask which guide or audience they want to test first:

```text
Sure. Which angle would be most useful for your readers first?

- kids birthday gifts
- baby shower gifts
- holiday family gifts
- classroom / group gifts
- another gift guide you already have

I can make the example around that use case.
```

## Stop / Hold Replies

If they say no:

```text
Thanks for taking a look, and no worries at all.

Best,
Wishees
```

If they ask to unsubscribe or stop:

```text
Understood, I will not follow up again.

Best,
Wishees
```

Then update the lead as `Do not contact`.

## After Any Reply

Update:

- `wishees-first-send-log-2026-06-22.csv`
- `wishees-growth-measurement-ledger-2026-06-22.csv`
- source lead CSV if applicable

Track:

- reply date
- reply type
- positive reply: yes/no
- demo sent: which link
- affiliate program joined/applied
- affiliate tags saved
- objections or wording confusion

## Do Not Do

- Do not promise income.
- Do not say Wishees replaces Amazon, LTK, ShopMy, storefronts, registries, or blogs.
- Do not send attachments.
- Do not send batch 2 just because someone asks one question; handle the reply first.
