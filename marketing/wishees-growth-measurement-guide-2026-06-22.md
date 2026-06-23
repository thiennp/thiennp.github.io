# Wishees Growth Measurement Guide - 2026-06-22

Purpose: measure whether the first growth loop is producing creator interest, not just activity.

Primary KPI: affiliate tags saved.

## When To Measure

Run a measurement pass after either:

1. 24 hours after the first approved outreach send, or
2. the first positive reply, or
3. a published social post receives meaningful clicks/comments.

Before outreach is sent, only record baseline or publishing-blocker updates.

## Where To Record

Use these files:

- Social publishing results: `wishees-posting-tracker-2026-06-22.csv`
- Lead/contact results: `wishees-us-pinterest-leads-2026-06-22.csv`
- Experiment summary snapshots: `wishees-growth-measurement-ledger-2026-06-22.csv`

## Social Measurement

For each published post, update:

1. `Published_URL`
2. `Published_Date`
3. `Clicks`
4. `Views`
5. `Comments`
6. `Notes`

If the platform blocks publishing, record the exact blocker in `Notes`.

## Outreach Measurement

For each contacted lead, update:

1. `Date First Contacted`
2. `Date of Follow-up`
3. `Response Status`
4. `Outreach Variant`
5. `Notes`

Use these response statuses:

- `Not Contacted`
- `Sent`
- `Bounced`
- `Form Rejected`
- `No Reply`
- `Positive Reply`
- `Asked For Demo`
- `Not Interested`
- `Joined/Applied`
- `Affiliate Tags Saved`

## Snapshot Ledger

Add one row to `wishees-growth-measurement-ledger-2026-06-22.csv` after each measurement pass.

Fields:

- `Measurement_Date`: date of the pass.
- `Trigger`: why the pass happened, such as `24h_after_send`, `first_positive_reply`, or `social_clicks`.
- `Social_Posts_Published`: total published social posts.
- `Outreach_Sent`: total contacted leads.
- `Replies`: total replies.
- `Positive_Replies`: replies showing interest or asking for details.
- `Affiliate_Program_Joined_Or_Applied`: creator joined/applied count.
- `Affiliate_Tags_Saved`: primary KPI count.
- `Top_Source`: channel/source driving best signal.
- `Main_Learning`: one sentence.
- `Decision`: one of `continue`, `adjust_copy`, `pause`, `scale`.
- `Next_Action`: next concrete action.
- `Notes`: blockers or caveats.

## Decision Rules

Continue if:

- At least one creator replies positively, asks for a demo, joins/applies, or saves tags.
- For Facebook Post 2 specifically: continue Facebook-first if the 24-hour check shows increased link opens, registrations/new wishes, affiliate requests, practical comments/questions, or visible Vietnamese/English gift-planning interest.

Adjust copy if:

- Replies show confusion about commission, replacement, creator tag ownership, or what Wishees does.
- For Facebook Post 2 specifically: use one clearer support comment if it gets reach but Wishees-owned metrics do not move and the CTA/link appears buried.

Pause if:

- Contact forms reject messages as promotional/spam.
- Sender reputation looks at risk.
- The affiliate-program page breaks.
- For Facebook Post 2 specifically: hold and do not boost if it gets no meaningful reach after 24 hours and no Wishees-owned metric moves.

Scale if:

- At least one creator joins/applies or saves affiliate tags.

## First Valid Measurement

The first meaningful measurement cannot happen until at least one of these is true:

- one new social proof post is published,
- one approved outreach message is sent,
- one platform returns a concrete blocker/rejection.
