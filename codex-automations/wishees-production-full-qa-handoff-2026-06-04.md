# Wishees Production Full QA Handoff - 2026-06-04

## Scope

Production target: `https://www.wishees.com`  
Primary UI language: German (`?lang=de`)  
Additional render checks: Arabic (`?lang=ar`) and Japanese (`?lang=ja`)  
Tester accounts used:

- `e2e-alex@wishees.local` / `wishees-e2e-alex` - member, active
- `e2e-maya@wishees.local` / `wishees-e2e-maya` - member, active
- `e2e-jordan@wishees.local` / `wishees-e2e-jordan` - member, active
- `e2e-lina@wishees.local` / `wishees-e2e-lina` - viewer, active
- `e2e-disabled@wishees.local` / `wishees-e2e-disabled` - viewer, disabled

Explicit exclusions:

- Google login
- Facebook login
- Successful new-account signup, because production has no public self-service account cleanup route
- Successful user report submission, because production has no public report cleanup route
- The previously reported helper reply-notification bug is intentionally excluded from this handoff

## Executive Summary

Broad production QA passed across public pages, email auth, protected pages, account settings, wishlist CRUD, item/list sharing, friend request lifecycle, invite acceptance, support offers, owner support decisions, notifications, suggestions, same-origin guards, and access boundaries.

One new actionable product cleanup bug was found:

- **P2: Confirmed support outcomes remain visible through the owner outcomes API after the supported wish is deleted.**

Production QA data was cleaned after the run:

- Alex wishlist returned to 2 baseline items.
- No `prod_fullqa` wishlist items remain.
- No `prod_fullqa` support outcomes remain.
- No QA notifications remain for Alex/Maya.
- Lina is not connected to Alex.
- No pending Lina incoming or Alex outgoing friend requests remain.
- Alex original password works again.
- Gift payment and profile contact settings were restored.

## New Finding

### P2 - Deleting a Supported Wish Leaves Confirmed Support Outcomes Behind

Observed on production during full QA.

After creating disposable wishes, sending support offers, and confirming support as the owner, deleting the QA wishes removed them from the wishlist but did not remove confirmed outcome rows. The owner outcomes API still returned support rows for wish IDs that no longer existed in the wishlist.

Observed evidence before cleanup:

```json
{
  "wishlist": {
    "status": 200,
    "itemCount": 2,
    "qaPresent": false,
    "visibility": "friends"
  },
  "outcomes": {
    "status": 200,
    "count": 2,
    "qaOutcomes": [
      {
        "id": "53",
        "itemId": "wish_prod_fullqa_retest_1780600950417_partial",
        "status": "received_confirmed"
      },
      {
        "id": "50",
        "itemId": "wish_prod_fullqa_1780600843891_item",
        "status": "received_confirmed"
      }
    ]
  }
}
```

Final state after narrow DB cleanup:

```json
{
  "wishlist": {
    "status": 200,
    "itemCount": 2,
    "qaPresent": false,
    "visibility": "friends"
  },
  "outcomes": {
    "status": 200,
    "count": 0,
    "qaPresent": false
  }
}
```

#### Reproduction

1. Log in as Alex.
2. Create a new wishlist item, for example `wish_delete_outcome_regression`.
3. Log in as Maya or Jordan.
4. Open Alex's friend wishlist and send a support offer with a helper message.
5. Log in as Alex.
6. Confirm the support offer. Optionally mark support finished.
7. Delete the supported wishlist item and save the wishlist.
8. Call `GET /api/account/wishlist` as Alex and confirm the item is gone.
9. Call `GET /api/account/wishlist/outcomes` as Alex.

Expected:

- Outcomes for the deleted item are removed, or at minimum not returned to the owner UI/API.

Actual:

- Confirmed support outcomes remain in `/api/account/wishlist/outcomes` even though the item no longer exists.

#### Impact

This can create stale owner support state and can leak historical support data for wishes the owner intentionally removed. It also makes production QA cleanup harder because confirmed outcomes cannot be removed through the current owner decline/withdraw APIs.

