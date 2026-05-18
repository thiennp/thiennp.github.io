---
name: enrg-activity-list-staging-style
description: Coordinates CHECK24 Energy ActivityList styling, Figma comparison, Storybook preview, PRE-4131 publishing, and staging package updates.
---

# ENRG ActivityList Styling and Staging

## Scope

Use this workflow for the CHECK24 Energy "Vergleich fortsetzen" ActivityList
area. It covers Figma comparison, library styling, package preview, pre-release
publishing, and staging consumption.

Main repos:

```text
/Users/thien.nguyen/enrglib-frontend
/Users/thien.nguyen/enrg-energymodule
```

Package:

```text
@check24/activity-list
```

Consumer:

```text
/Users/thien.nguyen/enrg-energymodule/src/CMS/assets
```

## Design Sources

Desktop Figma node:

```text
https://www.figma.com/design/IogxA6ALcI3rV7uANWKmND/UX-Library?node-id=69183-31887&m=dev
```

Mobile Figma node:

```text
https://www.figma.com/design/IogxA6ALcI3rV7uANWKmND/UX-Library?node-id=69044-29448&m=dev
```

Important Figma values observed:

- Desktop row width: `1280px`
- Desktop row gap: `16px`
- Mobile row gap: `8px`
- Card radius: `10px`
- Card shadow: Figma `Default Shadow`, implement as `filter: drop-shadow(0 0 4px rgba(0, 0, 0, 0.16))`
- Desktop arrow shadow: `filter: drop-shadow(0 1px 5px rgba(0, 0, 0, 0.16))`
- Desktop headline: Inter, `24px`, `600`, `#181818`
- Mobile headline: SF Pro Display fallback stack, `20px`, `600`, `#181818`
- Desktop item: about `397.33px` wide, `113px` high, `padding: 16px 24px`, icon slot `80px`
- Mobile item: `334px` wide, `110px` high, right padding `16px`, icon slot `104px x 110px`

## Key Source Files

In `/Users/thien.nguyen/enrglib-frontend`:

```text
packages/activity-list/src/Components/Common/StyledElements/ActivityContainer.ts
packages/activity-list/src/Components/Layout/Elements/StyledLayoutElements.ts
packages/activity-list/src/Components/Layout/Elements/StyledLayouts.ts
packages/activity-list/src/Components/Layout/Layouts/SingelRowLayout/SingelRowLayout.tsx
packages/activity-list/src/Components/Layout/Layouts/TowRowLayout/Rows/ComparisonsRow.tsx
packages/activity-list/src/Components/Comparisons/Comparison.stories.tsx
```

Style responsibilities:

- `ActivityContainer.ts`
  - Card frame, card dimensions, hover state.
  - Use `filter: drop-shadow(...)`, not `box-shadow`, for parity with the Figma export.
- `StyledLayoutElements.ts`
  - Horizontal row, gaps, overflow behavior, arrow button.
  - Desktop must use visible overflow so shadows are not clipped.
  - Mobile keeps horizontal scroll and must have enough side/bottom padding for shadows.
  - Add `align-items: center` so the arrow is vertically centered with cards.
- `StyledLayouts.ts`
  - Outer ActivityList section.
  - Use `background-color: #fff` so the shadow reads like the Figma frame.
- `SingelRowLayout.tsx`
  - Desktop arrow visibility.
  - Do not show arrow for 3 or fewer comparisons.
  - Do not show arrow on mobile.
- `Comparison.stories.tsx`
  - Keep stories for:
    - desktop, 3 visible cards, no arrow
    - desktop, more than 3 total items, 3 visible cards plus arrow
    - mobile, 2 visible cards, no arrow

Current intended behavior:

```ts
const showContinueButton = !isMobile && leadCount === 0 && comparisonCount > 3;
```

Do not add a mobile arrow.

## Storybook Preview

Start ActivityList Storybook from the package directory:

```bash
cd /Users/thien.nguyen/enrglib-frontend/packages/activity-list
npm run storybook
```

Expected port:

```text
http://localhost:6007/
```

Useful direct URLs:

```text
http://localhost:6007/?path=/story/activity-list-vergleich-fortsetzen--desktop
http://localhost:6007/?path=/story/activity-list-vergleich-fortsetzen--desktop-with-more-items
http://localhost:6007/?path=/story/activity-list-vergleich-fortsetzen--mobile
```

Useful iframe URLs for screenshots:

```text
http://localhost:6007/iframe.html?id=activity-list-vergleich-fortsetzen--desktop&viewMode=story
http://localhost:6007/iframe.html?id=activity-list-vergleich-fortsetzen--desktop-with-more-items&viewMode=story
http://localhost:6007/iframe.html?id=activity-list-vergleich-fortsetzen--mobile&viewMode=story
```

Pitfalls:

- Port `6006` may belong to another Storybook, not `activity-list`.
- If Chrome has a stale `localhost:6007` tab but no process is listening, restart Storybook.
- Check with:

```bash
lsof -nP -iTCP:6007 -sTCP:LISTEN || true
```

- AppleScript JavaScript execution in Chrome may be disabled. Browser/Storybook screenshots through Codex in-app browser are often easier.
- Do not release to staging until the user confirms Storybook when they explicitly ask to review first.

## Local Verification

From `/Users/thien.nguyen/enrglib-frontend/packages/activity-list`:

```bash
npm run build
npm run build-storybook
```

`build-storybook` may warn about large bundles and outdated Browserslist data. That is expected in this package unless there is an actual build failure.

## Source Commit Flow

In `/Users/thien.nguyen/enrglib-frontend`:

