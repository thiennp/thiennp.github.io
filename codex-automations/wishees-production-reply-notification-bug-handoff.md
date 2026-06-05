# Wishees Production Bug Handoff

## Title

Owner reply saves and displays, but helper does not receive `wish.support.replied` notification.

## Environment

- Production URL: `https://www.wishees.com/?lang=de`
- Tested on: June 4, 2026
- Accounts used:
  - Alex: `e2e-alex@wishees.local / wishees-e2e-alex`
  - Maya: `e2e-maya@wishees.local / wishees-e2e-maya`

## Summary

When Maya supports Alex's wish and Alex replies, the reply is saved and shown on Maya's friend wishlist page. However, Maya does not receive a `wish.support.replied` notification.

## Observed Behavior

Production QA results:

```txt
PASS owner reply saves in production
PASS friend page shows owner reply in production
FAIL helper receives reply notification
details: unreadCount=0, types=[]
```

Detailed flow:

1. Maya logs in as `e2e-maya@wishees.local`.
2. Alex logs in as `e2e-alex@wishees.local`.
3. Maya offers support on Alex's wish.
4. Alex receives a `wish.support.offered` notification.
5. Alex sends a reply message to Maya's support outcome.
6. The reply is stored on the outcome.
7. Maya's friend wishlist page displays Alex's reply.
8. Maya's notification feed does not contain `wish.support.replied`.

## Expected Behavior

When an owner replies to a promised support outcome, the helper should receive a `wish.support.replied` notification.

Expected Maya notification payload should include:

```txt
type = wish.support.replied
user_id = helperUserId
actor_user_id = ownerUserId
outcome_id = outcome.id
wish_title = supported wish title
```

## Likely Root Cause

`replyWishlistOutcome(...)` updates `owner_reply` and returns the updated outcome, but it does not appear to call the existing notification helper.

Relevant files:

- `src/app/db/wishees-wishlist-outcomes-write-owner.ts`
- `src/app/db/wishees-user-notifications-support.ts`

There is already a helper available:

```ts
notifyWishSupportReplied(sql, outcome)
```

## Suggested Fix

After `replyWishlistOutcome(...)` fetches the updated outcome, call `notifyWishSupportReplied(...)` before returning.

Likely shape:

```ts
const outcome = await fetchOutcomeById(sql, rows[0].id);

if (!outcome) return { ok: false as const, reason: "invalid-action" };

await notifyWishSupportReplied(sql, outcome);

return { ok: true as const, outcome };
```

Make sure the import is added from the notification support module.

Also confirm dedupe behavior. The existing helper uses a dedupe key shaped like:

```txt
wish.support.replied:<outcome.id>
```

That likely means repeated owner reply edits update or suppress duplicate notifications, which may be correct. Confirm product intent before changing the dedupe key.

## Tests To Add

Add a unit or integration test for the owner reply path:

1. Create or seed a promised wishlist outcome.
2. Call the owner reply action.
3. Assert `owner_reply` is saved.
4. Assert `user_notifications` contains a row for the helper:

```txt
notification_type = wish.support.replied
user_id = helperUserId
actor_user_id = ownerUserId
outcome_id = outcome.id
```

Optional route-level test:

```txt
POST /api/account/wishlist/outcomes
body: { decision: "reply", outcomeId, ownerReply }
```

Assert:

- response is `200`
- outcome contains `ownerReply`
- helper notification exists

## Verification Checklist

Use E2E accounts:

- Alex: `e2e-alex@wishees.local / wishees-e2e-alex`
- Maya: `e2e-maya@wishees.local / wishees-e2e-maya`

Steps:

1. Reset or prepare E2E data.
2. Maya supports one of Alex's wishes.
3. Confirm Alex receives `wish.support.offered`.
4. Alex replies to Maya's support.
5. Fetch Maya notifications with `GET /api/notifications`.
6. Verify Maya receives `wish.support.replied`.
7. Open Maya's friend wishlist page for Alex and verify the reply still displays.
8. Verify notification read/delete still works for the new notification.

## Cleanup Notes From Production QA

The production QA run used a disposable wish with id shaped like:

```txt
wish_prod_qa_<timestamp>
```

Cleanup was verified after testing:

- Alex wishlist returned to 2 items.
- No production-QA wish remained.
- No production-QA notifications remained.
- Temporary Alex-Lina invite connection was removed.

