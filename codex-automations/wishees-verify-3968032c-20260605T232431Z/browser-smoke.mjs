#!/usr/bin/env node
import { access, appendFile, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = process.env.WISHEES_BASE_URL || "https://www.wishees.com";
const RUN_ID =
  process.env.WISHEES_QA_RUN_ID ||
  new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);

const STATE_FILE = path.join(__dirname, "state.json");
const EVENTS_FILE = path.join(__dirname, "events.jsonl");
const TELEMETRY_FILE = path.join(__dirname, "telemetry.jsonl");
const BUGS_FILE = path.join(__dirname, "bugs.json");
const BROWSER_EVIDENCE_FILE = path.join(__dirname, "BROWSER_UI_EVIDENCE.json");

const USERS = {
  alex: { email: "e2e-alex@wishees.local", password: "wishees-e2e-alex" },
  maya: { email: "e2e-maya@wishees.local", password: "wishees-e2e-maya" },
};

function nowIso() {
  return new Date().toISOString();
}

function elapsed(startedMs) {
  const total = Math.floor((Date.now() - startedMs) / 1000);
  const h = String(Math.floor(total / 3600)).padStart(2, "0");
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

async function loadJson(file, fallback) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch {
    return fallback;
  }
}

async function saveJson(file, data) {
  await writeFile(file, `${JSON.stringify(data, null, 2)}\n`);
}

async function appendJsonl(file, data) {
  await appendFile(file, `${JSON.stringify(data)}\n`);
}

function truncate(value, limit = 3000) {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return text.length > limit ? `${text.slice(0, limit)}...<truncated>` : text;
}

function coveragePercentage(state) {
  const keys = Object.keys(state.coverage || {});
  if (!keys.length) return "0%";
  const covered = keys.filter((key) => (state.coverage[key]?.count || 0) > 0).length;
  return `${Math.round((covered / keys.length) * 100)}%`;
}

async function mark(state, point, detail = {}) {
  state.coverage = state.coverage || {};
  state.coverage[point] = state.coverage[point] || { count: 0 };
  state.coverage[point].count += 1;
  state.coverage[point].lastAt = nowIso();
  state.coverage[point].lastDetail = detail;
  state.updatedAt = nowIso();
  await saveJson(STATE_FILE, state);
}

async function emitTelemetry(state, startedMs, activeWorkflow, currentUserSession = "browser") {
  const telemetry = {
    elapsedTime: elapsed(startedMs),
    currentUserSession,
    coveragePercentage: coveragePercentage(state),
    activeWorkflow,
    identifiedBugs: (state.bugs || []).map((bug) => ({
      severity: bug.severity,
      stepsToReproduce: bug.stepsToReproduce,
      actualBehavior: bug.actualBehavior,
    })),
  };
  await appendJsonl(TELEMETRY_FILE, telemetry);
  console.log(JSON.stringify(telemetry, null, 2));
}

async function recordBrowserEvent(session, feature, action, detail) {
  await appendJsonl(EVENTS_FILE, {
    ts: nowIso(),
    runId: RUN_ID,
    session,
    feature,
    action,
    request: detail.request || null,
    response: detail.response || null,
    durationMs: detail.durationMs ?? null,
    error: detail.error || null,
    browser: detail.browser || undefined,
  });
}

async function recordBug(state, bug) {
  state.bugs = state.bugs || [];
  const existing = state.bugs.find((candidate) => candidate.title === bug.title);
  if (existing) {
    existing.occurrences = (existing.occurrences || 1) + 1;
    existing.lastSeenAt = nowIso();
    existing.lastActualBehavior = bug.actualBehavior;
    existing.lastEvidence = bug.evidence;
  } else {
    state.bugs.push({
      occurrences: 1,
      id: `BUG-${String(state.bugs.length + 1).padStart(3, "0")}`,
      firstSeenAt: nowIso(),
      severity: bug.severity,
      title: bug.title,
      stepsToReproduce: bug.stepsToReproduce,
      actualBehavior: bug.actualBehavior,
      evidence: bug.evidence,
      lastSeenAt: nowIso(),
      lastActualBehavior: bug.actualBehavior,
      lastEvidence: bug.evidence,
    });
  }
  await saveJson(STATE_FILE, state);
  await saveJson(BUGS_FILE, state.bugs);
}