#### Likely Area

Start in:

- `src/app/api/account/wishlist/route.ts`
- `src/app/db/wishees-user-wishlist.ts`
- `src/app/db/wishees-user-wishlist-*`
- `src/app/db/wishees-wishlist-outcomes-*`
- `src/app/api/account/wishlist/outcomes/route.ts`

The existing helper `deletePromisedWishlistOutcomeById` only deletes `status = 'promised'`, which is not enough for wish deletion. Wish deletion should clean outcomes regardless of status for the removed item IDs.

#### Suggested Fix

Implement cleanup when the owner saves a wishlist with item IDs removed:

1. Determine deleted item IDs by comparing the owner's existing DB rows with the submitted `items`.
2. Delete all `outcomes` rows for that `owner_user_id` and those removed `item_id`s, regardless of status.
3. Consider deleting or neutralizing related support notifications for those item IDs.
4. Keep wishlist item save and outcome cleanup consistent. If a transaction helper is available for the Neon client path, use it; otherwise ensure failure handling is explicit.
5. Add regression coverage for promised, confirmed, declined/cancelled-equivalent, and finished-supported item deletion.

Suggested regression assertions:

- Removing an unsupported wish still removes only the wish.
- Removing a wish with `promised` support deletes the outcome.
- Removing a wish with `received_confirmed` support deletes the outcome.
- `GET /api/account/wishlist/outcomes` does not return rows whose `item_id` no longer belongs to an owner wishlist item.

## Passing Coverage

### Public and Visual Pages

Browser visual smoke passed with no horizontal overflow on:

- `/?lang=de`
- `/?lang=ar`
- `/account/login?mode=email&lang=de`
- `/account/login?mode=signup&lang=de`
- `/account/login/forgot-password?lang=de`
- `/community?lang=de`
- `/wish?sharedWishId=missing-prod-fullqa&lang=de`

Additional render/API page smoke passed:

- `/terms?lang=de`
- `/privacy?lang=de`
- `/contact?lang=de`
- `/data-deletion?lang=de`
- `/affiliate-disclosure?lang=de`
- `/feedback?ref=qa&lang=de`
- `/invite?code=invalid-prod-fullqa&lang=de`

Screenshots saved locally:

- `/Users/thien.nguyen/thiennp.github.io/codex-automations/qa-screenshots-20260604-wishees-prod-full/home-de.png`
- `/Users/thien.nguyen/thiennp.github.io/codex-automations/qa-screenshots-20260604-wishees-prod-full/home-ar.png`
- `/Users/thien.nguyen/thiennp.github.io/codex-automations/qa-screenshots-20260604-wishees-prod-full/login-email-de.png`
- `/Users/thien.nguyen/thiennp.github.io/codex-automations/qa-screenshots-20260604-wishees-prod-full/login-signup-de.png`
- `/Users/thien.nguyen/thiennp.github.io/codex-automations/qa-screenshots-20260604-wishees-prod-full/forgot-password-de.png`
- `/Users/thien.nguyen/thiennp.github.io/codex-automations/qa-screenshots-20260604-wishees-prod-full/community-de.png`
- `/Users/thien.nguyen/thiennp.github.io/codex-automations/qa-screenshots-20260604-wishees-prod-full/invalid-wish-de.png`

### Auth and Account

Passed:

- Email/password login for Alex, Maya, Jordan, Lina.
- Lina resolves as viewer.
- Alex/Maya/Jordan resolve as members.
- Disabled account is rejected with `account-disabled`.
- Invalid password is rejected.
- Logout clears the session cookie.
- Signup password mismatch redirects with `error=password-mismatch`.
- Signup duplicate email redirects with `error=account-exists`.
- Password change works, old password stops working, temporary password works, and original password restore works.

### Protected Pages and Access Boundaries

Authenticated member pages rendered:

- `/profile?lang=de`
- `/my-wishees?lang=de`
- `/friends?lang=de`
- `/friends/invite?lang=de`
- `/notifications?lang=de`

