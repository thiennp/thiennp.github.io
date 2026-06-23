# Wishees Follow-Up Decision Packet - 2026-06-27

Purpose: decide whether to send one follow-up to the first outreach batch.

Do not use this before 2026-06-27 unless the user explicitly asks.

## First Batch State

First sent/submitted on 2026-06-22 from or using `growth@wishees.com`.

| Lead | Channel | Subject | Follow-up due | Current status |
|---|---|---|---|---|
| The Childhood Collective | Direct email | Parent-approved gift lists for ADHD-friendly gifts | 2026-06-27 | Awaiting reply |
| Ali / My Kids Made Me Buy It | Contact form | Helping parents avoid duplicate kids' gifts | 2026-06-27 | Awaiting reply |
| Caitlin Kruse / The Mama Notes | Direct email | Simple family wishlists for mom readers | 2026-06-27 | Awaiting reply |
| Pjs and Paint | Direct email | A wishlist companion for baby showers and birthdays | 2026-06-27 | Awaiting reply |
| The Mint Chip Mama | Direct email | Simple holiday wishlists for family readers | 2026-06-27 | Awaiting reply |

Source tracker:

`wishees-first-send-log-2026-06-22.csv`

## Pre-Follow-Up Check

Before sending anything, check:

1. `growth@wishees.com` owner mailbox in Chrome.
2. Replies from each direct-email thread.
3. Bounces or delivery failures.
4. Contact-form rejection/spam warnings.
5. Affiliate request panel.
6. Product clicks.
7. Wishees weekly growth loop.

## Stop Conditions

Do not follow up with a lead if any of these happened:

- bounced email
- contact form rejected the first message
- negative reply
- creator already replied positively and needs a demo instead
- sender reputation looks risky
- user says to pause outreach

## Follow-Up Rule

Send at most one follow-up per eligible lead.

Use original subject with `Re:` for direct email follow-ups.

For Ali / My Kids Made Me Buy It:

- Because the first message was submitted by contact form, only follow up if a clean email reply/contact route is available.
- If no clean route is available, mark `No clean follow-up route` and do not resubmit the form unless the user approves.

## Generic Follow-Up Body

Hi {{first_name}},

Just wanted to follow up once on this.

The reason I thought Wishees might fit your readers is that it gives them a simple way to turn gift ideas into a shareable wishlist, while creator marketplace affiliate tags can stay yours where supported.

If it is useful, I can send a short demo wishlist matched to your content. If not, no worries at all.

Creator page:
https://www.wishees.com/affiliate/program?lang=en

Best,
Wishees

## Lead-Specific First Lines

Use one optional first sentence after the greeting if it feels natural.

### The Childhood Collective

`I was thinking especially of parent-approved gift lists for kids where relatives want helpful ideas without adding more coordination work for parents.`

### Caitlin Kruse / The Mama Notes

`I was thinking especially of family gift lists for birthdays, holidays, and baby/kid moments where readers already trust your practical recommendations.`

### Pjs and Paint

`I was thinking especially of baby shower, birthday, and party gift ideas that readers may want to save or share with family.`

### The Mint Chip Mama

`I was thinking especially of holiday and family gift ideas where readers may want one simple list they can share with relatives.`

## After Sending

Update `wishees-first-send-log-2026-06-22.csv`:

1. Keep `Follow_Up_Due` as `2026-06-27` or set `Follow_Up_Sent` in Notes if no dedicated column exists.
2. Set `Reply_Status` to `Follow-up sent - awaiting reply`.
3. Add note: `One follow-up sent on 2026-06-27; no more follow-ups unless they reply.`

Update `wishees-growth-measurement-ledger-2026-06-22.csv`:

- Trigger: `first_batch_follow_up_decision`
- Decision: `follow_up_sent`, `follow_up_skipped`, or `hold_for_signal`
- Next action: wait for replies or move to copy adjustment/new discovery.

## Day-7 Decision

After follow-up:

- Continue this outreach angle if at least one creator replies positively, asks for a demo, joins/applies, or saves tags.
- Adjust copy if creators misunderstand commission, replacement, or affiliate-tag ownership.
- Pause outreach if there are bounces, spam/contact-form rejections, or no signal after the one follow-up window.

## Do Not Do

- Do not send batch 2 before the follow-up decision.
- Do not send more than one follow-up.
- Do not use Pinterest/TikTok/Instagram DMs.
- Do not promise income.
- Do not say Wishees replaces Amazon, LTK, ShopMy, registries, or storefronts.