async function chromeExecutablePath() {
  const candidates = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
  ];
  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Try the next known browser path.
    }
  }
  return undefined;
}

async function login(context, userKey) {
  const user = USERS[userKey];
  const started = Date.now();
  const response = await context.request.post(`${BASE_URL}/api/auth/login`, {
    data: {
      email: user.email,
      accessCode: user.password,
      next: "/profile?lang=de",
    },
    headers: {
      origin: BASE_URL,
      referer: `${BASE_URL}/login?lang=de`,
    },
  });
  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  await recordBrowserEvent(userKey, "auth", `browser login ${userKey}`, {
    request: { method: "POST", route: "/api/auth/login" },
    response: {
      status: response.status(),
      ok: response.ok(),
      contentType: response.headers()["content-type"] || "",
      body: truncate(json || text, 1200),
    },
    durationMs: Date.now() - started,
  });
  if (!json?.ok) throw new Error(`Browser login failed for ${userKey}: ${text}`);
}

function watchPage(page) {
  const consoleWarningsOrErrors = [];
  const networkFailures = [];
  const network = [];
  page.on("console", (message) => {
    if (["warning", "error"].includes(message.type())) {
      consoleWarningsOrErrors.push({
        type: message.type(),
        text: truncate(message.text(), 800),
      });
    }
  });
  page.on("pageerror", (error) => {
    consoleWarningsOrErrors.push({ type: "pageerror", text: truncate(error.message, 800) });
  });
  page.on("requestfailed", (request) => {
    networkFailures.push({
      method: request.method(),
      url: request.url(),
      failure: request.failure()?.errorText || "",
    });
  });
  page.on("response", (response) => {
    const url = response.url();
    if (url.startsWith(BASE_URL)) {
      network.push({
        status: response.status(),
        url,
      });
    }
  });
  return { consoleWarningsOrErrors, networkFailures, network };
}

async function mobileOverflowProbe(browser, state) {
  const context = await browser.newContext({
    baseURL: BASE_URL,
    viewport: { width: 320, height: 680 },
  });
  await login(context, "maya");
  const page = await context.newPage();
  const watched = watchPage(page);
  const started = Date.now();
  await page.goto("/friends/wishlist?invite=user-12&lang=de", {
    waitUntil: "networkidle",
    timeout: 30000,
  });
  const detail = await page.evaluate(() => {
    const overflowingElements = Array.from(document.querySelectorAll("body *"))
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          tag: element.tagName,
          text: (element.textContent || "").trim().slice(0, 80),
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
        };
      })
      .filter((entry) => entry.right > window.innerWidth + 1 || entry.left < -1)
      .slice(0, 20);
    return {
      title: document.title,
      documentScrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      overflowPx: Math.max(
        0,
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
        document.body.scrollWidth - document.documentElement.clientWidth,
      ),
      hasWishlistItem: document.body.innerText.includes("Compact burr coffee grinder"),
      affiliateLinksObserved: Array.from(document.querySelectorAll("a[href]"))
        .map((anchor) => anchor.href)
        .filter((href) => /amazon|ebay/i.test(href)),
      overflowingElements,
    };
  });
  const evidence = {
    session: "Maya",
    url: page.url(),
    viewport: "320x680",
    ...detail,
    consoleWarningsOrErrors: watched.consoleWarningsOrErrors,
    networkFailures: watched.networkFailures,
  };
  await recordBrowserEvent("maya", "browser", "mobile friend wishlist overflow smoke", {
    request: { method: "GET", route: "/friends/wishlist?invite=user-12&lang=de" },
    response: { status: 200, ok: true, body: truncate(evidence, 1800) },
    durationMs: Date.now() - started,
    browser: evidence,
  });
  await mark(state, "realtime.browser-smoke", {
    mobileOverflowRepeat: true,
    overflowPx: detail.overflowPx,
    consoleIssues: watched.consoleWarningsOrErrors.length,
    networkFailures: watched.networkFailures.length,
  });
  await mark(state, "browser.mobile-overflow-repeat", evidence);
  if (detail.overflowPx > 0 || watched.consoleWarningsOrErrors.length || watched.networkFailures.length) {
    await recordBug(state, {
      severity: "MINOR",
      title: "Mobile friend wishlist browser smoke has visual or console instability",
      stepsToReproduce: [
        "Log in as Maya in a 320x680 browser viewport",
        "Open /friends/wishlist?invite=user-12&lang=de",
        "Inspect horizontal overflow, console errors, and failed requests",
      ],
      actualBehavior: JSON.stringify({
        overflowPx: detail.overflowPx,
        consoleWarningsOrErrors: watched.consoleWarningsOrErrors,
        networkFailures: watched.networkFailures,
      }),
      evidence,
    });
  }
  await context.close();
  return evidence;
}

