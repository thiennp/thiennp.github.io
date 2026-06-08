#!/usr/bin/env node
import { access, appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
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
const EVIDENCE_FILE = path.join(__dirname, "UI_I18N_EVIDENCE.json");
const LOG_DIR = path.join(__dirname, "logs");

const USERS = {
  alex: { email: "e2e-alex@wishees.local", password: "wishees-e2e-alex" },
  maya: { email: "e2e-maya@wishees.local", password: "wishees-e2e-maya" },
  lina: { email: "e2e-lina@wishees.local", password: "wishees-e2e-lina" },
};

const SCENARIOS = [
  { name: "home-de-desktop", route: "/?lang=de", expectedLang: "de", viewport: desktop() },
  { name: "home-en-mobile", route: "/?lang=en", expectedLang: "en", viewport: mobile() },
  { name: "account-login-de-mobile", route: "/account/login?lang=de", expectedLang: "de", viewport: mobile() },
  {
    name: "my-wishees-de-mobile-alex",
    route: "/my-wishees?lang=de",
    expectedLang: "de",
    viewport: mobile(),
    user: "alex",
  },
  {
    name: "friends-de-desktop-maya",
    route: "/friends?lang=de",
    expectedLang: "de",
    viewport: desktop(),
    user: "maya",
  },
  {
    name: "friend-wishlist-de-mobile-maya",
    route: "/friends/wishlist?invite=user-12&lang=de",
    expectedLang: "de",
    viewport: mobile(),
    user: "maya",
  },
  {
    name: "viewer-friend-wishlist-de-mobile-lina",
    route: "/friends/wishlist?invite=user-12&lang=de",
    expectedLang: "de",
    viewport: mobile(),
    user: "lina",
  },
];

function desktop() {
  return { width: 1440, height: 900 };
}

function mobile() {
  return { width: 320, height: 680 };
}

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

async function emitTelemetry(state, startedMs, activeWorkflow, currentUserSession = "ui-i18n") {
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
  await appendJsonl(EVENTS_FILE, {
    ts: nowIso(),
    runId: RUN_ID,
    session: userKey,
    feature: "ui-i18n",
    action: `login ${userKey}`,
    request: { method: "POST", route: "/api/auth/login" },
    response: {
      status: response.status(),
      ok: response.ok(),
      contentType: response.headers()["content-type"] || "",
      body: truncate(text, 1200),
    },
    durationMs: Date.now() - started,
    error: null,
  });
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  if (!json?.ok) throw new Error(`UI smoke login failed for ${userKey}: ${text}`);
}

function watchPage(page) {
  const consoleWarningsOrErrors = [];
  const networkFailures = [];
  const badResponses = [];
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
    if (url.startsWith(BASE_URL) && response.status() >= 400) {
      badResponses.push({ status: response.status(), url });
    }
  });
  return { consoleWarningsOrErrors, networkFailures, badResponses };
}

function englishLeakPatterns() {
  return [
    /\bSign in\b/g,
    /\bLog in\b/g,
    /\bCreate\b/g,
    /\bDelete\b/g,
    /\bCancel\b/g,
    /\bSave\b/g,
    /\bShare\b/g,
    /\bFriends\b/g,
    /\bNotifications\b/g,
    /\bLoading\b/g,
    /\bError\b/g,
    /\bEdit\b/g,
    /\bView\b/g,
    /\bWishlist\b/g,
  ];
}

