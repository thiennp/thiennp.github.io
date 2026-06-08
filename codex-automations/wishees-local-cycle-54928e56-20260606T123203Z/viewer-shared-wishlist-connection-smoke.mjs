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
  alex: { email: "e2e-alex@wishees.local", password: "wishees-e2e-alex" },
  lina: { email: "e2e-lina@wishees.local", password: "wishees-e2e-lina" },
};

function nowIso() {
  return new Date().toISOString();
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

async function request(session, method, route, options = {}) {
  const headers = {
    accept: options.accept || "application/json,*/*",
    "user-agent": "Codex-Wishees-Viewer-Connection-Smoke/2026-06-06",
  };
  const cookie = session.jar.header();
  if (cookie) headers.cookie = cookie;
  if (method !== "GET") {
    headers.origin = BASE_URL;
    headers.referer = `${BASE_URL}/friends?lang=de`;
    headers["content-type"] = "application/json";
  }
  const started = Date.now();
  const response = await fetch(`${BASE_URL}${route}`, {
    method,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
    redirect: "follow",
  });
  session.jar.store(response.headers);
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  const event = {
    ts: nowIso(),
    runId: RUN_ID,
    session: session.name,
    feature: "friends",
    action: options.action || `${method} ${route}`,
    request: { method, route, body: options.body || null },
    response: {
      status: response.status,
      ok: response.ok,
      contentType: response.headers.get("content-type") || "",
      body: truncate(json || text, 1800),
    },
    durationMs: Date.now() - started,
    error: null,
  };
  await appendJsonl(EVENTS_FILE, event);
  return { response, text, json, event };
}

async function login(userKey) {
  const session = { name: userKey, jar: new CookieJar() };
  const user = USERS[userKey];
  const result = await request(session, "POST", "/api/auth/login", {
    action: `login ${userKey}`,
    body: {
      email: user.email,
      accessCode: user.password,
      next: "/profile?lang=de",
    },
  });
  if (!result.json?.ok) throw new Error(`Login failed for ${userKey}: ${result.text}`);
  return session;
}

function connectedIds(payload) {
  return (payload?.friends || []).map((friend) => Number(friend.friendUserId)).filter(Number.isFinite);
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
      id: `BUG-${String(state.bugs.length + 1).padStart(3, "0")}`,
      occurrences: 1,
      firstSeenAt: nowIso(),
      lastSeenAt: nowIso(),
      lastActualBehavior: bug.actualBehavior,
      lastEvidence: bug.evidence,
      ...bug,
    });
  }
  await saveJson(STATE_FILE, state);
  await saveJson(BUGS_FILE, state.bugs);
}

function coveragePercentage(state) {
  const keys = Object.keys(state.coverage || {});
  if (!keys.length) return "0%";
  const covered = keys.filter((key) => (state.coverage[key]?.count || 0) > 0).length;
  return `${Math.round((covered / keys.length) * 100)}%`;
}

async function emitTelemetry(state, activeWorkflow) {
  const telemetry = {
    elapsedTime: "00:00:00",
    currentUserSession: "lina+alex",
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

async function main() {
  const state = await loadJson(STATE_FILE, { coverage: {}, bugs: [] });
  state.coverage = state.coverage || {};

  const alex = await login("alex");
  const lina = await login("lina");

  const alexBefore = await request(alex, "GET", "/api/friends/connected", {
    action: "alex connected baseline before viewer connection smoke",
  });
  if (connectedIds(alexBefore.json).includes(15)) {
    await request(alex, "POST", "/api/friends/connected/15/remove", {
      action: "cleanup alex removes lina before viewer connection smoke",
    });
  }

  const before = await request(lina, "GET", "/api/friends/connected", {
    action: "lina connected baseline before shared wishlist visit",
  });
  const page = await request(lina, "GET", "/friends/wishlist?invite=user-12&lang=de", {
    accept: "text/html,application/xhtml+xml",
    action: "lina opens shared wishlist page",
  });
  const after = await request(lina, "GET", "/api/friends/connected", {
    action: "lina connected after shared wishlist visit",
  });

  const beforeIds = connectedIds(before.json);
  const afterIds = connectedIds(after.json);
  const createdConnection = !beforeIds.includes(12) && afterIds.includes(12);

  state.coverage["friends.viewer-shared-wishlist-page-does-not-create-connection"] = {
    count:
      (state.coverage["friends.viewer-shared-wishlist-page-does-not-create-connection"]?.count || 0) + 1,
    lastAt: nowIso(),
    lastDetail: {
      beforeIds,
      pageStatus: page.response.status,
      afterIds,
      createdConnection,
    },
  };

  if (createdConnection) {
    await recordBug(state, {
      severity: "CRITICAL",
      title: "Viewer shared wishlist page creates a friend connection",
      stepsToReproduce: [
        "Ensure e2e-lina@wishees.local has no connected friends",
        "Log in as e2e-lina@wishees.local",
        "GET /friends/wishlist?invite=user-12&lang=de",
        "Read /api/friends/connected for Lina",
      ],
      actualBehavior:
        "The read-only viewer page visit created a Lina -> Alex friend connection.",
      evidence: { runId: RUN_ID, before: before.json, pageStatus: page.response.status, after: after.json },
    });
    await request(alex, "POST", "/api/friends/connected/15/remove", {
      action: "cleanup alex removes lina after failed viewer connection smoke",
    });
  } else {
    await saveJson(STATE_FILE, state);
  }

  await emitTelemetry(
    state,
    createdConnection
      ? "viewer shared wishlist connection smoke failed"
      : "viewer shared wishlist connection smoke passed",
  );
}

main().catch(async (error) => {
  const state = await loadJson(STATE_FILE, { coverage: {}, bugs: [] });
  await recordBug(state, {
    severity: "CRITICAL",
    title: "Viewer shared wishlist connection smoke crashed",
    stepsToReproduce: ["Run node viewer-shared-wishlist-connection-smoke.mjs"],
    actualBehavior: error instanceof Error ? `${error.stack || error.message}` : String(error),
    evidence: { runId: RUN_ID },
  });
  console.error(error);
  process.exitCode = 1;
});