```bash
git status --short --branch
git fetch origin PRE-4131
git rev-list --left-right --count HEAD...origin/PRE-4131
```

If local and remote have diverged, prefer rebasing onto `origin/PRE-4131` instead of force pushing.

Commit the source changes before publishing:

```bash
git add packages/activity-list/src/...
git commit -m "PRE-4131: fix(activity-list): <short description>"
git push origin PRE-4131
```

The source `packages/activity-list/package.json` version should normally remain the stable branch version, for example `4.3.0`. Only temporarily set the pre-release version for `npm publish`.

## Publish Test Package

Use the internal Nexus registry and a PRE-4131 pre-release version.

Example:

```bash
cd /Users/thien.nguyen/enrglib-frontend/packages/activity-list
npm run build
npm pkg set version=4.3.0-pre.4131.3
npm publish --tag pre-4131 --registry=https://nexus.energie.check24.de/repository/npm-internal/
npm pkg set version=4.3.0
```

Verify:

```bash
npm view @check24/activity-list@4.3.0-pre.4131.3 version dist-tags --registry=https://nexus.energie.check24.de/repository/npm-all/
```

Expected:

- The requested version exists.
- `pre-4131` points to the new version.
- `latest` stays unchanged. Do not disturb `latest`.

If `npm pkg set version=...` accidentally changes tracked files, restore the source package version to `4.3.0` and verify the repo is clean after publishing:

```bash
git status --short --branch
```

## Update Energymodule Staging

Work in:

```text
/Users/thien.nguyen/enrg-energymodule
```

The local `staging` branch may be stale or diverged. Prefer a fresh branch based on remote staging:

```bash
git fetch origin staging
git switch -C PRE-4131-staging-activity-list origin/staging
```

Install the exact published package from the CMS assets directory:

```bash
cd /Users/thien.nguyen/enrg-energymodule/src/CMS/assets
npm install @check24/activity-list@4.3.0-pre.4131.3 --save-exact --registry=https://nexus.energie.check24.de/repository/npm-all/
```

Expected files:

```text
src/CMS/assets/package.json
src/CMS/assets/package-lock.json
```

`npm install` can churn many unrelated `peer` flags in `package-lock.json`. Normalize the lockfile so only the root dependency and the package entry change:

```bash
cd /Users/thien.nguyen/enrg-energymodule
node <<'NODE'
const fs = require('fs');
const { execFileSync } = require('child_process');
const lockPath = 'src/CMS/assets/package-lock.json';
const base = JSON.parse(execFileSync('git', ['show', `HEAD:${lockPath}`], { encoding: 'utf8' }));
const current = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
base.packages[''].dependencies['@check24/activity-list'] = current.packages[''].dependencies['@check24/activity-list'];
base.packages['node_modules/@check24/activity-list'] = current.packages['node_modules/@check24/activity-list'];
fs.writeFileSync(lockPath, `${JSON.stringify(base, null, 4)}\n`);
NODE
```

Verify:

```bash
git diff -- src/CMS/assets/package.json src/CMS/assets/package-lock.json
node -p "const p=require('./package.json'); const l=require('./package-lock.json'); [p.dependencies['@check24/activity-list'], l.packages[''].dependencies['@check24/activity-list'], l.packages['node_modules/@check24/activity-list'].version].join(' | ')" 
```

Run the node command from:

```text
/Users/thien.nguyen/enrg-energymodule/src/CMS/assets
```

## Staging Build

The CMS staging build needs the same baseurl setup that Jenkins performs. Run from the repo root:

```bash
cd /Users/thien.nguyen/enrg-energymodule
cp -p ./config/autoload/staging/less-settings-baseurl.less ./src/Common/assets/common/less/settings/baseurl.less
cp -p ./config/autoload/staging/js-settings-baseurl.js ./src/Common/assets/common/js/baseurl.js
npm run build:staging --prefix ./src/CMS/assets
```

Common local failure:

```text
src/Common/assets/common/less/settings/baseurl.less missing
```

Fix by running the copy commands from the repo root, not from `src/CMS/assets`.

After the build, clean temporary staging config out of the candidate commit:

```bash
rm -f ./src/Common/assets/common/less/settings/baseurl.less
```

`src/Common/assets/common/js/baseurl.js` is tracked and may have been overwritten with staging URLs. Restore its checked-in dev values before committing:

```ts
export const BASE_URL_COMMON = 'http://energymodule.energie.check24-dev.de/';
export const BASE_URL_DESKTOP = 'http://energymodule.energie.check24-dev.de/';
export const BASE_URL_MOBILE = 'http://energymodule.energie.check24-dev.de/';
```

Only commit the package metadata files unless there is an explicit reason to commit generated assets:

```text
src/CMS/assets/package.json
src/CMS/assets/package-lock.json
```

Ignore pre-existing untracked `.rag/`.

## Push Staging

Before pushing:

```bash
git fetch origin staging
git rev-list --left-right --count HEAD...origin/staging
```

Commit:

```bash
git add src/CMS/assets/package.json src/CMS/assets/package-lock.json
git commit -m "PRE-4131: chore(cms): use activity-list staging package"
```

Push:

```bash
git push origin HEAD:staging
```

`Jenkinsfile.build` on `staging` runs `energy.buildPkg(...)` and `energy.deployPkg(...)`, so pushing `origin/staging` triggers the staging deployment.

## Final Handoff Checklist

Report:

- New `@check24/activity-list` version.
- Dist-tag check, especially that `latest` did not move.
- `enrglib-frontend` commit hash on `PRE-4131`.
- `enrg-energymodule` commit hash on `origin/staging`.
- Build commands run and whether they passed.
- Any leftover ignored/untracked local files, especially `.rag/`.
