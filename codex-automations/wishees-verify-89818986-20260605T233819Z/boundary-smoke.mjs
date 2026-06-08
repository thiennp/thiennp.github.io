#!/usr/bin/env node
import { appendFile, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = process.env.WISHEES_BASE_URL || "https://www.wishees.com";
const RUN_ID =
  process.env.WISHEES_QA_RUN_ID ||
  new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);

const STATE_FILE = path.join(__dirname, "state.json");
const EVENTS_FILE = path.join(__dirname, "events.jsonl");
const TELEMETRY_FILE = path.join(__dirname, "telemetry.jsonl");
const BUGS_FILE = path.join(__dirname, "bugs.json");

const USERS = {
  lina: { email: "e2e-lina@wishees.local", password: "wishees-e2e-lina" },
  disabled: { email: "e2e-disabled@wishees.local", password: "wishees-e2e-disabled" },
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

function splitSetCookie(header) {
  if (!header) return [];
  return header.split(/,(?=\s*[^;,\s]+=)/g);
}

class CookieJar {
  constructor() {
    this.cookies = new Map();
  }

  header() {
    return [...this.cookies.entries()].map(([key, value]) => `${key}=${value}`).join("; ");
  }

  store(headers) {
    const raw =
      typeof headers.getSetCookie === "function"
        ? headers.getSetCookie()
        : splitSetCookie(headers.get("set-cookie"));
    for (const cookie of raw) {
      const [pair] = cookie.split(";");
      const index = pair.indexOf("=");
      if (index <= 0) continue;
      this.cookies.set(pair.slice(0, index).trim(), pair.slice(index + 1).trim());
    }
  }
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

async function emitTelemetry(state, startedMs, activeWorkflow, currentUserSession = "matrix") {
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

class QaSession {
  constructor(name, state) {
    this.name = name;
    this.state = state;
    this.jar = new CookieJar();
  }

  async request(method, route, options = {}) {
    const url = route.startsWith("http") ? route : `${BASE_URL}${route}`;
    const headers = {
      accept: "application/json,text/html;q=0.9,*/*;q=0.8",
      "user-agent": "Codex-Wishees-QA-Boundary-Smoke/2026-06-05",
      ...(options.headers || {}),
    };
    if (!route.startsWith("http") && method !== "GET" && method !== "HEAD") {
      headers.origin = headers.origin || BASE_URL;
      headers.referer = headers.referer || `${BASE_URL}/my-wishees?lang=de`;
    }
    const cookie = this.jar.header();
    if (cookie) headers.cookie = cookie;
    let body;
    let eventBody;
    if (options.body !== undefined) {
      headers["content-type"] = headers["content-type"] || "application/json";
      body = JSON.stringify(options.body);
      eventBody = body;
    }
    const started = Date.now();
    let response;
    let text = "";
    let json = null;
    let error = null;
    try {
      response = await fetch(url, {
        method,
        headers,
        body,
        redirect: options.redirect || "follow",
        signal: AbortSignal.timeout(options.timeoutMs || 20000),
      });
      this.jar.store(response.headers);
      text = await response.text();
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        json = null;
      }
    } catch (err) {
      error = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    }
    const event = {
      ts: nowIso(),
      runId: RUN_ID,
      session: this.name,
      feature: options.feature || "boundary",
      action: options.action || `${method} ${route}`,
      request: {
        method,
        route,
        body: eventBody ? truncate(eventBody, 1800) : undefined,
      },
      response: response
        ? {
            status: response.status,
            ok: response.ok,
            contentType: response.headers.get("content-type") || "",
            body: truncate(json || text, 3000),
          }
        : null,
      durationMs: Date.now() - started,
      error,
    };
    await appendJsonl(EVENTS_FILE, event);
    return { response, text, json, error, event };
  }

  async login(userKey) {
    const user = USERS[userKey];
    return this.request("POST", "/api/auth/login", {
      feature: "auth",
      action: `boundary smoke login ${userKey}`,
      body: {
        email: user.email,
        accessCode: user.password,
        next: "/profile?lang=de",
      },
    });
  }
}

function makeViewerShapeWish(kind) {
  const timestamp = nowIso();
  return {
    id: `wish_codex_matrix_${RUN_ID}_viewer_${kind}_shape`,
    title: `Codex explicit viewer ${kind} ${RUN_ID}`,
    note: `Automated viewer boundary probe ${RUN_ID}. Safe to delete.`,
    url: "https://www.amazon.de/dp/B08N5WRWNW?tag=wishees-qa-21&psc=1",
    price: "19.99",
    currency: "EUR",
    recipientName: "Codex QA",
    giftPaymentMethod: "paypal",
    giftPaymentAccount: "qa-paypal@example.test",
    giftPaymentOtherLabel: "",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

async function main() {
  const startedMs = Date.now();
  const state = await loadJson(STATE_FILE, { coverage: {}, bugs: [] });

  const lina = new QaSession("lina-explicit-viewer-shapes-repeat", state);
  await lina.login("lina");
  const before = await lina.request("GET", "/api/account/wishlist", {
    feature: "boundary",
    action: "viewer wishlist baseline before explicit shapes",
  });
  const update = await lina.request("PUT", "/api/account/wishlist", {
    feature: "boundary",
    action: "viewer wishlist update-shaped PUT denied repeat",
    body: {
      currency: "EUR",
      visibility: "friends",
      items: [makeViewerShapeWish("update")],
    },
  });
  const remove = await lina.request("PUT", "/api/account/wishlist", {
    feature: "boundary",
    action: "viewer wishlist delete-shaped PUT denied repeat",
    body: {
      currency: "EUR",
      visibility: "friends",
      items: [],
    },
  });
  const after = await lina.request("GET", "/api/account/wishlist", {
    feature: "boundary",
    action: "viewer wishlist after explicit shapes",
  });

  const updateDenied = update.response?.status === 403 && update.json?.reason === "invalid-action";
  const deleteDenied = remove.response?.status === 403 && remove.json?.reason === "invalid-action";
  await mark(state, "boundary.viewer-wishlist-update-denied", {
    status: update.response?.status,
    body: update.json,
    baselineStatus: before.response?.status,
    repeated: true,
  });
  await mark(state, "boundary.viewer-wishlist-delete-denied", {
    status: remove.response?.status,
    body: remove.json,
    baselineStatus: before.response?.status,
    repeated: true,
  });
  await mark(state, "boundary.viewer-wishlist-put-shapes-fix-verified", {
    beforeStatus: before.response?.status,
    updateStatus: update.response?.status,
    updateBody: update.json,
    deleteStatus: remove.response?.status,
    deleteBody: remove.json,
    afterStatus: after.response?.status,
    repeated: true,
  });
  if (!updateDenied || !deleteDenied) {
    await recordBug(state, {
      severity: "CRITICAL",
      title: "Viewer wishlist explicit update/delete shape was not denied",
      stepsToReproduce: [
        "Log in as Lina viewer",
        "PUT /api/account/wishlist with an update-shaped payload",
        "PUT /api/account/wishlist with an empty delete-shaped payload",
      ],
      actualBehavior: JSON.stringify({
        updateStatus: update.response?.status,
        updateBody: update.json,
        deleteStatus: remove.response?.status,
        deleteBody: remove.json,
      }),
      evidence: updateDenied ? remove.event : update.event,
    });
  }

  const disabled = new QaSession("disabled-boundary-repeat", state);
  await disabled.login("disabled");
  const disabledAccount = await disabled.request("GET", "/api/account/wishlist", {
    feature: "boundary",
    action: "disabled direct account api denied repeat",
  });
  const disabledShare = await disabled.request("GET", "/api/wishlist/share?sharedUserId=12", {
    feature: "boundary",
    action: "disabled direct shared wishlist api denied repeat",
  });
  const disabledDirectWish = await disabled.request("GET", "/wish?sharedWishId=wish_e2e_noise_headphones&lang=de", {
    feature: "boundary",
    action: "disabled direct shared wish page denied repeat",
  });
  const titleLeaked = String(disabledDirectWish.text || "").includes("Noise-canceling headphones");
  await mark(state, "boundary.disabled-direct-account-api-denied", {
    status: disabledAccount.response?.status,
    body: disabledAccount.json,
    repeated: true,
  });
  await mark(state, "boundary.disabled-shared-api-denied", {
    status: disabledShare.response?.status,
    body: disabledShare.json,
    repeated: true,
  });
  await mark(state, "boundary.disabled-direct-shared-wish-page-denied", {
    status: disabledDirectWish.response?.status,
    includesTitle: titleLeaked,
    repeated: true,
  });
  if (disabledAccount.json?.ok === true || disabledShare.json?.ok === true || titleLeaked) {
    await recordBug(state, {
      severity: "CRITICAL",
      title: "Disabled account boundary leaked wishlist data",
      stepsToReproduce: [
        "Attempt login as disabled E2E account",
        "GET account wishlist, shared wishlist API, and direct shared wish page",
      ],
      actualBehavior: JSON.stringify({
        accountStatus: disabledAccount.response?.status,
        accountBody: disabledAccount.json,
        shareStatus: disabledShare.response?.status,
        shareBody: disabledShare.json,
        directWishStatus: disabledDirectWish.response?.status,
        directWishIncludesTitle: titleLeaked,
      }),
      evidence: titleLeaked ? disabledDirectWish.event : disabledAccount.event,
    });
  }

  await emitTelemetry(state, startedMs, "explicit viewer/disabled boundary smoke completed", "lina+disabled");
}

main().catch(async (error) => {
  const state = await loadJson(STATE_FILE, { coverage: {}, bugs: [], notes: [] });
  state.notes = state.notes || [];
  state.notes.push({
    ts: nowIso(),
    type: "boundary-smoke-error",
    message: error instanceof Error ? error.stack || error.message : String(error),
  });
  await saveJson(STATE_FILE, state);
  await emitTelemetry(state, Date.now(), "explicit boundary smoke failed", "boundary");
  process.exitCode = 1;
});
