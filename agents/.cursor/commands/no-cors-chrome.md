---
description: Open Chrome with --disable-web-security (macOS dev profile, isolated user-data-dir)
---

**macOS only.** Opens a separate Chrome instance with **`--disable-web-security`** so local dev can bypass CORS. Uses a disposable profile under **`/tmp/chrome_dev_test`**.

Only for trusted local debugging — do not browse the general web with this profile.

## Command

```text
open -n -a "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --args --user-data-dir="/tmp/chrome_dev_test" --disable-web-security
```

If Chrome lives elsewhere, adjust the **`open -a`** application path accordingly.
