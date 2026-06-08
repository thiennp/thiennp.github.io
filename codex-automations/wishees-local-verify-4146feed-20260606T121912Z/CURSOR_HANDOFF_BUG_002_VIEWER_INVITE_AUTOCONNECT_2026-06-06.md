# Cursor Handoff: BUG-002 Viewer Shared Wishlist Auto-Connects Friend

## Context
- Repo/worktree: `/Users/thien.nguyen/.cursor/worktrees/chords/wishees-cycle-01-auto`
- Current clean main commit under test: `4146feed000b6a79e25f0b5c86a6639251b1e751`
- Localhost verification base: `http://localhost:3000`
- QA artifacts: `/Users/thien.nguyen/thiennp.github.io/codex-automations/wishees-local-verify-4146feed-20260606T121912Z`
- Local env: `.env.local` is present in the clean worktree and ignored by git.
- Seed command already works: `npm run db:seed:e2e`

## Bug
**Severity: CRITICAL**

Viewer users can create a friend connection simply by opening another user's shared wishlist URL. A read-only viewer should not mutate the friend graph or become connected unless they explicitly accept an invite.

## Clean Reproduction
1. In the Chords worktree, seed the E2E users:
   ```bash
   npm run db:seed:e2e
   ```
2. Start localhost:
   ```bash
   npm run dev -- --port 3000
   ```
3. In the QA artifact folder, clear prior telemetry and run:
   ```bash
   cd /Users/thien.nguyen/thiennp.github.io/codex-automations/wishees-local-verify-4146feed-20260606T121912Z
   rm -f state.json events.jsonl telemetry.jsonl bugs.json
   WISHEES_BASE_URL=http://localhost:3000 node viewer-shared-wishlist-connection-smoke.mjs
   ```

## Observed Evidence
Before visiting the shared wishlist, Lina has no connected friends:
```json
{
  "friends": [],
  "ok": true,
  "ownerUserId": 15
}
```

Request that should be read-only:
```text
GET /friends/wishlist?invite=user-12&lang=de
```

After the page load, Lina is connected to Alex:
```json
{
  "friends": [
    {
      "email": "e2e-alex@wishees.local",
      "friendUserId": 12,
      "label": "E2E Alex"
    }
  ],
  "ok": true,
  "ownerUserId": 15
}
```

Full telemetry:
- `bugs.json`
- `events.jsonl`
- `telemetry.jsonl`

## Suspected Cause
`src/app/friends/wishlist/page.tsx` calls `recoverFriendInviteAccess` when `getAcceptedFriendInviteAccess` fails:

```ts
const acceptedInvite = await recoverFriendInviteAccess({
  ownerUserId: context.ownerUserId,
  sessionEmail: session.email,
});

if (acceptedInvite.ok) {
  redirect(friendWishlistPath(acceptedInvite.ownerUserId, language));
}
```

`src/app/friends/wishlist/recover-friend-invite-access.ts` currently calls `acceptFriendInvite`, and `acceptFriendInvite` upserts into `connections`. This means a plain page read can create a relationship.

## Expected Behavior
- `/friends/wishlist?invite=user-12&lang=de` must not create a connection for a viewer/member by page load alone.
- Lina (`viewer`) should remain disconnected after opening Alex's shared wishlist.
- Explicit accept flows such as `/friends/invite` or `/api/friends/accept-existing` should still be allowed to create a connection when the user intentionally accepts.
- Existing connected users, such as Maya and Jordan, must still be able to see Alex's shared wishlist and contribute according to role/permissions.

## Fix Requirements
- Remove the side effect from the shared wishlist page path.
- Add a regression test covering "shared wishlist page does not call accept/recover or create connection for an unconnected signed-in viewer."
- Keep explicit invite acceptance behavior intact and covered.
- Run:
  ```bash
  npm run commit:check
  npm run prepush:check
  ```
- Commit and push directly to `origin/main` without `--no-verify`.
- Restart or leave `localhost:3000` running from the Chords worktree after the fix so Codex can verify.

## Post-Fix Verification Command
Codex will rerun:
```bash
cd /Users/thien.nguyen/thiennp.github.io/codex-automations/wishees-local-verify-4146feed-20260606T121912Z
rm -f state.json events.jsonl telemetry.jsonl bugs.json
WISHEES_BASE_URL=http://localhost:3000 node viewer-shared-wishlist-connection-smoke.mjs
```
