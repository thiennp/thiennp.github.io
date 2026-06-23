# Wishees First Send Operating Note - 2026-06-22

Status: execution guide only. No outreach has been sent.

Use this after the user approves the sender and messages in `wishees-first-send-approval-sheet-2026-06-22.md`.

## Before Sending

1. Confirm the sender inbox.
2. Confirm each message is approved or edited.
3. Re-open each contact path immediately before sending.
4. Send no attachments.
5. Do not use social DMs unless explicitly approved.

## While Sending

For each lead, update `wishees-first-send-log-2026-06-22.csv`:

- `Approved`: `Y`
- `Sender`: exact sender inbox
- `Sent_Date`: send date
- `Send_Channel`: email or contact form
- `Send_Result`: sent, bounced, form rejected, blocked, or held
- `Follow_Up_Due`: 4-7 days after send if the first message was accepted

Also update the relevant source CSV:

- `wishees-us-pinterest-leads-2026-06-22.csv`
- `wishees-cross-platform-affiliate-leads-2026-06-22.csv`

## After Sending

Update `wishees-growth-measurement-ledger-2026-06-22.csv` with:

- `Trigger`: `first_outreach_batch_sent`
- `Outreach_Sent`: number accepted by email/form
- `Replies`: 0 initially
- `Positive_Replies`: 0 initially
- `Affiliate_Program_Joined_Or_Applied`: 0 initially
- `Affiliate_Tags_Saved`: 0 initially

## Follow-Up Rule

Send one follow-up only after 4-7 days, and only if:

- the first message was accepted,
- there was no reply,
- there was no bounce,
- the contact form did not reject the message,
- sender reputation looks safe.

Use `wishees-outreach-follow-up-template-2026-06-22.md`.
