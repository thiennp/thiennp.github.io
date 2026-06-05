# Wishees Production QA Rerun - 2026-06-04

## Result

Production target: `https://www.wishees.com`

Fresh round completed after fixes were deployed. No new product bugs found.

Both prior regression targets now pass:

- Helper receives `wish.support.replied` notification after owner replies to a support offer.
- Deleting a supported and confirmed wish removes the related owner outcome rows and support notifications.

Final production cleanup passed:

- Alex wishlist is back to 2 baseline items.
- No rerun wishlist items remain.
- No rerun support outcomes remain.
- No rerun notifications remain for Alex/Maya/Jordan.
- Lina is disconnected from Alex.
- No pending Lina incoming requests or Alex outgoing requests remain.
- Alex original password works.
- Gift payment settings restored.
- Profile contact settings restored.

## Notes About The Run

The first broad script reported 2 notification assertion failures, but those were harness issues: the public notification feed intentionally exposes `type`, `wishTitle`, actor, href, and id, but not the raw `itemId`. A targeted notification retest using the correct public feed shape passed fully.

Corrected notification evidence:

```json
{
  "ownerNotification": {
    "type": "wish.support.offered",
    "wishTitle": "QA notif_1780603904291",
    "href": "/my-wishees",
    "actorEmail": "e2e-maya@wishees.local"
  },
  "helperNotification": {
    "type": "wish.support.replied",
    "wishTitle": "QA notif_1780603904291",
    "href": "/friends/wishlist?invite=user-12",
    "actorEmail": "e2e-alex@wishees.local"
  }
}
```

## Coverage

### Public Rendering

Passed:

- `/?lang=de`
- `/?lang=ar`
- `/?lang=ja`
- `/community?lang=de`
- `/terms?lang=de`
- `/privacy?lang=de`
- `/contact?lang=de`
- `/data-deletion?lang=de`
- `/affiliate-disclosure?lang=de`
- `/feedback?ref=qa-rerun&lang=de`
- `/account/login?mode=email&lang=de`
- `/account/login?mode=signup&lang=de`
- `/account/login/forgot-password?lang=de`
- `/wish?sharedWishId=missing-prod-rerun&lang=de`

Browser visual smoke also passed on key pages: no horizontal overflow and no captured browser console errors.

Screenshots:

- `/Users/thien.nguyen/thiennp.github.io/codex-automations/qa-screenshots-20260604-wishees-prod-rerun/home-de.png`
- `/Users/thien.nguyen/thiennp.github.io/codex-automations/qa-screenshots-20260604-wishees-prod-rerun/home-ar.png`
- `/Users/thien.nguyen/thiennp.github.io/codex-automations/qa-screenshots-20260604-wishees-prod-rerun/home-ja.png`
- `/Users/thien.nguyen/thiennp.github.io/codex-automations/qa-screenshots-20260604-wishees-prod-rerun/login-email-de.png`
- `/Users/thien.nguyen/thiennp.github.io/codex-automations/qa-screenshots-20260604-wishees-prod-rerun/login-signup-de.png`
- `/Users/thien.nguyen/thiennp.github.io/codex-automations/qa-screenshots-20260604-wishees-prod-rerun/forgot-password-de.png`
- `/Users/thien.nguyen/thiennp.github.io/codex-automations/qa-screenshots-20260604-wishees-prod-rerun/community-de.png`
- `/Users/thien.nguyen/thiennp.github.io/codex-automations/qa-screenshots-20260604-wishees-prod-rerun/invalid-wish-de.png`

### Auth And Account

Passed:

- Email/password login for Alex, Maya, Jordan, Lina.
- Alex/Maya/Jordan resolve as `member`.
- Lina resolves as `viewer`.
- Disabled account rejected with `account-disabled`.
- Wrong password rejected.
- Logout clears session.
- Signup password mismatch validation redirects with `error=password-mismatch`.
- Duplicate signup validation redirects with `error=account-exists`.
- Password change works.
- Old password rejected after password change.
- Temporary password accepted after password change.
- Original password restored and accepted.

### Protected Pages And Access Boundaries

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

### Profile And Gift Payment

Passed:

- Profile contact accounts save.
- Contact values visible after save.
- Contact values restored.
- Gift payment settings load.
- Gift payment settings save.
- Gift payment settings restored.

### Wishlist, Sharing, And Privacy

Passed:

- Wishlist loads.
- Disposable items created.
- Created items returned by owner API.
- Item edit saves.
- Shared wish opens for friends-visible item.
- Shared wishlist opens shareable list.
- Item-level private visibility saves.
- Private item is blocked from shared-wish API with 404.
- Disposable items deleted.

### Support, Replies, Notifications, Finish

Passed:

- Maya sends partial support with helper message.
- Owner receives `wish.support.offered` notification.
- Owner outcomes include Maya helper message.
- Owner reply saves on support offer.
- Helper receives `wish.support.replied` notification.
- Friend wishlist displays owner reply.
- Owner confirms support offer.
- Owner marks support finished.
- Deleting supported/confirmed wish removes owner outcomes.
- Support-related notifications are cleaned when removed wish is cleaned.

### Withdraw And Decline

Passed:

- Jordan sends full support offer.
- Jordan withdraws support offer.
- Maya sends support offer for decline path.
- Owner outcomes include decline-path support.
- Owner declines support offer.

### Friends And Invites

Passed:

- Friend request send to Lina.
- Lina sees incoming request.
- Alex sees outgoing request.
- Friend request status reports pending.
- Alex cancels request.
- Lina declines request.
- Lina accepts request.
- Accepted Lina appears connected.
- Lina connection removed.
- Friend invite created.
- Invite page renders.
- Existing Lina account accepts invite.
- Invite acceptance creates connection.
- Invite-created connection removed.

### Reports, Suggestions, Guards

Passed:

- Invalid friend report rejected with `invalid-report`.
- Self report rejected with `cannot-report-self`.
- Missing wish suggestion input rejected with `missing-wish`.
- Valid wish suggestions return suggestions.
- Product suggestions return marketplace candidates.
- Cross-origin product suggestion POST rejected with `same-origin-required`.

## Final Baseline

```json
{
  "wishlist": {
    "itemCount": 2,
    "visibility": "friends",
    "rerunItemsPresent": false
  },
  "outcomes": {
    "count": 0,
    "rerunOutcomesPresent": false
  },
  "notifications": {
    "alexUnread": 0,
    "mayaUnread": 0,
    "rerunNotificationsPresent": false
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

## Remaining Exclusions

Not executed in this round:

- Google login
- Facebook login
- Successful new-account signup, because there is no public cleanup route for a newly created production account
- Successful user report submission, because there is no public cleanup route for production report rows