Member access boundary passed:

- `/account/admin?lang=de`
- `/account/users?lang=de`
- `/account/database?lang=de`
- `/account/users/friends?lang=de`

All redirected/rendered access denied for a member as expected.

### Profile and Gift Payment Settings

Passed with backup and restore:

- Profile contact accounts save redirected with `notice=contact-accounts-updated`.
- Updated contact value appeared in profile UI.
- Contact values were restored.
- Gift payment settings loaded.
- Gift payment settings saved via API.
- Updated gift payment value persisted before restore.
- Gift payment settings were restored.

### Wishlist, Sharing, and Privacy

Passed:

- Owner wishlist loads.
- Create wishlist item.
- Edit wishlist item.
- Delete QA wishlist items.
- Wishlist visibility change to private and restore to friends.
- Shared wish API returns friends-visible item.
- Shared wishlist API returns shareable wishlist items.
- Item-level private visibility saves.
- Item-level private wish returns 404 from shared wish API.

Retest confirmed share response shape:

```json
{
  "ok": true,
  "wish": {
    "currency": "EUR",
    "id": "wish_prod_fullqa_retest_...",
    "title": "Full QA retest share ..."
  }
}
```

Shared wishlist response shape:

```json
{
  "ok": true,
  "wishlist": {
    "items": []
  }
}
```

### Friends and Invites

Passed:

- Connected friends list loads for Alex.
- Connected friend can render Alex wishlist page.
- Friend request can be sent to Lina.
- Lina sees incoming request.
- Alex sees outgoing request.
- Request status reports pending.
- Alex can cancel request.
- Lina can decline request.
- Lina can accept request.
- Accepted Lina connection appears in connected list.
- Accepted Lina connection can be removed.
- Friend invite can be created.
- Friend invite page renders.
- Existing Lina account can accept invite.
- Invite-created Lina connection appears and can be removed.

### Support, Messages, Finish, and Withdraw

Passed:

- Maya can send partial support offer with helper message.
- Owner outcomes include helper message.
- Alex can confirm support offer with owner message.
- Alex can mark support finished.
- Jordan can send full support offer.
- Jordan can withdraw support offer.
- Maya can send support offer for owner-decline path.
- Alex can decline support offer.

Important note:

- The known previous issue where helper reply notifications are missing was not re-filed here.

### Notifications

Passed:

- Notifications feed loads.
- Support-related owner notification was created.
- Notification can be marked read.
- Deletable notification can be deleted.
- Final verification showed Alex and Maya unread counts at 0 and no QA notification markers.

### Reports, Suggestions, and Guards

Passed:

- Invalid friend report reason rejected with `invalid-report`.
- Self-report rejected with `cannot-report-self`.
- Wish suggestions reject missing input with `missing-wish`.
- Wish suggestions return valid suggestions for wish text.
- Product suggestions return marketplace candidates.
- Cross-origin suggestion POST is rejected with `same-origin-required`.

## Final Production State Verification

Final verification after cleanup:

```json
{
  "alexLogin": {
    "ok": true
  },
  "wishlist": {
    "status": 200,
    "itemCount": 2,
    "qaPresent": false,
    "visibility": "friends"
  },
  "outcomes": {
    "status": 200,
    "count": 0,
    "qaPresent": false
  },
  "notifications": {
    "alexUnread": 0,
    "alexQa": false,
    "mayaUnread": 0,
    "mayaQa": false
  },
  "friends": {
    "alexFriends": [
      "e2e-jordan@wishees.local",
      "e2e-maya@wishees.local"
    ],
    "linaIncoming": 0,
    "alexOutgoing": 0
  }
}
```

## Cursor AI Action Checklist

1. Add outcome cleanup for removed wishlist item IDs.
2. Add regression tests for deleting supported wishes in promised and confirmed states.
3. Verify owner outcomes no longer return rows for deleted wishes.
4. Consider related notification cleanup for removed supported wishes.
5. Do not spend this pass on the previously reported helper reply-notification bug; it belongs to the earlier handoff.