async function auditScenario(browser, state, scenario) {
  const context = await browser.newContext({
    baseURL: BASE_URL,
    viewport: scenario.viewport,
  });
  if (scenario.user) await login(context, scenario.user);
  const page = await context.newPage();
  const watched = watchPage(page);
  const started = Date.now();
  let gotoError = null;
  let status = null;
  try {
    const response = await page.goto(scenario.route, { waitUntil: "networkidle", timeout: 30000 });
    status = response?.status() || null;
  } catch (error) {
    gotoError = error instanceof Error ? error.message : String(error);
  }
  await page.waitForTimeout(500);
  const screenshot = path.join(LOG_DIR, `ui-i18n-${RUN_ID}-${scenario.name}.png`);
  await page.screenshot({ path: screenshot, fullPage: true });
  const detail = await page.evaluate(
    ({ expectedLang }) => {
      const text = document.body.innerText || "";
      const isVisible = (element) => {
        const style = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.visibility !== "hidden" && style.display !== "none" && rect.width > 0 && rect.height > 0;
      };
      const accessibleName = (element) =>
        [
          element.getAttribute("aria-label"),
          element.getAttribute("title"),
          element.textContent,
          element.getAttribute("alt"),
          element.getAttribute("placeholder"),
        ]
          .filter(Boolean)
          .join(" ")
          .trim();
      const badKeyMatches = Array.from(
        new Set(
          text.match(
            /\b(?:account|auth|common|errors?|friends|gift|homepage|notifications|profile|wish(?:ees|list)?)\.[a-z0-9_.-]+\b/gi,
          ) || [],
        ),
      )
        .filter((match) => !match.endsWith(".local"))
        .slice(0, 20);
      const templateTokens = Array.from(
        new Set(text.match(/{{[^}]+}}|%{[^}]+}|\[[A-Z][A-Z0-9_]+\]/g) || []),
      ).slice(0, 20);
      const overflowingElements = Array.from(document.querySelectorAll("body *"))
        .filter(isVisible)
        .map((element) => {
          const rect = element.getBoundingClientRect();
          return {
            tag: element.tagName,
            text: (element.textContent || "").trim().replace(/\s+/g, " ").slice(0, 100),
            left: Math.round(rect.left),
            right: Math.round(rect.right),
            width: Math.round(rect.width),
          };
        })
        .filter((entry) => entry.right > window.innerWidth + 2 || entry.left < -2)
        .slice(0, 20);
      const clippedTextElements = Array.from(
        document.querySelectorAll("button, a, input, textarea, select, [role='button'], [role='link']"),
      )
        .filter(isVisible)
        .filter((element) => element.scrollWidth > element.clientWidth + 2)
        .map((element) => ({
          tag: element.tagName,
          text: accessibleName(element).replace(/\s+/g, " ").slice(0, 100),
          scrollWidth: element.scrollWidth,
          clientWidth: element.clientWidth,
        }))
        .slice(0, 20);
      const unnamedControls = Array.from(
        document.querySelectorAll("button, a[href], input, textarea, select, [role='button'], [role='link']"),
      )
        .filter(isVisible)
        .filter((element) => !accessibleName(element))
        .map((element) => ({
          tag: element.tagName,
          type: element.getAttribute("type") || "",
          href: element.getAttribute("href") || "",
          role: element.getAttribute("role") || "",
        }))
        .slice(0, 20);
      const englishTerms =
        expectedLang === "de"
          ? [
              "Sign in",
              "Log in",
              "Create",
              "Delete",
              "Cancel",
              "Save",
              "Share",
              "Friends",
              "Notifications",
              "Loading",
              "Error",
              "Edit",
              "View",
              "Wishlist",
            ].filter((term) => new RegExp(`\\b${term}\\b`, "i").test(text))
          : [];
      return {
        title: document.title,
        htmlLang: document.documentElement.lang || "",
        htmlLangMismatch: expectedLang
          ? !(document.documentElement.lang || "").toLowerCase().startsWith(expectedLang)
          : false,
        documentScrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        overflowPx: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
        badKeyMatches,
        templateTokens,
        englishTerms,
        unnamedControls,
        overflowingElements,
        clippedTextElements,
        bodySample: text.replace(/\s+/g, " ").slice(0, 500),
      };
    },
    { expectedLang: scenario.expectedLang },
  );
  const event = {
    ts: nowIso(),
    runId: RUN_ID,
    session: scenario.user || "anonymous",
    feature: "ui-i18n",
    action: scenario.name,
    request: { method: "GET", route: scenario.route },
    response: { status, ok: status ? status < 400 : false, body: truncate(detail, 2000) },
    durationMs: Date.now() - started,
    error: gotoError,
    browser: {
      viewport: scenario.viewport,
      screenshot,
      consoleWarningsOrErrors: watched.consoleWarningsOrErrors,
      networkFailures: watched.networkFailures,
      badResponses: watched.badResponses,
    },
  };
  await appendJsonl(EVENTS_FILE, event);
  await context.close();
  return {
    scenario,
    status,
    gotoError,
    screenshot,
    detail,
    consoleWarningsOrErrors: watched.consoleWarningsOrErrors,
    networkFailures: watched.networkFailures,
    badResponses: watched.badResponses,
  };
}