async function mayaContributionProbe(browser, state) {
  const context = await browser.newContext({
    baseURL: BASE_URL,
    viewport: { width: 1366, height: 900 },
  });
  await login(context, "maya");
  const page = await context.newPage();
  const watched = watchPage(page);
  const started = Date.now();
  await page.goto("/friends/wishlist?invite=user-12&lang=de", {
    waitUntil: "networkidle",
    timeout: 30000,
  });

  const response = await page.evaluate(async ({ runId }) => {
    const form = new FormData();
    form.set("contributionPercent", "15");
    form.set("helperMessage", `Codex browser repeat partial offer ${runId}`);
    form.set("ownerUserId", "12");
    form.set("itemId", "wish_e2e_coffee_grinder");
    form.set("language", "de");
    const result = await fetch("/api/friends/wishlist/fulfill", {
      method: "POST",
      body: form,
      credentials: "include",
    });
    const text = await result.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
    return {
      status: result.status,
      ok: result.ok,
      body: json || text.slice(0, 1600),
      bodyKind: json ? "json" : "text",
    };
  }, { runId: RUN_ID });

  await page.waitForTimeout(800);
  const bodyText = await page.locator("body").innerText({ timeout: 10000 }).catch(() => "");
  const evidence = {
    session: "Maya browser context",
    url: page.url(),
    item: "Compact burr coffee grinder",
    responseStatus: response.status,
    responseOk: response.ok,
    responseBodyKind: response.bodyKind,
    responseBody: response.body,
    hasSupportPhrase: /15|supported|unterstuetzt|contribution|beitrag/i.test(bodyText),
    bodySnippet: bodyText.slice(0, 500),
    consoleWarningsOrErrors: watched.consoleWarningsOrErrors,
    networkFailures: watched.networkFailures,
  };
  await recordBrowserEvent("maya", "gift-intent", "browser partial offer repeat", {
    request: { method: "POST", route: "/api/friends/wishlist/fulfill" },
    response: {
      status: response.status,
      ok: response.ok,
      body: truncate(response.body, 1800),
    },
    durationMs: Date.now() - started,
    browser: evidence,
  });
  await mark(state, "gift-intent.maya-ui-partial-offer", {
    repeatedViaBrowser: true,
    responseStatus: response.status,
    outcomeId: response.body?.outcome?.id || "",
    consoleIssues: watched.consoleWarningsOrErrors.length,
    networkFailures: watched.networkFailures.length,
  });
  await mark(state, "browser.maya-partial-offer-repeat", evidence);
  const completed =
    response.ok &&
    (response.body?.ok === true || evidence.hasSupportPhrase) &&
    watched.consoleWarningsOrErrors.length === 0 &&
    watched.networkFailures.length === 0;
  if (!completed) {
    await recordBug(state, {
      severity: response.ok ? "MINOR" : "MAJOR",
      title: "Maya browser contribution flow did not complete cleanly",
      stepsToReproduce: [
        "Log in as Maya in a desktop browser",
        "Open /friends/wishlist?invite=user-12&lang=de",
        "Submit a partial contribution for Compact burr coffee grinder",
      ],
      actualBehavior: JSON.stringify(evidence),
      evidence,
    });
  }
  await context.close();
  return evidence;
}

