# Git cherry-pick fix onto staging

Bring a **specific fix commit** (or a short series) onto **`staging`**, then update **remote `staging`**.

Use when the fix already exists on **`release`** or on the **fix branch** (after **`/commit-comprehensive`**), and **`staging`** must carry the same patch before or after the **`release`** PR merges — per team policy.

**Steps (repository root, via your Git integration):**

1. **Record** the fix commit SHA (from **`git log`** on the fix branch or from **`release`** after merge).
2. **Fetch** **origin**.
3. **Check out `staging`** and align with **origin/staging** (fast-forward pull when a simple sync is enough; if **`staging`** is behind policy, follow **`/staging-rebase-onto-release`** first when that matches team process).
4. **Cherry-pick** the recorded SHA(s). Resolve conflicts, continue the cherry-pick sequence until clean.
5. **Push** **staging** to **origin** — confirm **`git push`** with the user (**`.cursor/rules/commit-workflow.mdc`**). Use **`--force-with-lease`** only when your workflow already allows rewriting **`origin/staging`** (see **`.cursor/docs/workflows/playbooks/git-bitbucket/staging-rebase-onto-release.md`**).

If **`staging`** does not exist locally or on the remote, stop and report the blocker.

Orientation: **`.cursor/skills/git-staging-and-split-commits/SKILL.md`**, **`/staging-rebase-onto-release`**.