function scenarioHasBug(result) {
  const hardTranslationIssues =
    result.detail.badKeyMatches.length ||
    result.detail.templateTokens.length ||
    result.detail.htmlLangMismatch;
  const uiIssues =
    result.detail.overflowPx > 2 ||
    result.detail.overflowingElements.length ||
    result.detail.clippedTextElements.length ||
    result.detail.unnamedControls.length;
  const runtimeIssues =
    result.gotoError ||
    (result.status && result.status >= 400) ||
    result.consoleWarningsOrErrors.length ||
    result.networkFailures.some(
      (failure) => failure.failure !== "net::ERR_ABORTED" || !failure.url.includes("_rsc="),
    ) ||
    result.badResponses.some((response) => !/favicon|robots|sitemap/i.test(response.url));
  const likelyGermanCopyLeak = result.scenario.expectedLang === "de" && result.detail.englishTerms.length >= 2;
  return Boolean(hardTranslationIssues || uiIssues || runtimeIssues || likelyGermanCopyLeak);
}

async function main() {
  await mkdir(LOG_DIR, { recursive: true });
  const startedMs = Date.now();
  const state = await loadJson(STATE_FILE, { coverage: {}, bugs: [] });
  const browser = await chromium.launch({
    headless: true,
    executablePath: await chromeExecutablePath(),
  });
  const results = [];
  try {
    for (const scenario of SCENARIOS) {
      const result = await auditScenario(browser, state, scenario);
      results.push(result);
      await mark(state, `ui-i18n.${scenario.name}`, {
        status: result.status,
        route: scenario.route,
        viewport: scenario.viewport,
        overflowPx: result.detail.overflowPx,
        htmlLang: result.detail.htmlLang,
        htmlLangMismatch: result.detail.htmlLangMismatch,
        badKeyMatches: result.detail.badKeyMatches,
        templateTokens: result.detail.templateTokens,
        englishTerms: result.detail.englishTerms,
        unnamedControlCount: result.detail.unnamedControls.length,
        clippedTextCount: result.detail.clippedTextElements.length,
        screenshot: result.screenshot,
      });
    }
  } finally {
    await browser.close();
  }

  const failing = results.filter(scenarioHasBug);
  await saveJson(EVIDENCE_FILE, {
    runId: RUN_ID,
    baseUrl: BASE_URL,
    generatedAt: nowIso(),
    failingCount: failing.length,
    results,
  });
  if (failing.length) {
    await recordBug(state, {
      severity: failing.some((result) => result.gotoError || (result.status && result.status >= 500))
        ? "MAJOR"
        : "MINOR",
      title: "UI and translation smoke found visual, accessibility, or localization issues",
      stepsToReproduce: [
        "Run node ui-i18n-smoke.mjs",
        "Open the listed routes in German and English across mobile and desktop viewports",
        "Inspect overflow, control labels, html lang, translation keys, and German copy",
      ],
      actualBehavior: `${failing.length} scenario(s) showed UI/i18n instability. See UI_I18N_EVIDENCE.json and screenshots in logs/.`,
      evidence: {
        runId: RUN_ID,
        failingScenarios: failing.map((result) => ({
          name: result.scenario.name,
          route: result.scenario.route,
          status: result.status,
          screenshot: result.screenshot,
          detail: result.detail,
          consoleWarningsOrErrors: result.consoleWarningsOrErrors,
          networkFailures: result.networkFailures,
          badResponses: result.badResponses,
        })),
      },
    });
  }
  await emitTelemetry(state, startedMs, "ui and translation smoke completed", "ui-i18n");
}

main().catch(async (error) => {
  const state = await loadJson(STATE_FILE, { coverage: {}, bugs: [] });
  await recordBug(state, {
    severity: "CRITICAL",
    title: "UI and translation smoke crashed",
    stepsToReproduce: ["Run node ui-i18n-smoke.mjs"],
    actualBehavior: error instanceof Error ? `${error.stack || error.message}` : String(error),
    evidence: { runId: RUN_ID },
  });
  console.error(error);
  process.exitCode = 1;
});