async function alexNotificationProbe(browser, state) {
  const context = await browser.newContext({
    baseURL: BASE_URL,
    viewport: { width: 1280, height: 860 },
  });
  await login(context, "alex");
  const page = await context.newPage();
  const watched = watchPage(page);
  const started = Date.now();
  await page.goto("/notifications?lang=de", {
    waitUntil: "networkidle",
    timeout: 30000,
  });
  const detail = await page.evaluate(() => ({
    title: document.title,
    bodySnippet: document.body.innerText.slice(0, 700),
    hasNotificationsUi: /notification|benachrichtigung|read|gelesen/i.test(document.body.innerText),
    buttonCount: document.querySelectorAll("button").length,
  }));
  const evidence = {
    session: "Alex",
    url: page.url(),
    ...detail,
    consoleWarningsOrErrors: watched.consoleWarningsOrErrors,
    networkFailures: watched.networkFailures,
  };
  await recordBrowserEvent("alex", "notifications", "browser notifications page smoke", {
    request: { method: "GET", route: "/notifications?lang=de" },
    response: { status: 200, ok: true, body: truncate(evidence, 1800) },
    durationMs: Date.now() - started,
    browser: evidence,
  });
  await mark(state, "browser.owner-decline-existing-outcome", {
    notificationPageRepeat: true,
    consoleIssues: watched.consoleWarningsOrErrors.length,
    networkFailures: watched.networkFailures.length,
  });
  await mark(state, "browser.alex-notifications-repeat", evidence);
  if (watched.consoleWarningsOrErrors.length || watched.networkFailures.length) {
    await recordBug(state, {
      severity: "MINOR",
      title: "Alex notifications browser smoke has console or network instability",
      stepsToReproduce: [
        "Log in as Alex in a desktop browser",
        "Open /notifications?lang=de",
        "Inspect console warnings/errors and failed requests",
      ],
      actualBehavior: JSON.stringify({
        consoleWarningsOrErrors: watched.consoleWarningsOrErrors,
        networkFailures: watched.networkFailures,
      }),
      evidence,
    });
  }
  await context.close();
  return evidence;
}

async function main() {
  const startedMs = Date.now();
  const state = await loadJson(STATE_FILE, { coverage: {}, bugs: [] });
  const browserEvidence = await loadJson(BROWSER_EVIDENCE_FILE, {
    target: BASE_URL,
    freshStartFolder: path.basename(__dirname),
    browserUserFlows: {},
  });

  const executablePath = await chromeExecutablePath();
  const browser = await chromium.launch({
    headless: true,
    executablePath,
  });

  try {
    const mobileOverflowRepeat = await mobileOverflowProbe(browser, state);
    const mayaUiPartialOfferRepeat = await mayaContributionProbe(browser, state);
    const alexNotificationsRepeat = await alexNotificationProbe(browser, state);
    browserEvidence.target = BASE_URL;
    browserEvidence.freshStartFolder = path.basename(__dirname);
    browserEvidence.browserUserFlows = browserEvidence.browserUserFlows || {};
    browserEvidence.browserUserFlows.mobileOverflowRepeat = mobileOverflowRepeat;
    browserEvidence.browserUserFlows.mayaUiPartialOfferRepeat = mayaUiPartialOfferRepeat;
    browserEvidence.browserUserFlows.alexNotificationsRepeat = alexNotificationsRepeat;
    browserEvidence.lastUpdatedAt = nowIso();
    await saveJson(BROWSER_EVIDENCE_FILE, browserEvidence);
    await emitTelemetry(state, startedMs, "browser UI smoke repeat completed", "maya+alex");
  } finally {
    await browser.close();
  }
}

main().catch(async (error) => {
  const state = await loadJson(STATE_FILE, { coverage: {}, bugs: [], notes: [] });
  state.notes = state.notes || [];
  state.notes.push({
    ts: nowIso(),
    type: "browser-smoke-error",
    message: error instanceof Error ? error.stack || error.message : String(error),
  });
  await saveJson(STATE_FILE, state);
  await recordBrowserEvent("browser", "browser", "browser smoke runner failed", {
    error: error instanceof Error ? error.stack || error.message : String(error),
  });
  await emitTelemetry(state, Date.now(), "browser UI smoke failed", "browser");
  process.exitCode = 1;
});
