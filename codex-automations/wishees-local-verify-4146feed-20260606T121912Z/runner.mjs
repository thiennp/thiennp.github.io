#!/usr/bin/env node
import { mkdir, readFile, writeFile, appendFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = process.env.WISHEES_BASE_URL || "https://www.wishees.com";
const REQUESTED_TARGET = "https://wishees/";
const RUN_ID =
  process.env.WISHEES_QA_RUN_ID ||
  new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
const RUN_PREFIX = `wish_codex_matrix_${RUN_ID}`;

const STATE_FILE = path.join(__dirname, "state.json");
const EVENTS_FILE = path.join(__dirname, "events.jsonl");
const TELEMETRY_FILE = path.join(__dirname, "telemetry.jsonl");
const BUGS_FILE = path.join(__dirname, "bugs.json");

const USERS = {
  alex: {
    email: "e2e-alex@wishees.local",
    password: "wishees-e2e-alex",
    role: "member",
    status: "active",
  },
  maya: {
    email: "e2e-maya@wishees.local",
    password: "wishees-e2e-maya",
    role: "member",
    status: "active",
  },
  jordan: {
    email: "e2e-jordan@wishees.local",
    password: "wishees-e2e-jordan",
    role: "member",
    status: "active",
  },
  lina: {
    email: "e2e-lina@wishees.local",
    password: "wishees-e2e-lina",
    role: "viewer",
    status: "active",
  },
  disabled: {
    email: "e2e-disabled@wishees.local",
    password: "wishees-e2e-disabled",
    role: "viewer",
    status: "disabled",
  },
};

const COVERAGE_POINTS = [
  "target.host-resolution",
  "auth.member-login.alex",
  "auth.member-login.maya",
  "auth.member-login.jordan",
  "auth.viewer-login.lina",
  "auth.disabled-rejected",
  "auth.wrong-password-rejected",
  "boundary.unauthenticated-account-api",
  "boundary.unauthenticated-shared-api-denied",
  "boundary.viewer-wishlist-write-denied",
  "boundary.viewer-wishlist-update-denied",
  "boundary.viewer-wishlist-delete-denied",
  "boundary.viewer-support-denied",
  "boundary.disabled-direct-account-api-denied",
  "boundary.disabled-shared-api-denied",
  "boundary.disabled-friend-wishlist-page-denied",
  "boundary.disabled-direct-shared-wish-page-denied",
  "boundary.unauthenticated-direct-shared-wish-page-observed",
  "boundary.disabled-support-denied",
  "boundary.non-owner-outcome-decision-denied",
  "boundary.viewer-outcome-decision-denied",
  "boundary.disabled-outcome-decision-denied",
  "boundary.unauthenticated-outcome-decision-denied",
  "boundary.non-helper-outcome-cancel-denied",
  "boundary.viewer-outcome-cancel-denied",
  "boundary.disabled-outcome-cancel-denied",
  "boundary.unauthenticated-outcome-cancel-denied",
  "wishlist.owner-read",
  "wishlist.owner-create",
  "wishlist.owner-update",
  "wishlist.owner-delete-cleanup",
  "wishlist.affiliate-url-persists",
  "wishlist.unsafe-url-sanitized",
  "wishlist.html-title-escaped",
  "gift-intent.helper-message-html-escaped-owner-outcomes",
  "notifications.helper-message-html-escaped-owner-feed",
  "gift-intent.owner-reply-html-escaped-helper-view",
  "gift-intent.message-security-cleanup",
  "wishlist.visibility.private-hidden-from-share-api",
  "wishlist.visibility.private-hidden-from-direct-page",
  "wishlist.visibility.private-direct-page-matrix",
  "wishlist.visibility.selected-people-allowed-visible",
  "wishlist.visibility.selected-people-unlisted-hidden",
  "wishlist.visibility.selected-people-direct-allowed-visible",
  "wishlist.visibility.selected-people-direct-unlisted-hidden",
  "wishlist.visibility.public-visible-anonymous",
  "wishlist.visibility.public-direct-page-anonymous",
  "wishlist.visibility.direct-page-payment-metadata-contained",
  "wishlist.payment-metadata.share-api-contained",
  "wishlist.payment-metadata.direct-private-contained",
  "wishlist.payment-metadata.direct-selected-contained",
  "wishlist.payment-metadata.cleanup",
  "wishlist.visibility.cleanup",
  "affiliate.external-links-rendered",
  "affiliate.amazon-link-has-tag",
  "affiliate.ebay-link-has-campaign",
  "affiliate.external-links-safe-rel",
  "affiliate.ebay-temporary-link-rendered",
  "affiliate.ebay-temporary-link-has-campaign",
  "affiliate.ebay-temporary-link-safe-rel",
  "wishlist.share-list-member-friend",
  "wishlist.share-list-viewer",
  "wishlist.shared-wish-public-render",
  "outcomes.owner-read",
  "gift-intent.maya-ui-partial-offer",
  "gift-intent.owner-outcome-visible",
  "gift-intent.owner-decline-cleanup",
  "gift-intent.concurrent-helpers-same-item",
  "gift-intent.concurrent-helpers-cleanup",
  "gift-intent.same-helper-concurrent-submit",
  "gift-intent.same-helper-concurrent-cleanup",
  "gift-intent.helper-cancel-own-outcome",
  "gift-intent.owner-confirm-decision",
  "gift-intent.owner-decision-race-same-outcome",
  "gift-intent.owner-decision-race-cleanup",
  "gift-intent.contribution-boundary-zero",
  "gift-intent.contribution-boundary-negative",
  "gift-intent.contribution-boundary-over-100",
  "gift-intent.contribution-boundary-huge",
  "gift-intent.contribution-boundary-nonnumeric",
  "gift-intent.contribution-boundary-decimal",
  "notifications.member-feed",
  "notifications.qa-artifacts-cleanup",
  "notifications.owner-mark-read",
  "notifications.owner-delete",
  "notifications.helper-reply-after-owner-confirm",
  "notifications.helper-reply-after-owner-decline",
  "boundary.non-owner-notification-read-denied",
  "boundary.viewer-notification-read-denied",
  "boundary.disabled-notification-read-denied",
  "boundary.unauthenticated-notification-read-denied",
  "boundary.non-owner-notification-delete-denied",
  "boundary.viewer-notification-delete-denied",
  "boundary.disabled-notification-delete-denied",
  "boundary.unauthenticated-notification-delete-denied",
  "race.same-owner-parallel-save",
  "friends.requests-read",
  "friends.connected-read",
  "friends.connected-read.all-users",
  "friends.invite-api.member",
  "friends.invite-api.viewer",
  "friends.invite-api.disabled",
  "friends.invite-api.anonymous",
  "friends.invite-page.anonymous",
  "friends.invite-page.disabled",
  "friends.invite-page.viewer",
  "friends.viewer-remove-connection-denied",
  "friends.disabled-remove-connection-denied",
  "friends.unauthenticated-remove-connection-denied",
  "friends.request-actions-invalid-id-denied",
  "friends.mutation-permission-cleanup",
  "external.same-origin-guard",
  "external.same-origin-account-wishlist-guard",
  "external.same-origin-fulfill-guard",
  "external.same-origin-owner-outcome-guard",
  "external.same-origin-helper-cancel-guard",
  "external.same-origin-notification-read-guard",
  "external.same-origin-notification-delete-guard",
  "external.same-origin-friend-invite-guard",
  "realtime.browser-smoke",
  "realtime.maya-viewport-updates-after-support",
  "cleanup.run-prefix-removed",
];

function nowIso() {
  return new Date().toISOString();
}

function elapsed(startMs) {
  const total = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
  const h = String(Math.floor(total / 3600)).padStart(2, "0");
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseArgs(argv) {
  const args = {
    cleanupOnly: false,
    cycles: 1,
    discoverActions: false,
    discoverFriends: false,
    discoverNotifications: false,
    durationMinutes: 0,
    directWishBoundaryProbe: false,
    paymentMetadataProbe: false,
    friendInviteProbe: false,
    friendMutationPermissionProbe: false,
    friendSnapshot: false,
    giftRaceProbe: false,
    giftContributionBoundaryProbe: false,
    giftMessageSecurityProbe: false,
    helperReplyNotificationProbe: false,
    jordanFulfillProbe: false,
    declineOutcomeId: "",
    declineOutcomeReply: "",
    listOwnerOutcomes: false,
    notificationPermissionProbe: false,
    outcomePermissionProbe: false,
    ownerDecisionRaceProbe: false,
    sameHelperProbe: false,
    sameOriginExtendedProbe: false,
    reset: false,
    telemetryMinutes: 30,
    visibilityProbe: false,
    affiliateProbe: false,
    affiliateEbayProbe: false,
  };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--cleanup-only") args.cleanupOnly = true;
    if (arg === "--discover-actions") args.discoverActions = true;
    if (arg === "--discover-friends") args.discoverFriends = true;
    if (arg === "--discover-notifications") args.discoverNotifications = true;
    if (arg === "--direct-wish-boundary-probe") args.directWishBoundaryProbe = true;
    if (arg === "--payment-metadata-probe") args.paymentMetadataProbe = true;
    if (arg === "--friend-invite-probe") args.friendInviteProbe = true;
    if (arg === "--friend-mutation-permission-probe") args.friendMutationPermissionProbe = true;
    if (arg === "--friend-snapshot") args.friendSnapshot = true;
    if (arg === "--gift-race-probe") args.giftRaceProbe = true;
    if (arg === "--gift-contribution-boundary-probe") args.giftContributionBoundaryProbe = true;
    if (arg === "--gift-message-security-probe") args.giftMessageSecurityProbe = true;
    if (arg === "--helper-reply-notification-probe") args.helperReplyNotificationProbe = true;
    if (arg === "--jordan-fulfill-probe") args.jordanFulfillProbe = true;
    if (arg === "--decline-outcome-id") args.declineOutcomeId = String(argv[++i] || "");
    if (arg === "--decline-outcome-reply") args.declineOutcomeReply = String(argv[++i] || "");
    if (arg === "--list-owner-outcomes") args.listOwnerOutcomes = true;
    if (arg === "--notification-permission-probe") args.notificationPermissionProbe = true;
    if (arg === "--outcome-permission-probe") args.outcomePermissionProbe = true;
    if (arg === "--owner-decision-race-probe") args.ownerDecisionRaceProbe = true;
    if (arg === "--same-helper-probe") args.sameHelperProbe = true;
    if (arg === "--same-origin-extended-probe") args.sameOriginExtendedProbe = true;
    if (arg === "--cycles") args.cycles = Number(argv[++i] || 1);
    if (arg === "--duration-minutes") args.durationMinutes = Number(argv[++i] || 0);
    if (arg === "--reset") args.reset = true;
    if (arg === "--telemetry-minutes") args.telemetryMinutes = Number(argv[++i] || 30);
    if (arg === "--visibility-probe") args.visibilityProbe = true;
    if (arg === "--affiliate-probe") args.affiliateProbe = true;
    if (arg === "--affiliate-ebay-probe") args.affiliateEbayProbe = true;
  }
  return args;
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

function isNetworkError(error) {
  return typeof error === "string" && /fetch failed|ENOTFOUND|ECONN|EAI_AGAIN|network/i.test(error);
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

class QaSession {
  constructor(name, state) {
    this.name = name;
    this.jar = new CookieJar();
    this.state = state;
  }

  async request(method, route, options = {}) {
    const url = route.startsWith("http") ? route : `${BASE_URL}${route}`;
    const headers = {
      accept: "application/json,text/html;q=0.9,*/*;q=0.8",
      "user-agent": "Codex-Wishees-QA/2026-06-05",
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
      body = typeof options.body === "string" ? options.body : JSON.stringify(options.body);
      eventBody = body;
    }
    if (options.form !== undefined) {
      const form = new FormData();
      for (const [key, value] of Object.entries(options.form)) {
        form.set(key, String(value));
      }
      body = form;
      eventBody = JSON.stringify(options.form);
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
      feature: options.feature || "unclassified",
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
            body: truncate(json ?? text, 3000),
          }
        : null,
      durationMs: Date.now() - started,
      error,
    };
    await appendJsonl(EVENTS_FILE, event);
    if (error) {
      this.state.notes.push({
        ts: nowIso(),
        type: "network-or-transport",
        session: this.name,
        action: options.action || `${method} ${route}`,
        route,
        error,
      });
      await saveJson(STATE_FILE, this.state);
    }
    if (!error && response && response.status >= 500) {
      await recordBug(this.state, {
        severity: "CRITICAL",
        title: `${options.action || route} failed at transport/server boundary`,
        stepsToReproduce: [
          `Use ${this.name} session`,
          `${method} ${route}`,
          body ? `Payload: ${truncate(body, 900)}` : "No request body",
        ],
        actualBehavior: `HTTP ${response.status}: ${truncate(json ?? text, 900)}`,
        evidence: event,
      });
    }
    return { response, text, json, error, event };
  }

  async login(userKey) {
    const user = USERS[userKey];
    const result = await this.request("POST", "/api/auth/login", {
      feature: "auth",
      action: `login ${userKey}`,
      body: {
        email: user.email,
        accessCode: user.password,
        next: "/profile?lang=de",
      },
    });
    if (result.error) {
      const error = new Error(`NETWORK_UNAVAILABLE: ${result.error}`);
      error.cause = result;
      throw error;
    }
    return result.json;
  }
}

function emptyState() {
  return {
    runId: RUN_ID,
    requestedTarget: REQUESTED_TARGET,
    actualTarget: BASE_URL,
    startedAt: nowIso(),
    updatedAt: nowIso(),
    coverage: Object.fromEntries(COVERAGE_POINTS.map((point) => [point, { count: 0 }])),
    bugs: [],
    notes: [],
  };
}

async function mark(state, point, detail = {}) {
  state.coverage[point] = state.coverage[point] || { count: 0 };
  state.coverage[point].count += 1;
  state.coverage[point].lastAt = nowIso();
  state.coverage[point].lastDetail = detail;
  state.updatedAt = nowIso();
  await saveJson(STATE_FILE, state);
}

async function recordBug(state, bug) {
  if (/^parallel save [AB] failed at transport\/server boundary$/.test(bug.title || "")) {
    bug = {
      ...bug,
      title: "Parallel owner wishlist save can return HTTP 500 during same-owner race",
      stepsToReproduce: [
        "Open two authenticated Alex sessions",
        "Read the same wishlist baseline in both sessions",
        "Submit two PUT /api/account/wishlist requests at the same time, each adding a different item",
        "Observe one of the parallel saves",
      ],
    };
  }
  const normalized = {
    id: `BUG-${String(state.bugs.length + 1).padStart(3, "0")}`,
    firstSeenAt: nowIso(),
    occurrences: 1,
    ...bug,
  };
  const stepsKey = JSON.stringify(normalized.stepsToReproduce || []);
  const existing = state.bugs.find((entry) => {
    return entry.title === normalized.title && JSON.stringify(entry.stepsToReproduce || []) === stepsKey;
  });
  if (!existing) {
    state.bugs.push(normalized);
  } else {
    existing.occurrences = (existing.occurrences || 1) + 1;
    existing.lastSeenAt = nowIso();
    existing.lastActualBehavior = normalized.actualBehavior;
    if (normalized.evidence) existing.lastEvidence = normalized.evidence;
  }
  await saveJson(BUGS_FILE, state.bugs);
  await saveJson(STATE_FILE, state);
  return existing || normalized;
}

function dedupeBugs(bugs) {
  const merged = [];
  for (const bug of bugs || []) {
    const stepsKey = JSON.stringify(bug.stepsToReproduce || []);
    const existing = merged.find((entry) => {
      return entry.title === bug.title && JSON.stringify(entry.stepsToReproduce || []) === stepsKey;
    });
    if (!existing) {
      merged.push({
        occurrences: 1,
        ...bug,
        id: `BUG-${String(merged.length + 1).padStart(3, "0")}`,
      });
      continue;
    }
    existing.occurrences = (existing.occurrences || 1) + (bug.occurrences || 1);
    existing.lastSeenAt = bug.lastSeenAt || bug.firstSeenAt || nowIso();
    existing.lastActualBehavior = bug.lastActualBehavior || bug.actualBehavior;
    if (bug.lastEvidence || bug.evidence) existing.lastEvidence = bug.lastEvidence || bug.evidence;
  }
  return merged;
}

function coveragePercentage(state) {
  const covered = COVERAGE_POINTS.filter((point) => (state.coverage[point]?.count || 0) > 0).length;
  return `${Math.round((covered / COVERAGE_POINTS.length) * 100)}%`;
}

function wishlistFromPayload(payload) {
  const source = payload?.wishlist || payload || {};
  return {
    items: Array.isArray(source.items) ? source.items : [],
    visibility: source.visibility || "friends",
    currency: source.currency || "EUR",
    ownerUserId: Number(source.ownerUserId || payload?.ownerUserId || payload?.userId || 0),
  };
}

function makeWish(id, suffix = "affiliate") {
  const timestamp = nowIso();
  return {
    id,
    title: `Codex matrix ${suffix} ${RUN_ID}`,
    note: `Automated multi-user QA artifact ${RUN_ID}. Safe to delete.`,
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

function withoutRunItems(items) {
  return items.filter((item) => !String(item?.id || "").startsWith("wish_codex_matrix_"));
}

async function emitTelemetry(state, startedMs, activeWorkflow, currentUserSession = "matrix") {
  const telemetry = {
    elapsedTime: elapsed(startedMs),
    currentUserSession,
    coveragePercentage: coveragePercentage(state),
    activeWorkflow,
    identifiedBugs: state.bugs.map((bug) => ({
      severity: bug.severity,
      stepsToReproduce: bug.stepsToReproduce,
      actualBehavior: bug.actualBehavior,
    })),
  };
  await appendJsonl(TELEMETRY_FILE, telemetry);
  console.log(JSON.stringify(telemetry, null, 2));
}

async function loginMatrix(state) {
  const sessions = {};
  for (const key of ["alex", "maya", "jordan", "lina"]) {
    sessions[key] = new QaSession(key, state);
    const login = await sessions[key].login(key);
    const point = key === "lina" ? "auth.viewer-login.lina" : `auth.member-login.${key}`;
    if (login?.ok) {
      await mark(state, point, { ok: true });
    } else {
      await recordBug(state, {
        severity: "CRITICAL",
        title: `${key} could not log in`,
        stepsToReproduce: [`POST /api/auth/login as ${USERS[key].email}`],
        actualBehavior: JSON.stringify(login),
      });
    }
  }

  sessions.disabled = new QaSession("disabled", state);
  const disabled = await sessions.disabled.login("disabled");
  if (disabled?.ok === false && disabled.code === "account-disabled") {
    await mark(state, "auth.disabled-rejected", { code: disabled.code });
  } else {
    await recordBug(state, {
      severity: "CRITICAL",
      title: "Disabled account was not rejected",
      stepsToReproduce: ["POST /api/auth/login as e2e-disabled@wishees.local"],
      actualBehavior: JSON.stringify(disabled),
    });
  }

  const wrong = new QaSession("wrong-password", state);
  const wrongLogin = await wrong.request("POST", "/api/auth/login", {
    feature: "auth",
    action: "wrong password rejected",
    body: {
      email: USERS.alex.email,
      accessCode: "not-the-password",
      next: "/profile?lang=de",
    },
  });
  if (wrongLogin.json?.ok === false) await mark(state, "auth.wrong-password-rejected", wrongLogin.json);

  return sessions;
}

async function authBoundaries(state, sessions) {
  const anon = new QaSession("anonymous", state);
  const anonWishlist = await anon.request("GET", "/api/account/wishlist", {
    feature: "boundary",
    action: "anonymous account wishlist denied",
  });
  if (!anonWishlist.json?.ok && anonWishlist.response?.status !== 200) {
    await mark(state, "boundary.unauthenticated-account-api", {
      status: anonWishlist.response?.status,
      body: anonWishlist.json,
    });
  } else if (anonWishlist.json?.ok === false) {
    await mark(state, "boundary.unauthenticated-account-api", anonWishlist.json);
  } else {
    await recordBug(state, {
      severity: "CRITICAL",
      title: "Anonymous account wishlist API returned successful data",
      stepsToReproduce: ["Without a session, GET /api/account/wishlist"],
      actualBehavior: JSON.stringify(anonWishlist.json ?? anonWishlist.text),
    });
  }

  const anonShared = await anon.request("GET", "/api/wishlist/share?sharedUserId=12", {
    feature: "boundary",
    action: "anonymous shared wishlist api denied",
  });
  if (anonShared.json?.ok === true) {
    const bug = await recordBug(state, {
      severity: "CRITICAL",
      title: "Anonymous user can read shared wishlist API",
      stepsToReproduce: ["Without a session, GET /api/wishlist/share?sharedUserId=12"],
      actualBehavior: JSON.stringify(anonShared.json),
      evidence: anonShared.event,
    });
    await mark(state, "boundary.unauthenticated-shared-api-denied", {
      expected: "anonymous shared API read is rejected",
      actual: "anonymous shared API read returned ok:true",
      bugId: bug.id,
    });
  } else {
    await mark(state, "boundary.unauthenticated-shared-api-denied", {
      status: anonShared.response?.status,
      body: anonShared.json,
    });
  }

  const viewerWrite = await sessions.lina.request("PUT", "/api/account/wishlist", {
    feature: "boundary",
    action: "viewer wishlist write denied",
    body: {
      currency: "EUR",
      visibility: "friends",
      items: [makeWish(`${RUN_PREFIX}_viewer_forbidden`)],
    },
  });
  if (viewerWrite.json?.ok === true) {
    const bug = await recordBug(state, {
      severity: "CRITICAL",
      title: "Viewer can write wishlist through account API",
      stepsToReproduce: [
        "Log in as e2e-lina@wishees.local",
        "PUT /api/account/wishlist with a new item",
      ],
      actualBehavior: JSON.stringify(viewerWrite.json),
      evidence: viewerWrite.event,
    });
    await mark(state, "boundary.viewer-wishlist-write-denied", {
      expected: "viewer PUT is rejected",
      actual: "viewer PUT returned ok:true and persisted data",
      bugId: bug.id,
    });
    const linaAfter = await sessions.lina.request("GET", "/api/account/wishlist", {
      feature: "cleanup",
      action: "read lina wishlist after forbidden write",
    });
    const linaWishlist = wishlistFromPayload(linaAfter.json);
    const viewerUpdate = await sessions.lina.request("PUT", "/api/account/wishlist", {
      feature: "boundary",
      action: "viewer wishlist update denied",
      body: {
        currency: linaWishlist.currency,
        visibility: linaWishlist.visibility,
        items: linaWishlist.items.map((item) =>
          String(item.id).startsWith("wish_codex_matrix_")
            ? { ...item, title: `${item.title} updated by forbidden viewer` }
            : item,
        ),
      },
    });
    if (viewerUpdate.json?.ok === true) {
      const updateBug = await recordBug(state, {
        severity: "CRITICAL",
        title: "Viewer can update wishlist through account API",
        stepsToReproduce: [
          "Log in as e2e-lina@wishees.local",
          "Create a wishlist item through PUT /api/account/wishlist",
          "PUT /api/account/wishlist again with a changed title",
        ],
        actualBehavior: JSON.stringify(viewerUpdate.json),
        evidence: viewerUpdate.event,
      });
      await mark(state, "boundary.viewer-wishlist-update-denied", {
        expected: "viewer update is rejected",
        actual: "viewer update returned ok:true",
        bugId: updateBug.id,
      });
    } else {
      await mark(state, "boundary.viewer-wishlist-update-denied", {
        status: viewerUpdate.response?.status,
        body: viewerUpdate.json,
      });
    }

    await sessions.lina.request("PUT", "/api/account/wishlist", {
      feature: "cleanup",
      action: "cleanup viewer-written run item",
      body: {
        currency: linaWishlist.currency,
        visibility: linaWishlist.visibility,
        items: withoutRunItems(linaWishlist.items),
      },
    });
    const viewerDelete = await sessions.lina.request("GET", "/api/account/wishlist", {
      feature: "boundary",
      action: "viewer wishlist delete verification read",
    });
    if (viewerDelete.json?.ok === true) {
      const deleteBug = await recordBug(state, {
        severity: "CRITICAL",
        title: "Viewer can delete wishlist entries through account API",
        stepsToReproduce: [
          "Log in as e2e-lina@wishees.local",
          "Create a wishlist item through PUT /api/account/wishlist",
          "PUT /api/account/wishlist with the item removed",
        ],
        actualBehavior: "Cleanup PUT returned ok:true and subsequent read showed the viewer-written item was removed.",
        evidence: viewerDelete.event,
      });
      await mark(state, "boundary.viewer-wishlist-delete-denied", {
        expected: "viewer delete is rejected",
        actual: "viewer delete returned ok:true",
        bugId: deleteBug.id,
      });
    }
  } else {
    await mark(state, "boundary.viewer-wishlist-write-denied", {
      status: viewerWrite.response?.status,
      body: viewerWrite.json,
    });
  }

  const disabledDirect = await sessions.disabled.request("GET", "/api/account/wishlist", {
    feature: "boundary",
    action: "disabled direct account api denied",
  });
  if (disabledDirect.json?.ok === true) {
    await recordBug(state, {
      severity: "CRITICAL",
      title: "Disabled user can access account API after rejected login",
      stepsToReproduce: [
        "Attempt login as e2e-disabled@wishees.local",
        "GET /api/account/wishlist with the resulting cookie jar",
      ],
      actualBehavior: JSON.stringify(disabledDirect.json),
      evidence: disabledDirect.event,
    });
  } else {
    await mark(state, "boundary.disabled-direct-account-api-denied", {
      status: disabledDirect.response?.status,
      body: disabledDirect.json,
    });
  }

  const disabledSharedApi = await sessions.disabled.request("GET", "/api/wishlist/share?sharedUserId=12", {
    feature: "boundary",
    action: "disabled direct shared wishlist api denied",
  });
  if (disabledSharedApi.json?.ok === true) {
    const bug = await recordBug(state, {
      severity: "CRITICAL",
      title: "Disabled user can read shared wishlist API after rejected login",
      stepsToReproduce: [
        "Attempt login as e2e-disabled@wishees.local",
        "GET /api/wishlist/share?sharedUserId=12 using the resulting cookie jar",
      ],
      actualBehavior: JSON.stringify(disabledSharedApi.json),
      evidence: disabledSharedApi.event,
    });
    await mark(state, "boundary.disabled-shared-api-denied", {
      expected: "disabled user is rejected",
      actual: "disabled rejected-login session read shared wishlist data",
      bugId: bug.id,
    });
  } else {
    await mark(state, "boundary.disabled-shared-api-denied", {
      status: disabledSharedApi.response?.status,
      body: disabledSharedApi.json,
    });
  }

  const disabledPage = await sessions.disabled.request("GET", "/friends/wishlist?invite=user-12&lang=de", {
    feature: "boundary",
    action: "disabled direct friend wishlist page denied",
    headers: { accept: "text/html,application/xhtml+xml" },
  });
  if (disabledPage.response?.status === 200 && /Compact burr coffee grinder|Noise-canceling headphones/.test(disabledPage.text)) {
    const bug = await recordBug(state, {
      severity: "CRITICAL",
      title: "Disabled user can render friend wishlist page after rejected login",
      stepsToReproduce: [
        "Attempt login as e2e-disabled@wishees.local",
        "GET /friends/wishlist?invite=user-12&lang=de using the resulting cookie jar",
      ],
      actualBehavior: "Page returned the shared wishlist item text with HTTP 200.",
      evidence: disabledPage.event,
    });
    await mark(state, "boundary.disabled-friend-wishlist-page-denied", {
      expected: "disabled user is rejected",
      actual: "disabled rejected-login session rendered friend wishlist page",
      bugId: bug.id,
    });
  } else {
    await mark(state, "boundary.disabled-friend-wishlist-page-denied", {
      status: disabledPage.response?.status,
      includesWishlistText: /Compact burr coffee grinder|Noise-canceling headphones/.test(disabledPage.text),
    });
  }

  const viewerSupport = await sessions.lina.request("POST", "/api/friends/wishlist/fulfill", {
    feature: "boundary",
    action: "viewer support outcome creation denied",
    form: {
      contributionPercent: 5,
      helperMessage: `Codex viewer support forbidden probe ${RUN_ID}`,
      ownerUserId: 12,
      itemId: "wish_e2e_noise_headphones",
      language: "de",
    },
  });
  if (viewerSupport.json?.ok === true) {
    const bug = await recordBug(state, {
      severity: "CRITICAL",
      title: "Viewer can create gift support outcomes through friends wishlist API",
      stepsToReproduce: [
        "Log in as e2e-lina@wishees.local",
        "POST /api/friends/wishlist/fulfill for Alex item wish_e2e_noise_headphones",
      ],
      actualBehavior: JSON.stringify(viewerSupport.json),
      evidence: viewerSupport.event,
    });
    await mark(state, "boundary.viewer-support-denied", {
      expected: "viewer support creation is rejected",
      actual: "viewer support creation returned ok:true",
      bugId: bug.id,
    });
  } else {
    await mark(state, "boundary.viewer-support-denied", {
      status: viewerSupport.response?.status,
      body: viewerSupport.json,
    });
  }

  const disabledSupport = await sessions.disabled.request("POST", "/api/friends/wishlist/fulfill", {
    feature: "boundary",
    action: "disabled support outcome creation denied",
    form: {
      contributionPercent: 5,
      helperMessage: `Codex disabled support forbidden probe ${RUN_ID}`,
      ownerUserId: 12,
      itemId: "wish_e2e_noise_headphones",
      language: "de",
    },
  });
  if (disabledSupport.json?.ok === true) {
    const bug = await recordBug(state, {
      severity: "CRITICAL",
      title: "Disabled user can create gift support outcomes after rejected login",
      stepsToReproduce: [
        "Attempt login as e2e-disabled@wishees.local",
        "POST /api/friends/wishlist/fulfill for Alex item wish_e2e_noise_headphones",
      ],
      actualBehavior: JSON.stringify(disabledSupport.json),
      evidence: disabledSupport.event,
    });
    await mark(state, "boundary.disabled-support-denied", {
      expected: "disabled support creation is rejected",
      actual: "disabled support creation returned ok:true",
      bugId: bug.id,
    });
  } else {
    await mark(state, "boundary.disabled-support-denied", {
      status: disabledSupport.response?.status,
      body: disabledSupport.json,
    });
  }
}

async function cleanupRunArtifacts(state, sessions) {
  if (sessions.alex) {
    const outcomes = await sessions.alex.request("GET", "/api/account/wishlist/outcomes", {
      feature: "cleanup",
      action: "read owner outcomes for campaign cleanup",
    });
    const qaOutcomes = Array.isArray(outcomes.json?.outcomes)
      ? outcomes.json.outcomes.filter((outcome) =>
          JSON.stringify(outcome).includes("Codex") ||
          String(outcome.itemId || outcome.item_id || "").startsWith("wish_codex_matrix_"),
        )
      : [];
    if (qaOutcomes.length > 0) {
      await mark(state, "gift-intent.owner-outcome-visible", {
        count: qaOutcomes.length,
        outcomeIds: qaOutcomes.map((outcome) => outcome.id || outcome.outcomeId || outcome.outcome_id),
      });
    }
    for (const outcome of qaOutcomes) {
      const outcomeId = outcome.id || outcome.outcomeId || outcome.outcome_id;
      if (!outcomeId) continue;
      const decline = await sessions.alex.request("POST", "/api/account/wishlist/outcomes", {
        feature: "cleanup",
        action: `decline QA support outcome ${outcomeId}`,
        body: {
          decision: "decline",
          outcomeId,
          ownerReply: "Codex QA cleanup: declining automated support probe.",
        },
      });
      if (decline.json?.ok) {
        await mark(state, "gift-intent.owner-decline-cleanup", { outcomeId });
      }
    }
  }
  if (sessions.alex) {
    const notifications = await sessions.alex.request("GET", "/api/notifications", {
      feature: "cleanup",
      action: "read alex notifications for campaign cleanup",
    });
    const campaignStartedAt = Date.parse(state.startedAt || "");
    const qaNotifications = Array.isArray(notifications.json?.notifications)
      ? notifications.json.notifications.filter((notification) => {
          const createdAt = Date.parse(notification.createdAt || "");
          const actorIsQaHelper = ["e2e-maya@wishees.local", "e2e-jordan@wishees.local"].includes(
            notification.actorEmail,
          );
          const isCampaignNotification = Number.isFinite(campaignStartedAt)
            ? createdAt >= campaignStartedAt
            : true;
          return (
            notification.canDelete === true &&
            actorIsQaHelper &&
            isCampaignNotification &&
            String(notification.type || "").startsWith("wish.support.")
          );
        })
      : [];
    for (const notification of qaNotifications) {
      await sessions.alex.request("DELETE", `/api/notifications/${encodeURIComponent(notification.id)}`, {
        feature: "cleanup",
        action: `delete QA notification ${notification.id}`,
      });
    }
    if (qaNotifications.length > 0 || notifications.json?.ok) {
      await mark(state, "notifications.qa-artifacts-cleanup", {
        deleted: qaNotifications.map((notification) => notification.id),
      });
    }
  }
  for (const key of ["alex", "maya", "jordan", "lina"]) {
    if (!sessions[key]) continue;
    const latest = await sessions[key].request("GET", "/api/account/wishlist", {
      feature: "cleanup",
      action: `read ${key} wishlist for campaign artifact cleanup`,
    });
    if (!latest.json?.ok) continue;
    const wishlist = wishlistFromPayload(latest.json);
    const cleaned = withoutRunItems(wishlist.items);
    if (cleaned.length === wishlist.items.length) continue;
    await sessions[key].request("PUT", "/api/account/wishlist", {
      feature: "cleanup",
      action: `cleanup campaign artifacts for ${key}`,
      body: {
        currency: wishlist.currency,
        visibility: wishlist.visibility,
        items: cleaned,
      },
    });
  }
  await mark(state, "cleanup.run-prefix-removed", { prefix: "wish_codex_matrix_" });
}

async function wishlistCrudAndSharing(state, sessions, cycle) {
  const getBefore = await sessions.alex.request("GET", "/api/account/wishlist", {
    feature: "wishlist",
    action: "owner wishlist read before mutation",
  });
  if (getBefore.json?.ok) await mark(state, "wishlist.owner-read");
  const before = wishlistFromPayload(getBefore.json);
  const cleanBase = withoutRunItems(before.items);
  const itemId = `${RUN_PREFIX}_cycle${cycle}_affiliate`;
  const editedId = `${RUN_PREFIX}_cycle${cycle}_edited`;
  const item = makeWish(itemId, `affiliate cycle ${cycle}`);
  const putCreate = await sessions.alex.request("PUT", "/api/account/wishlist", {
    feature: "wishlist",
    action: "owner wishlist create affiliate wish",
    body: {
      currency: before.currency,
      visibility: before.visibility,
      items: [...cleanBase, item],
    },
  });
  if (putCreate.json?.ok) await mark(state, "wishlist.owner-create", { itemId });

  const getCreated = await sessions.alex.request("GET", "/api/account/wishlist", {
    feature: "wishlist",
    action: "owner wishlist verify created wish",
  });
  const created = wishlistFromPayload(getCreated.json);
  const savedItem = created.items.find((entry) => entry.id === itemId);
  if (savedItem?.url?.includes("amazon.de")) {
    await mark(state, "wishlist.affiliate-url-persists", { itemId, url: savedItem.url });
  } else {
    await recordBug(state, {
      severity: "MAJOR",
      title: "Affiliate/product URL did not persist on wishlist item",
      stepsToReproduce: [
        "Log in as Alex",
        "PUT /api/account/wishlist with an Amazon product URL",
        "GET /api/account/wishlist",
      ],
      actualBehavior: JSON.stringify(savedItem || getCreated.json),
      evidence: getCreated.event,
    });
  }

  const edited = { ...savedItem, id: editedId, title: `${savedItem?.title || item.title} edited` };
  const putEdit = await sessions.alex.request("PUT", "/api/account/wishlist", {
    feature: "wishlist",
    action: "owner wishlist update created wish",
    body: {
      currency: created.currency,
      visibility: created.visibility,
      items: [...withoutRunItems(created.items), edited],
    },
  });
  if (putEdit.json?.ok) await mark(state, "wishlist.owner-update", { from: itemId, to: editedId });

  const session = await sessions.alex.request("GET", "/api/auth/session", {
    feature: "auth",
    action: "fetch alex session for owner user id",
  });
  const ownerUserId = Number(session.json?.userId || 0);
  if (ownerUserId > 0) {
    const [mayaShare, jordanShare, linaShare] = await Promise.all([
      sessions.maya.request("GET", `/api/wishlist/share?sharedUserId=${ownerUserId}`, {
        feature: "wishlist",
        action: "maya reads alex shared wishlist",
      }),
      sessions.jordan.request("GET", `/api/wishlist/share?sharedUserId=${ownerUserId}`, {
        feature: "wishlist",
        action: "jordan reads alex shared wishlist",
      }),
      sessions.lina.request("GET", `/api/wishlist/share?sharedUserId=${ownerUserId}`, {
        feature: "wishlist",
        action: "lina reads alex shared wishlist",
      }),
    ]);
    if (mayaShare.json?.ok || jordanShare.json?.ok) {
      await mark(state, "wishlist.share-list-member-friend", {
        ownerUserId,
        mayaStatus: mayaShare.response?.status,
        jordanStatus: jordanShare.response?.status,
      });
    }
    if (linaShare.json?.ok === true) {
      await mark(state, "wishlist.share-list-viewer", { ownerUserId, status: linaShare.response?.status });
    } else {
      await mark(state, "wishlist.share-list-viewer", {
        ownerUserId,
        status: linaShare.response?.status,
        reason: linaShare.json?.reason,
      });
    }
  }

  const publicWish = await sessions.maya.request("GET", `/wish?sharedWishId=${encodeURIComponent(editedId)}&lang=de`, {
    feature: "wishlist",
    action: "shared wish page render",
    headers: { accept: "text/html,application/xhtml+xml" },
  });
  if (publicWish.response?.status && publicWish.response.status < 500) {
    await mark(state, "wishlist.shared-wish-public-render", {
      status: publicWish.response.status,
      includesTitle: publicWish.text.includes("Codex matrix"),
    });
  }

  const outcomes = await sessions.alex.request("GET", "/api/account/wishlist/outcomes", {
    feature: "outcomes",
    action: "owner outcomes read",
  });
  if (outcomes.json?.ok) await mark(state, "outcomes.owner-read", { count: outcomes.json.outcomes?.length || 0 });

  const notifications = await sessions.alex.request("GET", "/api/notifications", {
    feature: "notifications",
    action: "member notifications feed read",
  });
  if (notifications.json?.ok) {
    await mark(state, "notifications.member-feed", {
      unreadCount: notifications.json.unreadCount,
      count: notifications.json.notifications?.length || 0,
    });
  }

  const latest = await sessions.alex.request("GET", "/api/account/wishlist", {
    feature: "cleanup",
    action: "owner wishlist read before cleanup",
  });
  const latestWishlist = wishlistFromPayload(latest.json);
  const cleanup = await sessions.alex.request("PUT", "/api/account/wishlist", {
    feature: "cleanup",
    action: "remove run-prefixed wishlist items",
    body: {
      currency: latestWishlist.currency,
      visibility: latestWishlist.visibility,
      items: withoutRunItems(latestWishlist.items),
    },
  });
  if (cleanup.json?.ok) {
    await mark(state, "wishlist.owner-delete-cleanup");
    await mark(state, "cleanup.run-prefix-removed", { prefix: RUN_PREFIX });
  }
}

async function wishlistInputSecurityProbe(state, sessions, cycle) {
  const beforeResult = await sessions.alex.request("GET", "/api/account/wishlist", {
    feature: "wishlist-security",
    action: "owner wishlist read before unsafe input probe",
  });
  if (!beforeResult.json?.ok) return;
  const before = wishlistFromPayload(beforeResult.json);
  const cleanBase = withoutRunItems(before.items);
  const itemId = `${RUN_PREFIX}_cycle${cycle}_unsafe`;
  const unsafeTitle = `<img src=x onerror=alert("codex-${RUN_ID}")> Codex unsafe title`;
  const unsafeItem = {
    ...makeWish(itemId, `unsafe cycle ${cycle}`),
    title: unsafeTitle,
    url: "javascript:alert('codex-wishees')",
  };
  const create = await sessions.alex.request("PUT", "/api/account/wishlist", {
    feature: "wishlist-security",
    action: "owner creates unsafe-url/html-title wish",
    body: {
      currency: before.currency,
      visibility: before.visibility,
      items: [...cleanBase, unsafeItem],
    },
  });
  if (!create.json?.ok) {
    await mark(state, "wishlist.unsafe-url-sanitized", {
      result: "unsafe item rejected at save boundary",
      status: create.response?.status,
      body: create.json,
    });
    await mark(state, "wishlist.html-title-escaped", {
      result: "unsafe item rejected at save boundary",
      status: create.response?.status,
      body: create.json,
    });
    return;
  }

  const share = await sessions.maya.request("GET", "/api/wishlist/share?sharedUserId=12", {
    feature: "wishlist-security",
    action: "shared API exposes unsafe input probe item",
  });
  const sharedItem = share.json?.wishlist?.items?.find((item) => item.id === itemId);
  if (String(sharedItem?.url || "").toLowerCase().startsWith("javascript:")) {
    await recordBug(state, {
      severity: "CRITICAL",
      title: "Shared wishlist API exposes javascript URL for wish item",
      stepsToReproduce: [
        "Log in as Alex",
        "Save a wish with url=javascript:alert('codex-wishees')",
        "GET /api/wishlist/share?sharedUserId=12 as Maya",
      ],
      actualBehavior: JSON.stringify(sharedItem),
      evidence: share.event,
    });
  }

  const page = await sessions.maya.request("GET", `/wish?sharedWishId=${encodeURIComponent(itemId)}&lang=de`, {
    feature: "wishlist-security",
    action: "render unsafe input shared wish page",
    headers: { accept: "text/html,application/xhtml+xml" },
  });
  const lowerHtml = (page.text || "").toLowerCase();
  const htmlContainsJavascriptHref = /href=["']javascript:/i.test(page.text || "");
  const htmlContainsRawImgTag = /<img\s+src=x/i.test(page.text || "");
  if (htmlContainsJavascriptHref) {
    await recordBug(state, {
      severity: "CRITICAL",
      title: "Shared wish page renders javascript URL href",
      stepsToReproduce: [
        "Log in as Alex",
        "Save a wish with url=javascript:alert('codex-wishees')",
        `GET /wish?sharedWishId=${itemId}&lang=de as Maya`,
      ],
      actualBehavior: "Rendered HTML contained href=\"javascript:...\".",
      evidence: page.event,
    });
  }
  if (htmlContainsRawImgTag) {
    await recordBug(state, {
      severity: "CRITICAL",
      title: "Shared wish page renders raw HTML from wish title",
      stepsToReproduce: [
        "Log in as Alex",
        "Save a wish with an <img onerror> title",
        `GET /wish?sharedWishId=${itemId}&lang=de as Maya`,
      ],
      actualBehavior: "Rendered HTML contained a raw <img src=x ...> tag from the title.",
      evidence: page.event,
    });
  }
  await mark(state, "wishlist.unsafe-url-sanitized", {
    apiUrl: sharedItem?.url || "",
    htmlContainsJavascriptHref,
    htmlContainsUnsafeUrlText: lowerHtml.includes("javascript:alert"),
  });
  await mark(state, "wishlist.html-title-escaped", {
    htmlContainsRawImgTag,
    htmlContainsEscapedTitle: lowerHtml.includes("&lt;img"),
  });

  const latest = await sessions.alex.request("GET", "/api/account/wishlist", {
    feature: "cleanup",
    action: "owner wishlist read before unsafe input cleanup",
  });
  const latestWishlist = wishlistFromPayload(latest.json);
  await sessions.alex.request("PUT", "/api/account/wishlist", {
    feature: "cleanup",
    action: "cleanup unsafe input probe item",
    body: {
      currency: latestWishlist.currency,
      visibility: latestWishlist.visibility,
      items: withoutRunItems(latestWishlist.items),
    },
  });
}

async function raceSameOwnerSave(state, cycle) {
  const alexA = new QaSession("alex-race-a", state);
  const alexB = new QaSession("alex-race-b", state);
  await alexA.login("alex");
  await alexB.login("alex");
  const baselineResult = await alexA.request("GET", "/api/account/wishlist", {
    feature: "race",
    action: "race baseline read",
  });
  const baseline = wishlistFromPayload(baselineResult.json);
  const clean = withoutRunItems(baseline.items);
  const itemA = makeWish(`${RUN_PREFIX}_race${cycle}_a`, "race A");
  const itemB = makeWish(`${RUN_PREFIX}_race${cycle}_b`, "race B");
  await Promise.all([
    alexA.request("PUT", "/api/account/wishlist", {
      feature: "race",
      action: "parallel save A",
      body: { currency: baseline.currency, visibility: baseline.visibility, items: [...clean, itemA] },
    }),
    alexB.request("PUT", "/api/account/wishlist", {
      feature: "race",
      action: "parallel save B",
      body: { currency: baseline.currency, visibility: baseline.visibility, items: [...clean, itemB] },
    }),
  ]);
  const afterResult = await alexA.request("GET", "/api/account/wishlist", {
    feature: "race",
    action: "race final read",
  });
  const after = wishlistFromPayload(afterResult.json);
  const hasA = after.items.some((item) => item.id === itemA.id);
  const hasB = after.items.some((item) => item.id === itemB.id);
  await mark(state, "race.same-owner-parallel-save", { hasA, hasB });
  if (hasA !== hasB) {
    await recordBug(state, {
      severity: "MAJOR",
      title: "Concurrent owner wishlist saves lose one newly created item",
      stepsToReproduce: [
        "Open two authenticated Alex sessions",
        "Read the same wishlist baseline in both sessions",
        "Submit two PUT /api/account/wishlist requests at the same time, each adding a different item",
        "Fetch /api/account/wishlist",
      ],
      actualBehavior: `Final wishlist had race item A=${hasA}, race item B=${hasB}; one save appears to have overwritten the other.`,
      evidence: afterResult.event,
    });
  }

  await alexA.request("PUT", "/api/account/wishlist", {
    feature: "cleanup",
    action: "cleanup after race",
    body: {
      currency: after.currency,
      visibility: after.visibility,
      items: withoutRunItems(after.items),
    },
  });
}

async function friendsReadSmoke(state, sessions) {
  const incoming = await sessions.lina.request("GET", "/api/friends/requests?direction=incoming", {
    feature: "friends",
    action: "lina incoming requests read",
  });
  const outgoing = await sessions.alex.request("GET", "/api/friends/requests?direction=outgoing", {
    feature: "friends",
    action: "alex outgoing requests read",
  });
  if (incoming.json?.ok || outgoing.json?.ok) {
    await mark(state, "friends.requests-read", {
      linaIncoming: incoming.json?.requests?.length,
      alexOutgoing: outgoing.json?.requests?.length,
    });
  }
  const connected = await sessions.alex.request("GET", "/api/friends/connected", {
    feature: "friends",
    action: "alex connected friends read",
  });
  if (connected.json?.ok || Array.isArray(connected.json?.connections)) {
    await mark(state, "friends.connected-read", {
      count: connected.json?.connections?.length || connected.json?.friends?.length || 0,
    });
  }
}

async function sameOriginGuard(state) {
  const attacker = new QaSession("cross-origin-probe", state);
  const result = await attacker.request("POST", "/api/friends/reports", {
    feature: "external",
    action: "cross-origin report guard",
    headers: {
      origin: "https://attacker.example",
      referer: "https://attacker.example/not-wishees",
    },
    body: {
      reportedUserId: 1,
      reason: "spam",
      details: `Codex same-origin probe ${RUN_ID}`,
    },
  });
  if (result.json?.reason === "same-origin-required" || result.response?.status === 403) {
    await mark(state, "external.same-origin-guard", {
      status: result.response?.status,
      body: result.json,
    });
  }
}

async function sameOriginStateMutationGuards(state, sessions) {
  const alexWishlist = await sessions.alex.request("GET", "/api/account/wishlist", {
    feature: "external",
    action: "read alex wishlist before cross-origin guard probe",
  });
  const wishlist = wishlistFromPayload(alexWishlist.json);
  const accountResult = await sessions.alex.request("PUT", "/api/account/wishlist", {
    feature: "external",
    action: "cross-origin account wishlist guard",
    headers: {
      origin: "https://attacker.example",
      referer: "https://attacker.example/csrf",
    },
    body: {
      currency: wishlist.currency,
      visibility: wishlist.visibility,
      items: wishlist.items,
    },
  });
  if (accountResult.json?.reason === "same-origin-required" || accountResult.response?.status === 403) {
    await mark(state, "external.same-origin-account-wishlist-guard", {
      status: accountResult.response?.status,
      body: accountResult.json,
    });
  } else if (accountResult.json?.ok === true) {
    const bug = await recordBug(state, {
      severity: "CRITICAL",
      title: "Account wishlist mutation accepts cross-origin authenticated request",
      stepsToReproduce: [
        "Log in as Alex",
        "PUT /api/account/wishlist with Origin and Referer set to https://attacker.example",
        "Use the current wishlist payload unchanged",
      ],
      actualBehavior: JSON.stringify(accountResult.json),
      evidence: accountResult.event,
    });
    await mark(state, "external.same-origin-account-wishlist-guard", {
      expected: "cross-origin request is rejected",
      actual: "cross-origin wishlist PUT returned ok:true",
      bugId: bug.id,
    });
  }

  const fulfillResult = await sessions.jordan.request("POST", "/api/friends/wishlist/fulfill", {
    feature: "external",
    action: "cross-origin fulfill guard",
    headers: {
      origin: "https://attacker.example",
      referer: "https://attacker.example/csrf",
    },
    form: {
      contributionPercent: 5,
      helperMessage: `Codex cross-origin fulfill probe ${RUN_ID}`,
      ownerUserId: 12,
      itemId: "wish_e2e_noise_headphones",
      language: "de",
    },
  });
  if (fulfillResult.json?.reason === "same-origin-required" || fulfillResult.response?.status === 403) {
    await mark(state, "external.same-origin-fulfill-guard", {
      status: fulfillResult.response?.status,
      body: fulfillResult.json,
    });
  } else if (fulfillResult.json?.ok === true) {
    const bug = await recordBug(state, {
      severity: "CRITICAL",
      title: "Gift support mutation accepts cross-origin authenticated request",
      stepsToReproduce: [
        "Log in as Jordan",
        "POST /api/friends/wishlist/fulfill with Origin and Referer set to https://attacker.example",
        "Submit support for Alex item wish_e2e_noise_headphones",
      ],
      actualBehavior: JSON.stringify(fulfillResult.json),
      evidence: fulfillResult.event,
    });
    await mark(state, "external.same-origin-fulfill-guard", {
      expected: "cross-origin request is rejected",
      actual: "cross-origin fulfill POST returned ok:true",
      bugId: bug.id,
    });
  } else {
    await mark(state, "external.same-origin-fulfill-guard", {
      status: fulfillResult.response?.status,
      body: fulfillResult.json,
      note: "Mutation was rejected, but not with the same-origin-required response used by other guarded endpoints.",
    });
  }
}

function isSameOriginRejection(result) {
  return result.json?.reason === "same-origin-required" || result.response?.status === 403;
}

async function sameOriginExtendedProbe(state, startedMs) {
  const sessions = await loginActiveSessions(state);
  await cleanupRunArtifacts(state, sessions);
  const evilHeaders = {
    origin: "https://attacker.example",
    referer: "https://attacker.example/csrf",
  };

  const ownerItemId = `${RUN_PREFIX}_same_origin_owner_outcome`;
  if (await saveTemporaryOutcomeWish(state, sessions, ownerItemId, "same origin owner outcome")) {
    const marker = `Codex same-origin owner outcome ${RUN_ID}`;
    const { outcome } = await createMarkedMayaSupport(state, sessions, marker, ownerItemId);
    if (outcome?.id) {
      const decision = await sessions.alex.request("POST", "/api/account/wishlist/outcomes", {
        feature: "external",
        action: "cross-origin owner outcome guard",
        headers: evilHeaders,
        body: {
          decision: "decline",
          outcomeId: outcome.id,
          ownerReply: `${marker} attacker-origin decline`,
        },
      });
      const ownerRead = await sessions.alex.request("GET", "/api/account/wishlist/outcomes", {
        feature: "external",
        action: "owner verifies cross-origin outcome decision guard",
      });
      const remaining = activeQaOutcomes(ownerRead.json?.outcomes, ownerItemId, marker);
      await mark(state, "external.same-origin-owner-outcome-guard", {
        status: decision.response?.status,
        body: decision.json,
        remainingActiveMarkedOutcomes: remaining.length,
      });
      if (decision.json?.ok === true || remaining.length === 0) {
        await recordBug(state, {
          severity: "CRITICAL",
          title: "Owner outcome decision accepts cross-origin authenticated request",
          stepsToReproduce: [
            "Log in as Alex",
            "Create a Maya support outcome for Alex",
            "POST /api/account/wishlist/outcomes with Origin and Referer set to https://attacker.example",
            "Read Alex owner outcomes",
          ],
          actualBehavior: `Decision response: ${JSON.stringify(decision.json)}; active marked outcomes remaining: ${remaining.length}.`,
          evidence: decision.event,
        });
      }
    }
    await cleanupRunArtifacts(state, sessions);
  }

  const cancelItemId = `${RUN_PREFIX}_same_origin_helper_cancel`;
  if (await saveTemporaryOutcomeWish(state, sessions, cancelItemId, "same origin helper cancel")) {
    const marker = `Codex same-origin helper cancel ${RUN_ID}`;
    const { outcome } = await createMarkedMayaSupport(state, sessions, marker, cancelItemId);
    if (outcome?.id) {
      const cancel = await sessions.maya.request("POST", "/api/friends/wishlist/outcomes/cancel", {
        feature: "external",
        action: "cross-origin helper cancel guard",
        headers: evilHeaders,
        form: {
          ownerUserId: 12,
          itemId: cancelItemId,
          language: "de",
        },
      });
      const ownerRead = await sessions.alex.request("GET", "/api/account/wishlist/outcomes", {
        feature: "external",
        action: "owner verifies cross-origin helper cancel guard",
      });
      const remaining = activeQaOutcomes(ownerRead.json?.outcomes, cancelItemId, marker);
      await mark(state, "external.same-origin-helper-cancel-guard", {
        status: cancel.response?.status,
        body: cancel.json,
        remainingActiveMarkedOutcomes: remaining.length,
      });
      if (cancel.json?.ok === true || remaining.length === 0) {
        await recordBug(state, {
          severity: "CRITICAL",
          title: "Helper outcome cancellation accepts cross-origin authenticated request",
          stepsToReproduce: [
            "Log in as Maya",
            "Create a Maya support outcome for Alex",
            "POST /api/friends/wishlist/outcomes/cancel with Origin and Referer set to https://attacker.example",
            "Read Alex owner outcomes",
          ],
          actualBehavior: `Cancel response: ${JSON.stringify(cancel.json)}; active marked outcomes remaining: ${remaining.length}.`,
          evidence: cancel.event,
        });
      }
    }
    await cleanupRunArtifacts(state, sessions);
  }

  const readNotification = await createMayaSupportNotification(
    state,
    sessions,
    `Codex same-origin notification read ${RUN_ID}`,
  );
  if (readNotification.notification?.id) {
    const notificationId = readNotification.notification.id;
    const read = await sessions.alex.request("POST", `/api/notifications/${encodeURIComponent(notificationId)}/read`, {
      feature: "external",
      action: "cross-origin notification read guard",
      headers: evilHeaders,
    });
    const verify = await sessions.alex.request("GET", "/api/notifications", {
      feature: "external",
      action: "alex verifies cross-origin notification read guard",
    });
    const verified = Array.isArray(verify.json?.notifications)
      ? verify.json.notifications.find((entry) => entry.id === notificationId)
      : null;
    const changedOwnerReadState = Boolean(verified?.readAt);
    await mark(state, "external.same-origin-notification-read-guard", {
      status: read.response?.status,
      body: read.json,
      changedOwnerReadState,
    });
    if (read.json?.ok === true || changedOwnerReadState) {
      await recordBug(state, {
        severity: "CRITICAL",
        title: "Notification read accepts cross-origin authenticated request",
        stepsToReproduce: [
          "Create a Maya support notification for Alex",
          "POST /api/notifications/{id}/read as Alex with Origin and Referer set to https://attacker.example",
          "GET /api/notifications as Alex",
        ],
        actualBehavior: `Read response: ${JSON.stringify(read.json)}; Alex notification readAt: ${verified?.readAt || null}.`,
        evidence: read.event,
      });
    }
  }
  await cleanupRunArtifacts(state, sessions);

  const deleteNotification = await createMayaSupportNotification(
    state,
    sessions,
    `Codex same-origin notification delete ${RUN_ID}`,
  );
  if (deleteNotification.notification?.id) {
    const notificationId = deleteNotification.notification.id;
    const del = await sessions.alex.request("DELETE", `/api/notifications/${encodeURIComponent(notificationId)}`, {
      feature: "external",
      action: "cross-origin notification delete guard",
      headers: evilHeaders,
    });
    const verify = await sessions.alex.request("GET", "/api/notifications", {
      feature: "external",
      action: "alex verifies cross-origin notification delete guard",
    });
    const stillPresent = Array.isArray(verify.json?.notifications)
      ? verify.json.notifications.some((entry) => entry.id === notificationId)
      : false;
    await mark(state, "external.same-origin-notification-delete-guard", {
      status: del.response?.status,
      body: del.json,
      stillPresent,
    });
    if (del.json?.ok === true || !stillPresent) {
      await recordBug(state, {
        severity: "CRITICAL",
        title: "Notification delete accepts cross-origin authenticated request",
        stepsToReproduce: [
          "Create a Maya support notification for Alex",
          "DELETE /api/notifications/{id} as Alex with Origin and Referer set to https://attacker.example",
          "GET /api/notifications as Alex",
        ],
        actualBehavior: `Delete response: ${JSON.stringify(del.json)}; still present for Alex: ${stillPresent}.`,
        evidence: del.event,
      });
    }
  }
  await cleanupRunArtifacts(state, sessions);

  const invite = await sessions.maya.request("POST", "/api/friends/invite", {
    feature: "external",
    action: "cross-origin friend invite guard",
    headers: evilHeaders,
    body: {
      inviteCode: "12",
      language: "de",
    },
  });
  await mark(state, "external.same-origin-friend-invite-guard", {
    status: invite.response?.status,
    body: invite.json,
  });
  if (invite.json?.ok === true || !isSameOriginRejection(invite)) {
    await recordBug(state, {
      severity: "CRITICAL",
      title: "Friend invite generation accepts cross-origin authenticated request",
      stepsToReproduce: [
        "Log in as Maya",
        "POST /api/friends/invite with Origin and Referer set to https://attacker.example",
        "Use body { inviteCode: \"12\", language: \"de\" }",
      ],
      actualBehavior: JSON.stringify(invite.json ?? invite.text),
      evidence: invite.event,
    });
  }

  await cleanupRunArtifacts(state, sessions);
  await emitTelemetry(state, startedMs, "extended same-origin guard probe completed", "matrix");
}

async function probeRequestedHost(state) {
  const probe = new QaSession("target-probe", state);
  const result = await probe.request("GET", REQUESTED_TARGET, {
    feature: "target",
    action: "requested target host probe",
    headers: { accept: "text/html" },
    timeoutMs: 10000,
  });
  if (result.error) {
    state.notes.push({
      ts: nowIso(),
      type: "target-host",
      message: `${REQUESTED_TARGET} was not reachable from this runner; using ${BASE_URL}.`,
      error: result.error,
    });
    await saveJson(STATE_FILE, state);
  }
  await mark(state, "target.host-resolution", {
    requestedTarget: REQUESTED_TARGET,
    actualTarget: BASE_URL,
    error: result.error,
    status: result.response?.status,
  });
}

async function declineExistingOutcome(state, startedMs, outcomeId, ownerReply) {
  const session = new QaSession("alex-browser-decline", state);
  await session.login("alex");
  const result = await session.request("POST", "/api/account/wishlist/outcomes", {
    feature: "browser-realtime",
    action: `alex declines existing outcome ${outcomeId}`,
    body: {
      decision: "decline",
      outcomeId,
      ownerReply: ownerReply || `Codex browser decline ${RUN_ID}`,
    },
  });
  await mark(state, "browser.owner-decline-existing-outcome", {
    outcomeId,
    status: result.response?.status,
    body: result.json ?? result.text,
  });
  console.log(
    JSON.stringify(
      {
        outcomeId,
        status: result.response?.status,
        body: result.json ?? result.text,
        elapsedTime: elapsed(startedMs),
      },
      null,
      2,
    ),
  );
}

async function listOwnerOutcomes(state, startedMs) {
  const session = new QaSession("alex-browser-list-outcomes", state);
  await session.login("alex");
  const result = await session.request("GET", "/api/account/wishlist/outcomes", {
    feature: "browser-realtime",
    action: "alex lists owner outcomes for browser repro",
  });
  await mark(state, "browser.owner-list-outcomes", {
    status: result.response?.status,
    count: Array.isArray(result.json?.outcomes) ? result.json.outcomes.length : null,
  });
  console.log(
    JSON.stringify(
      {
        status: result.response?.status,
        body: result.json ?? result.text,
        elapsedTime: elapsed(startedMs),
      },
      null,
      2,
    ),
  );
}

async function runCycle(state, cycle, startedMs) {
  await emitTelemetry(state, startedMs, `cycle ${cycle} starting`, "matrix");
  const sessions = await loginMatrix(state);
  await authBoundaries(state, sessions);
  await wishlistCrudAndSharing(state, sessions, cycle);
  await wishlistInputSecurityProbe(state, sessions, cycle);
  await raceSameOwnerSave(state, cycle);
  await friendsReadSmoke(state, sessions);
  await sameOriginGuard(state);
  await sameOriginStateMutationGuards(state, sessions);
  await cleanupRunArtifacts(state, sessions);
  await emitTelemetry(state, startedMs, `cycle ${cycle} complete`, "matrix");
}

async function loginActiveSessions(state) {
  const sessions = {};
  for (const key of ["alex", "maya", "jordan", "lina"]) {
    sessions[key] = new QaSession(key, state);
    const login = await sessions[key].login(key);
    if (login?.ok) {
      const point = key === "lina" ? "auth.viewer-login.lina" : `auth.member-login.${key}`;
      await mark(state, point, { ok: true, cleanupOnly: true });
    }
  }
  return sessions;
}

function scriptSourcesFromHtml(html) {
  const sources = [];
  const pattern = /<script[^>]+src="([^"]+)"/g;
  let match;
  while ((match = pattern.exec(html))) {
    const src = match[1].replaceAll("&amp;", "&");
    if (src.startsWith("/")) sources.push(src);
    else if (src.startsWith(BASE_URL)) sources.push(src.slice(BASE_URL.length));
  }
  return [...new Set(sources)];
}

function snippetsForNeedles(text, needles, radius = 1400) {
  const lower = text.toLowerCase();
  const snippets = [];
  for (const needle of needles) {
    const index = lower.indexOf(needle.toLowerCase());
    if (index < 0) continue;
    snippets.push({
      needle,
      snippet: text.slice(Math.max(0, index - radius), index + radius),
    });
  }
  return snippets;
}

function apiLiteralSnippets(text, pattern, radius = 500) {
  const snippets = [];
  const seen = new Set();
  let match;
  pattern.lastIndex = 0;
  while ((match = pattern.exec(text))) {
    const literal = match[0];
    const key = `${literal}:${match.index}`;
    if (seen.has(key)) continue;
    seen.add(key);
    snippets.push({
      literal,
      snippet: text.slice(Math.max(0, match.index - radius), match.index + literal.length + radius),
    });
  }
  return snippets;
}

function friendIdsFromConnectedPayload(payload) {
  const rows = Array.isArray(payload?.friends)
    ? payload.friends
    : Array.isArray(payload?.connections)
      ? payload.connections
      : [];
  return rows
    .map((row) => Number(row.friendUserId || row.userId || row.id || row.code || 0))
    .filter((id) => Number.isInteger(id) && id > 0);
}

function requestsFromPayload(payload) {
  return Array.isArray(payload?.requests) ? payload.requests : [];
}

async function readFriendMatrixSnapshot(state, sessions, label = "friend matrix snapshot") {
  const snapshot = {};
  for (const key of ["alex", "maya", "jordan", "lina"]) {
    if (!sessions[key]) continue;
    const [connected, incoming, outgoing] = await Promise.all([
      sessions[key].request("GET", "/api/friends/connected", {
        feature: "friends",
        action: `${label}: ${key} connected friends`,
      }),
      sessions[key].request("GET", "/api/friends/requests?direction=incoming", {
        feature: "friends",
        action: `${label}: ${key} incoming friend requests`,
      }),
      sessions[key].request("GET", "/api/friends/requests?direction=outgoing", {
        feature: "friends",
        action: `${label}: ${key} outgoing friend requests`,
      }),
    ]);
    snapshot[key] = {
      connectedIds: friendIdsFromConnectedPayload(connected.json),
      incoming: requestsFromPayload(incoming.json),
      outgoing: requestsFromPayload(outgoing.json),
      statuses: {
        connected: connected.response?.status,
        incoming: incoming.response?.status,
        outgoing: outgoing.response?.status,
      },
    };
  }
  await mark(state, "friends.connected-read.all-users", {
    alex: snapshot.alex?.connectedIds || [],
    maya: snapshot.maya?.connectedIds || [],
    jordan: snapshot.jordan?.connectedIds || [],
    lina: snapshot.lina?.connectedIds || [],
  });
  return snapshot;
}

function requestIdOf(request) {
  return request?.id || request?.requestId || request?.connectionId || request?.code || "";
}

async function discoverContributionActions(state, startedMs) {
  const sessions = await loginActiveSessions(state);
  const page = await sessions.maya.request("GET", "/friends/wishlist?invite=user-12&lang=de", {
    feature: "discovery",
    action: "fetch friend wishlist page for action discovery",
    headers: { accept: "text/html,application/xhtml+xml" },
  });
  const needles = [
    "/api/",
    "outcomes",
    "wishlist/outcomes",
    "contribution",
    "promised",
    "support",
    "offer",
    "claim",
    "Angebot speichern",
    "Ganzen Wunsch",
    "Beitragen",
    "zurueckziehen",
    "zurückziehen",
  ];
  const htmlMatches = snippetsForNeedles(page.text || "", needles);
  const sources = scriptSourcesFromHtml(page.text || "");
  const chunkMatches = [];
  for (const source of sources) {
    const script = await sessions.maya.request("GET", source, {
      feature: "discovery",
      action: `fetch script ${source}`,
      headers: { accept: "application/javascript,*/*" },
      timeoutMs: 20000,
    });
    if (!script.text) continue;
    const matches = snippetsForNeedles(script.text, needles);
    if (matches.length > 0) {
      chunkMatches.push({
        source,
        bytes: script.text.length,
        matches,
      });
    }
  }
  const summary = {
    htmlMatches,
    chunkMatches: chunkMatches.slice(0, 20),
    scriptCount: sources.length,
  };
  await appendJsonl(EVENTS_FILE, {
    ts: nowIso(),
    runId: RUN_ID,
    session: "maya",
    feature: "discovery",
    action: "summarize contribution action discovery",
    response: summary,
  });
  console.log(JSON.stringify(summary, null, 2));
  await emitTelemetry(state, startedMs, "contribution-action discovery completed", "maya");
}

async function discoverNotificationActions(state, startedMs) {
  const sessions = await loginActiveSessions(state);
  const page = await sessions.alex.request("GET", "/notifications?lang=de", {
    feature: "discovery",
    action: "fetch notifications page for action discovery",
    headers: { accept: "text/html,application/xhtml+xml" },
  });
  const needles = [
    "/api/notifications",
    "notifications",
    "notificationId",
    "canDelete",
    "delete",
    "readAt",
    "mark",
    "unread",
  ];
  const htmlMatches = snippetsForNeedles(page.text || "", needles);
  const sources = scriptSourcesFromHtml(page.text || "");
  const chunkMatches = [];
  for (const source of sources) {
    const script = await sessions.alex.request("GET", source, {
      feature: "discovery",
      action: `fetch notifications script ${source}`,
      headers: { accept: "application/javascript,*/*" },
      timeoutMs: 20000,
    });
    if (!script.text) continue;
    const matches = snippetsForNeedles(script.text, needles);
    if (matches.length > 0) {
      chunkMatches.push({
        source,
        bytes: script.text.length,
        matches,
      });
    }
  }
  const summary = {
    htmlMatches,
    chunkMatches: chunkMatches.slice(0, 20),
    scriptCount: sources.length,
  };
  await appendJsonl(EVENTS_FILE, {
    ts: nowIso(),
    runId: RUN_ID,
    session: "alex",
    feature: "discovery",
    action: "summarize notification action discovery",
    response: summary,
  });
  console.log(JSON.stringify(summary, null, 2));
  await emitTelemetry(state, startedMs, "notification-action discovery completed", "alex");
}

async function discoverFriendActions(state, startedMs) {
  const sessions = await loginActiveSessions(state);
  const page = await sessions.maya.request("GET", "/friends?lang=de", {
    feature: "discovery",
    action: "fetch friends page for action discovery",
    headers: { accept: "text/html,application/xhtml+xml" },
  });
  const needles = [
    "/api/friends",
    "friends/requests",
    "friends/connected",
    "accept",
    "decline",
    "cancel",
    "invite",
    "email",
    "requestId",
    "friendUserId",
  ];
  const htmlMatches = snippetsForNeedles(page.text || "", needles);
  const htmlApiLiterals = apiLiteralSnippets(page.text || "", /\/api\/friends[^"`')},\s]+/g, 450);
  const sources = scriptSourcesFromHtml(page.text || "");
  const chunkMatches = [];
  const apiLiterals = [];
  for (const source of sources) {
    const script = await sessions.maya.request("GET", source, {
      feature: "discovery",
      action: `fetch friends script ${source}`,
      headers: { accept: "application/javascript,*/*" },
      timeoutMs: 20000,
    });
    if (!script.text) continue;
    const matches = snippetsForNeedles(script.text, needles);
    const endpointMatches = apiLiteralSnippets(script.text, /\/api\/friends[^"`')},\s]+/g, 450);
    if (matches.length > 0) {
      chunkMatches.push({
        source,
        bytes: script.text.length,
        matches,
      });
    }
    if (endpointMatches.length > 0) {
      apiLiterals.push({
        source,
        bytes: script.text.length,
        matches: endpointMatches,
      });
    }
  }
  const summary = {
    htmlMatches,
    htmlApiLiterals,
    chunkMatches: chunkMatches.slice(0, 20),
    apiLiterals: apiLiterals.slice(0, 20),
    scriptCount: sources.length,
  };
  await appendJsonl(EVENTS_FILE, {
    ts: nowIso(),
    runId: RUN_ID,
    session: "maya",
    feature: "discovery",
    action: "summarize friend action discovery",
    response: summary,
  });
  console.log(JSON.stringify(summary, null, 2));
  await emitTelemetry(state, startedMs, "friend-action discovery completed", "maya");
}

async function jordanFulfillProbe(state, startedMs) {
  const sessions = await loginActiveSessions(state);
  const message = `Codex Jordan realtime probe ${RUN_ID}`;
  const result = await sessions.jordan.request("POST", "/api/friends/wishlist/fulfill", {
    feature: "realtime",
    action: "jordan offers support for alex noise headphones",
    form: {
      contributionPercent: 10,
      helperMessage: message,
      ownerUserId: 12,
      itemId: "wish_e2e_noise_headphones",
      language: "de",
    },
  });
  if (result.json?.ok && result.json?.outcome) {
    await mark(state, "realtime.maya-viewport-updates-after-support", {
      ...(state.coverage["realtime.maya-viewport-updates-after-support"]?.lastDetail || {}),
      jordanFulfillProbe: {
        outcomeId: result.json.outcome.id,
        itemId: result.json.outcome.itemId,
        contributionPercent: result.json.outcome.contributionPercent,
        helperUserId: result.json.outcome.helperUserId,
      },
    });
  } else {
    await recordBug(state, {
      severity: "MAJOR",
      title: "Jordan could not create support outcome for shared Alex wish",
      stepsToReproduce: [
        "Log in as e2e-jordan@wishees.local",
        "POST /api/friends/wishlist/fulfill for ownerUserId=12 itemId=wish_e2e_noise_headphones",
      ],
      actualBehavior: JSON.stringify(result.json ?? result.text ?? result.error),
      evidence: result.event,
    });
  }
  console.log(JSON.stringify({ ok: result.json?.ok, response: result.json, error: result.error }, null, 2));
  await emitTelemetry(state, startedMs, "jordan fulfill probe submitted", "jordan");
}

function activeQaOutcomes(outcomes, itemId, marker) {
  return (outcomes || []).filter((outcome) => {
    const isSameItem = outcome.itemId === itemId;
    const isActive = ["promised", "fulfilled"].includes(String(outcome.status || ""));
    const isQa = JSON.stringify(outcome).includes(marker);
    return isSameItem && isActive && isQa;
  });
}

function qaOutcomesByMarker(outcomes, marker) {
  return (outcomes || []).filter((outcome) => JSON.stringify(outcome).includes(marker));
}

async function saveTemporaryOutcomeWish(state, sessions, itemId, suffix) {
  const beforeResult = await sessions.alex.request("GET", "/api/account/wishlist", {
    feature: "gift-intent",
    action: `owner wishlist read before ${suffix}`,
  });
  if (!beforeResult.json?.ok) {
    await recordBug(state, {
      severity: "MAJOR",
      title: "Could not read owner wishlist before owner decision race",
      stepsToReproduce: ["Log in as Alex", "GET /api/account/wishlist"],
      actualBehavior: JSON.stringify(beforeResult.json ?? beforeResult.error),
      evidence: beforeResult.event,
    });
    return false;
  }
  const before = wishlistFromPayload(beforeResult.json);
  const item = {
    ...makeWish(itemId, suffix),
    title: `Codex ${suffix} ${RUN_ID}`,
    visibility: "friends",
  };
  const save = await sessions.alex.request("PUT", "/api/account/wishlist", {
    feature: "gift-intent",
    action: `owner saves temporary wish for ${suffix}`,
    body: {
      currency: before.currency,
      visibility: before.visibility,
      items: [...withoutRunItems(before.items), item],
    },
  });
  if (!save.json?.ok) {
    await recordBug(state, {
      severity: "MAJOR",
      title: "Owner could not save temporary wish for owner decision race",
      stepsToReproduce: ["Log in as Alex", "PUT /api/account/wishlist with a run-prefixed temporary item"],
      actualBehavior: JSON.stringify(save.json ?? save.error),
      evidence: save.event,
    });
    return false;
  }
  return true;
}

async function ownerDecisionRaceProbe(state, startedMs) {
  const sessions = await loginActiveSessions(state);
  await cleanupRunArtifacts(state, sessions);

  const confirmItemId = `${RUN_PREFIX}_owner_decision_verb`;
  const confirmReady = await saveTemporaryOutcomeWish(state, sessions, confirmItemId, "owner decision verb");
  let positiveDecision = null;
  let positiveResponse = null;
  if (confirmReady) {
    const confirmMarker = `Codex owner confirm verb ${RUN_ID}`;
    const { outcome } = await createMarkedMayaSupport(state, sessions, confirmMarker, confirmItemId);
    const candidates = ["confirm", "received", "accept", "received_confirmed"];
    if (outcome?.id) {
      for (const candidate of candidates) {
        const result = await sessions.alex.request("POST", "/api/account/wishlist/outcomes", {
          feature: "gift-intent",
          action: `owner tries positive outcome decision ${candidate}`,
          body: {
            decision: candidate,
            outcomeId: outcome.id,
            ownerReply: `${confirmMarker} ${candidate}`,
          },
        });
        if (result.json?.ok === true) {
          positiveDecision = candidate;
          positiveResponse = result;
          break;
        }
      }
    }
  }
  await mark(state, "gift-intent.owner-confirm-decision", {
    positiveDecision,
    positiveStatus: positiveResponse?.response?.status || null,
    positiveBody: positiveResponse?.json || null,
  });
  await cleanupRunArtifacts(state, sessions);

  if (!positiveDecision) {
    state.notes.push({
      ts: nowIso(),
      type: "owner-decision-race-skipped",
      reason: "No positive owner decision candidate returned ok:true",
    });
    await saveJson(STATE_FILE, state);
    await emitTelemetry(state, startedMs, "owner decision race skipped after verb discovery", "alex");
    return;
  }

  const itemId = `${RUN_PREFIX}_owner_decision_race`;
  const raceReady = await saveTemporaryOutcomeWish(state, sessions, itemId, "owner decision race");
  if (!raceReady) {
    await cleanupRunArtifacts(state, sessions);
    await emitTelemetry(state, startedMs, "owner decision race setup failed", "alex");
    return;
  }

  const marker = `Codex owner decision race ${RUN_ID}`;
  const { outcome } = await createMarkedMayaSupport(state, sessions, marker, itemId);
  if (!outcome?.id) {
    await recordBug(state, {
      severity: "MAJOR",
      title: "Could not create support outcome for owner decision race",
      stepsToReproduce: ["Run owner decision race probe", "Create Maya support for a run-prefixed Alex wish"],
      actualBehavior: "Owner outcome read did not contain the marked support outcome.",
    });
    await cleanupRunArtifacts(state, sessions);
    return;
  }

  const confirmSession = new QaSession("alex-owner-confirm-race", state);
  const declineSession = new QaSession("alex-owner-decline-race", state);
  await confirmSession.login("alex");
  await declineSession.login("alex");
  const [confirm, decline] = await Promise.all([
    confirmSession.request("POST", "/api/account/wishlist/outcomes", {
      feature: "gift-intent",
      action: "alex confirms outcome during owner decision race",
      body: {
        decision: positiveDecision,
        outcomeId: outcome.id,
        ownerReply: `${marker} confirmed`,
      },
    }),
    declineSession.request("POST", "/api/account/wishlist/outcomes", {
      feature: "gift-intent",
      action: "alex declines outcome during owner decision race",
      body: {
        decision: "decline",
        outcomeId: outcome.id,
        ownerReply: `${marker} declined`,
      },
    }),
  ]);

  const ownerRead = await sessions.alex.request("GET", "/api/account/wishlist/outcomes", {
    feature: "gift-intent",
    action: "owner reads outcomes after owner decision race",
  });
  const mayaNotifications = await sessions.maya.request("GET", "/api/notifications", {
    feature: "gift-intent",
    action: "maya reads notifications after owner decision race",
  });
  const markedOutcomes = qaOutcomesByMarker(ownerRead.json?.outcomes, marker);
  const markedNotifications = Array.isArray(mayaNotifications.json?.notifications)
    ? mayaNotifications.json.notifications.filter((entry) => JSON.stringify(entry).includes("owner decision race"))
    : [];

  await mark(state, "gift-intent.owner-decision-race-same-outcome", {
    outcomeId: outcome.id,
    positiveDecision,
    confirmStatus: confirm.response?.status,
    confirmBody: confirm.json,
    declineStatus: decline.response?.status,
    declineBody: decline.json,
    finalOutcomes: markedOutcomes,
    helperNotificationCount: markedNotifications.length,
  });
  if (confirm.json?.ok === true && decline.json?.ok === true) {
    await recordBug(state, {
      severity: "MAJOR",
      title: "Concurrent owner decisions both succeed for the same gift support outcome",
      stepsToReproduce: [
        "Create a temporary Alex wish and have Maya offer support",
        `Open two Alex sessions and concurrently POST /api/account/wishlist/outcomes with decision=${positiveDecision} and decision=decline for the same outcomeId`,
        "Read Alex owner outcomes and Maya notifications",
      ],
      actualBehavior: `Both conflicting owner decisions returned ok:true. Final marked outcomes: ${JSON.stringify(
        markedOutcomes,
      )}; Maya marked notifications: ${markedNotifications.length}.`,
      evidence: {
        confirm: confirm.event,
        decline: decline.event,
        ownerRead: ownerRead.event,
        mayaNotifications: mayaNotifications.event,
      },
    });
  }

  await cleanupRunArtifacts(state, sessions);
  const cleanupRead = await sessions.alex.request("GET", "/api/account/wishlist/outcomes", {
    feature: "cleanup",
    action: "owner verifies cleanup after owner decision race",
  });
  const remaining = qaOutcomesByMarker(cleanupRead.json?.outcomes, marker);
  await mark(state, "gift-intent.owner-decision-race-cleanup", {
    marker,
    remaining: remaining.length,
  });
  if (remaining.length > 0) {
    await recordBug(state, {
      severity: "MAJOR",
      title: "Owner decision race cleanup left a marked support outcome behind",
      stepsToReproduce: [
        "Run owner decision race probe",
        "Allow cleanupRunArtifacts to decline QA outcomes and remove run-prefixed wishes",
        "GET /api/account/wishlist/outcomes as Alex",
      ],
      actualBehavior: `Remaining marked outcomes: ${JSON.stringify(remaining)}.`,
      evidence: cleanupRead.event,
    });
  }
  await emitTelemetry(state, startedMs, "owner decision race probe completed", "alex");
}

async function giftRaceProbe(state, startedMs) {
  const sessions = await loginActiveSessions(state);
  await cleanupRunArtifacts(state, sessions);
  const itemId = "wish_e2e_coffee_grinder";
  const marker = `Codex concurrent helper race ${RUN_ID}`;
  const [mayaResult, jordanResult] = await Promise.all([
    sessions.maya.request("POST", "/api/friends/wishlist/fulfill", {
      feature: "gift-intent",
      action: "maya concurrent 60 percent support",
      form: {
        contributionPercent: 60,
        helperMessage: `${marker} maya`,
        ownerUserId: 12,
        itemId,
        language: "de",
      },
    }),
    sessions.jordan.request("POST", "/api/friends/wishlist/fulfill", {
      feature: "gift-intent",
      action: "jordan concurrent 60 percent support",
      form: {
        contributionPercent: 60,
        helperMessage: `${marker} jordan`,
        ownerUserId: 12,
        itemId,
        language: "de",
      },
    }),
  ]);
  const ownerOutcomes = await sessions.alex.request("GET", "/api/account/wishlist/outcomes", {
    feature: "gift-intent",
    action: "owner reads outcomes after concurrent helper race",
  });
  const qaOutcomes = activeQaOutcomes(ownerOutcomes.json?.outcomes, itemId, marker);
  const totalPercent = qaOutcomes.reduce((sum, outcome) => sum + Number(outcome.contributionPercent || 0), 0);
  await mark(state, "gift-intent.concurrent-helpers-same-item", {
    mayaOk: mayaResult.json?.ok,
    jordanOk: jordanResult.json?.ok,
    activeOutcomeCount: qaOutcomes.length,
    totalPercent,
    outcomeIds: qaOutcomes.map((outcome) => outcome.id),
  });
  if (qaOutcomes.length > 1 && totalPercent > 100) {
    await recordBug(state, {
      severity: "CRITICAL",
      title: "Concurrent helpers can over-commit the same wish above 100 percent",
      stepsToReproduce: [
        "Log in as Maya and Jordan in separate sessions",
        "Simultaneously POST /api/friends/wishlist/fulfill for Alex item wish_e2e_coffee_grinder",
        "Use contributionPercent=60 from each helper",
        "Read Alex owner outcomes",
      ],
      actualBehavior: `Both helpers produced active outcomes totaling ${totalPercent}% (${qaOutcomes
        .map((outcome) => `${outcome.helperUserId}:${outcome.contributionPercent}`)
        .join(", ")}).`,
      evidence: ownerOutcomes.event,
    });
  }
  await cleanupRunArtifacts(state, sessions);
  const cleanupRead = await sessions.alex.request("GET", "/api/account/wishlist/outcomes", {
    feature: "gift-intent",
    action: "owner verifies cleanup after concurrent helper race",
  });
  const remaining = activeQaOutcomes(cleanupRead.json?.outcomes, itemId, marker);
  if (remaining.length === 0) {
    await mark(state, "gift-intent.concurrent-helpers-cleanup", { marker, cleaned: true });
  }
  console.log(
    JSON.stringify(
      {
        maya: mayaResult.json,
        jordan: jordanResult.json,
        activeOutcomeCount: qaOutcomes.length,
        totalPercent,
        cleanupRemaining: remaining.length,
      },
      null,
      2,
    ),
  );
  await emitTelemetry(state, startedMs, "gift-intent concurrent helper race completed", "maya+jordan");
}

async function giftContributionBoundaryProbe(state, startedMs) {
  const sessions = await loginActiveSessions(state);
  await cleanupRunArtifacts(state, sessions);
  const cases = [
    {
      key: "zero",
      value: 0,
      point: "gift-intent.contribution-boundary-zero",
      expected: "reject",
      severity: "MAJOR",
    },
    {
      key: "negative",
      value: -10,
      point: "gift-intent.contribution-boundary-negative",
      expected: "reject",
      severity: "CRITICAL",
    },
    {
      key: "over_100",
      value: 101,
      point: "gift-intent.contribution-boundary-over-100",
      expected: "reject",
      severity: "CRITICAL",
    },
    {
      key: "huge",
      value: 1000,
      point: "gift-intent.contribution-boundary-huge",
      expected: "reject",
      severity: "CRITICAL",
    },
    {
      key: "nonnumeric",
      value: "not-a-number",
      point: "gift-intent.contribution-boundary-nonnumeric",
      expected: "reject",
      severity: "MAJOR",
    },
    {
      key: "decimal",
      value: "33.7",
      point: "gift-intent.contribution-boundary-decimal",
      expected: "reject-or-normalize",
      severity: "MINOR",
    },
  ];

  for (const testCase of cases) {
    const itemId = `${RUN_PREFIX}_contribution_${testCase.key}`;
    const ready = await saveTemporaryOutcomeWish(state, sessions, itemId, `contribution ${testCase.key}`);
    if (!ready) continue;
    const marker = `Codex contribution boundary ${testCase.key} ${RUN_ID}`;
    const result = await sessions.maya.request("POST", "/api/friends/wishlist/fulfill", {
      feature: "gift-intent",
      action: `maya contribution boundary ${testCase.key}`,
      form: {
        contributionPercent: testCase.value,
        helperMessage: marker,
        ownerUserId: 12,
        itemId,
        language: "de",
      },
    });
    const ownerRead = await sessions.alex.request("GET", "/api/account/wishlist/outcomes", {
      feature: "gift-intent",
      action: `owner reads outcomes after contribution boundary ${testCase.key}`,
    });
    const marked = qaOutcomesByMarker(ownerRead.json?.outcomes, marker);
    const active = activeQaOutcomes(ownerRead.json?.outcomes, itemId, marker);
    const storedPercents = marked.map((outcome) => outcome.contributionPercent);
    const accepted = result.json?.ok === true || marked.length > 0;
    await mark(state, testCase.point, {
      submittedValue: testCase.value,
      expected: testCase.expected,
      responseStatus: result.response?.status,
      responseBody: result.json,
      markedOutcomeCount: marked.length,
      activeOutcomeCount: active.length,
      storedPercents,
    });

    if (testCase.expected === "reject" && accepted) {
      await recordBug(state, {
        severity: testCase.severity,
        title: "Gift support API accepts out-of-range contribution percent",
        stepsToReproduce: [
          "Log in as Maya",
          "Create a temporary friends-visible Alex wish",
          `POST /api/friends/wishlist/fulfill with contributionPercent=${JSON.stringify(testCase.value)}`,
          "Read Alex owner outcomes",
        ],
        actualBehavior: `Response: ${JSON.stringify(result.json)}; marked outcomes: ${JSON.stringify(marked)}.`,
        evidence: {
          create: result.event,
          ownerRead: ownerRead.event,
        },
      });
    } else if (testCase.key === "decimal" && accepted) {
      const invalidStored = marked.some((outcome) => !Number.isInteger(Number(outcome.contributionPercent)));
      if (invalidStored) {
        await recordBug(state, {
          severity: testCase.severity,
          title: "Gift support API stores fractional contribution percent",
          stepsToReproduce: [
            "Log in as Maya",
            "Create a temporary friends-visible Alex wish",
            "POST /api/friends/wishlist/fulfill with contributionPercent=33.7",
            "Read Alex owner outcomes",
          ],
          actualBehavior: `Fractional stored contributionPercent values: ${JSON.stringify(storedPercents)}.`,
          evidence: ownerRead.event,
        });
      }
    }

    await cleanupRunArtifacts(state, sessions);
  }

  await cleanupRunArtifacts(state, sessions);
  await emitTelemetry(state, startedMs, "gift contribution boundary probe completed", "maya");
}

async function sameHelperConcurrentProbe(state, startedMs) {
  const sessions = await loginActiveSessions(state);
  await cleanupRunArtifacts(state, sessions);
  const mayaA = new QaSession("maya-dup-a", state);
  const mayaB = new QaSession("maya-dup-b", state);
  await mayaA.login("maya");
  await mayaB.login("maya");
  const itemId = "wish_e2e_noise_headphones";
  const marker = `Codex same-helper concurrent support ${RUN_ID}`;
  const [first, second] = await Promise.all([
    mayaA.request("POST", "/api/friends/wishlist/fulfill", {
      feature: "gift-intent",
      action: "maya same-helper concurrent support A",
      form: {
        contributionPercent: 55,
        helperMessage: `${marker} A`,
        ownerUserId: 12,
        itemId,
        language: "de",
      },
    }),
    mayaB.request("POST", "/api/friends/wishlist/fulfill", {
      feature: "gift-intent",
      action: "maya same-helper concurrent support B",
      form: {
        contributionPercent: 55,
        helperMessage: `${marker} B`,
        ownerUserId: 12,
        itemId,
        language: "de",
      },
    }),
  ]);
  const ownerOutcomes = await sessions.alex.request("GET", "/api/account/wishlist/outcomes", {
    feature: "gift-intent",
    action: "owner reads outcomes after same-helper concurrent support",
  });
  const qaOutcomes = activeQaOutcomes(ownerOutcomes.json?.outcomes, itemId, marker);
  const totalPercent = qaOutcomes.reduce((sum, outcome) => sum + Number(outcome.contributionPercent || 0), 0);
  await mark(state, "gift-intent.same-helper-concurrent-submit", {
    firstOk: first.json?.ok,
    secondOk: second.json?.ok,
    activeOutcomeCount: qaOutcomes.length,
    totalPercent,
    outcomeIds: qaOutcomes.map((outcome) => outcome.id),
  });
  if (qaOutcomes.length > 1) {
    await recordBug(state, {
      severity: totalPercent > 100 ? "CRITICAL" : "MAJOR",
      title: "Same helper can create duplicate active support outcomes for one wish",
      stepsToReproduce: [
        "Open two authenticated Maya sessions",
        "Simultaneously POST /api/friends/wishlist/fulfill for Alex item wish_e2e_noise_headphones",
        "Use contributionPercent=55 in both requests",
        "Read Alex owner outcomes",
      ],
      actualBehavior: `Maya produced ${qaOutcomes.length} active outcomes totaling ${totalPercent}% (${qaOutcomes
        .map((outcome) => `${outcome.id}:${outcome.contributionPercent}`)
        .join(", ")}).`,
      evidence: ownerOutcomes.event,
    });
  }
  await cleanupRunArtifacts(state, sessions);
  const cleanupRead = await sessions.alex.request("GET", "/api/account/wishlist/outcomes", {
    feature: "gift-intent",
    action: "owner verifies cleanup after same-helper concurrent support",
  });
  const remaining = activeQaOutcomes(cleanupRead.json?.outcomes, itemId, marker);
  if (remaining.length === 0) {
    await mark(state, "gift-intent.same-helper-concurrent-cleanup", { marker, cleaned: true });
  }
  console.log(
    JSON.stringify(
      {
        first: first.json,
        second: second.json,
        activeOutcomeCount: qaOutcomes.length,
        totalPercent,
        cleanupRemaining: remaining.length,
      },
      null,
      2,
    ),
  );
  await emitTelemetry(state, startedMs, "gift-intent same-helper concurrent probe completed", "maya");
}

async function friendInviteBoundaryProbe(state, startedMs) {
  const sessions = await loginActiveSessions(state);
  sessions.disabled = new QaSession("disabled-invite", state);
  const disabledLogin = await sessions.disabled.login("disabled");
  if (disabledLogin?.ok === false && disabledLogin.code === "account-disabled") {
    await mark(state, "auth.disabled-rejected", { code: disabledLogin.code, inviteProbe: true });
  }
  const before = await readFriendMatrixSnapshot(state, sessions, "before invite probe");

  const memberInviteApi = await sessions.maya.request("POST", "/api/friends/invite", {
    feature: "friends",
    action: "member generates alex friend invite path",
    body: { inviteCode: "12", language: "de" },
  });
  await mark(state, "friends.invite-api.member", {
    status: memberInviteApi.response?.status,
    body: memberInviteApi.json,
  });

  const anon = new QaSession("anonymous-invite", state);
  const anonymousInviteApi = await anon.request("POST", "/api/friends/invite", {
    feature: "friends",
    action: "anonymous friend invite api denied",
    body: { inviteCode: "12", language: "de" },
  });
  await mark(state, "friends.invite-api.anonymous", {
    status: anonymousInviteApi.response?.status,
    body: anonymousInviteApi.json,
  });
  if (anonymousInviteApi.json?.ok === true) {
    await recordBug(state, {
      severity: "MAJOR",
      title: "Anonymous user can generate friend invite links",
      stepsToReproduce: [
        "Without a session, POST /api/friends/invite",
        "Use body { inviteCode: \"12\", language: \"de\" }",
      ],
      actualBehavior: JSON.stringify(anonymousInviteApi.json),
      evidence: anonymousInviteApi.event,
    });
  }

  const disabledInviteApi = await sessions.disabled.request("POST", "/api/friends/invite", {
    feature: "friends",
    action: "disabled friend invite api denied",
    body: { inviteCode: "12", language: "de" },
  });
  await mark(state, "friends.invite-api.disabled", {
    status: disabledInviteApi.response?.status,
    body: disabledInviteApi.json,
  });
  if (disabledInviteApi.json?.ok === true) {
    await recordBug(state, {
      severity: "CRITICAL",
      title: "Disabled user can generate friend invite links after rejected login",
      stepsToReproduce: [
        "Attempt login as e2e-disabled@wishees.local",
        "POST /api/friends/invite with the resulting cookie jar",
        "Use body { inviteCode: \"12\", language: \"de\" }",
      ],
      actualBehavior: JSON.stringify(disabledInviteApi.json),
      evidence: disabledInviteApi.event,
    });
  }

  const viewerInviteApi = await sessions.lina.request("POST", "/api/friends/invite", {
    feature: "friends",
    action: "viewer friend invite api denied",
    body: { inviteCode: "12", language: "de" },
  });
  await mark(state, "friends.invite-api.viewer", {
    status: viewerInviteApi.response?.status,
    body: viewerInviteApi.json,
  });
  if (viewerInviteApi.json?.ok === true) {
    await recordBug(state, {
      severity: "CRITICAL",
      title: "Viewer can generate friend invite links",
      stepsToReproduce: [
        "Log in as e2e-lina@wishees.local",
        "POST /api/friends/invite",
        "Use body { inviteCode: \"12\", language: \"de\" }",
      ],
      actualBehavior: JSON.stringify(viewerInviteApi.json),
      evidence: viewerInviteApi.event,
    });
  }

  const anonymousPage = await anon.request("GET", "/invite?friend=12&lang=de", {
    feature: "friends",
    action: "anonymous opens alex invite page",
    headers: { accept: "text/html,application/xhtml+xml" },
  });
  await mark(state, "friends.invite-page.anonymous", {
    status: anonymousPage.response?.status,
    includesAlex: /E2E Alex|e2e-alex@wishees\.local/i.test(anonymousPage.text || ""),
    includesLogin: /login|anmelden|einloggen/i.test(anonymousPage.text || ""),
  });

  const disabledPage = await sessions.disabled.request("GET", "/invite?friend=12&lang=de", {
    feature: "friends",
    action: "disabled opens alex invite page",
    headers: { accept: "text/html,application/xhtml+xml" },
  });
  await mark(state, "friends.invite-page.disabled", {
    status: disabledPage.response?.status,
    includesAlex: /E2E Alex|e2e-alex@wishees\.local/i.test(disabledPage.text || ""),
    includesDisabled: /disabled|deaktiviert|account-disabled/i.test(disabledPage.text || ""),
  });

  const viewerPage = await sessions.lina.request("GET", "/invite?friend=12&lang=de", {
    feature: "friends",
    action: "viewer opens alex invite page",
    headers: { accept: "text/html,application/xhtml+xml" },
  });
  const after = await readFriendMatrixSnapshot(state, sessions, "after viewer invite probe");
  const beforeLinaConnected = new Set(before.lina?.connectedIds || []);
  const afterLinaConnected = new Set(after.lina?.connectedIds || []);
  const newLinaConnected = [...afterLinaConnected].filter((id) => !beforeLinaConnected.has(id));
  const beforeOutgoingIds = new Set((before.lina?.outgoing || []).map(requestIdOf).filter(Boolean));
  const newOutgoing = (after.lina?.outgoing || []).filter((request) => {
    const id = requestIdOf(request);
    return id && !beforeOutgoingIds.has(id);
  });
  await mark(state, "friends.invite-page.viewer", {
    status: viewerPage.response?.status,
    includesAlex: /E2E Alex|e2e-alex@wishees\.local/i.test(viewerPage.text || ""),
    newConnectedIds: newLinaConnected,
    newOutgoingRequestIds: newOutgoing.map(requestIdOf),
  });
  if (newOutgoing.length > 0 || newLinaConnected.length > 0) {
    await recordBug(state, {
      severity: "CRITICAL",
      title: "Viewer can initiate friend network changes through invite page",
      stepsToReproduce: [
        "Log in as e2e-lina@wishees.local",
        "Read /api/friends/connected and /api/friends/requests?direction=outgoing",
        "GET /invite?friend=12&lang=de",
        "Read the same friend endpoints again",
      ],
      actualBehavior: `Viewer invite page changed friend state. New connected IDs: ${JSON.stringify(
        newLinaConnected,
      )}; new outgoing request IDs: ${JSON.stringify(newOutgoing.map(requestIdOf))}.`,
      evidence: viewerPage.event,
    });
  }
  for (const request of newOutgoing) {
    const requestId = requestIdOf(request);
    if (!requestId) continue;
    await sessions.lina.request("POST", `/api/friends/requests/${encodeURIComponent(requestId)}/cancel`, {
      feature: "cleanup",
      action: `viewer invite probe cancels outgoing request ${requestId}`,
    });
  }
  for (const friendUserId of newLinaConnected) {
    await sessions.lina.request("POST", `/api/friends/connected/${encodeURIComponent(friendUserId)}/remove`, {
      feature: "cleanup",
      action: `viewer invite probe removes connected friend ${friendUserId}`,
    });
  }
  await emitTelemetry(state, startedMs, "friend invite boundary probe completed", "lina");
}

function hasConnectedId(snapshot, userKey, friendUserId) {
  return new Set(snapshot?.[userKey]?.connectedIds || []).has(Number(friendUserId));
}

async function friendMutationPermissionProbe(state, startedMs) {
  const sessions = await loginActiveSessions(state);
  sessions.disabled = new QaSession("disabled-friend-mutation", state);
  const disabledLogin = await sessions.disabled.login("disabled");
  if (disabledLogin?.ok === false && disabledLogin.code === "account-disabled") {
    await mark(state, "auth.disabled-rejected", { code: disabledLogin.code, friendMutationProbe: true });
  }
  const anonymous = new QaSession("anonymous-friend-mutation", state);
  const before = await readFriendMatrixSnapshot(state, sessions, "before friend mutation permission probe");

  if (hasConnectedId(before, "lina", 12)) {
    await sessions.lina.request("POST", "/api/friends/connected/12/remove", {
      feature: "cleanup",
      action: "friend mutation pre-clean removes existing Lina -> Alex connection",
    });
  }
  const cleanBefore = await readFriendMatrixSnapshot(state, sessions, "friend mutation permission clean baseline");

  const viewerInvitePage = await sessions.lina.request("GET", "/invite?friend=12&lang=de", {
    feature: "friends",
    action: "viewer opens alex invite page for remove-permission setup",
    headers: { accept: "text/html,application/xhtml+xml" },
  });
  const afterViewerInvite = await readFriendMatrixSnapshot(state, sessions, "after viewer invite setup for remove probe");
  const viewerConnectedToAlex = hasConnectedId(afterViewerInvite, "lina", 12);

  const viewerRemove = await sessions.lina.request("POST", "/api/friends/connected/12/remove", {
    feature: "friends",
    action: "viewer attempts to remove Lina -> Alex connection",
  });
  const afterViewerRemove = await readFriendMatrixSnapshot(state, sessions, "after viewer remove connection attempt");
  const viewerConnectionRemoved = viewerConnectedToAlex && !hasConnectedId(afterViewerRemove, "lina", 12);
  await mark(state, "friends.viewer-remove-connection-denied", {
    setupInviteStatus: viewerInvitePage.response?.status,
    viewerConnectedToAlex,
    removeStatus: viewerRemove.response?.status,
    removeBody: viewerRemove.json,
    viewerConnectionRemoved,
  });
  if (viewerConnectionRemoved) {
    await recordBug(state, {
      severity: "CRITICAL",
      title: "Viewer can remove friend connections through API",
      stepsToReproduce: [
        "Log in as e2e-lina@wishees.local",
        "Create or obtain a Lina -> Alex connection through /invite?friend=12&lang=de",
        "POST /api/friends/connected/12/remove as Lina",
        "Read Lina /api/friends/connected",
      ],
      actualBehavior: `Viewer remove response: ${JSON.stringify(
        viewerRemove.json,
      )}; connected before remove=${viewerConnectedToAlex}, after remove=${hasConnectedId(afterViewerRemove, "lina", 12)}.`,
      evidence: viewerRemove.event,
    });
  }

  const disabledRemove = await sessions.disabled.request("POST", "/api/friends/connected/12/remove", {
    feature: "friends",
    action: "disabled attempts friend connection removal",
  });
  const afterDisabledRemove = await readFriendMatrixSnapshot(state, sessions, "after disabled remove connection attempt");
  await mark(state, "friends.disabled-remove-connection-denied", {
    status: disabledRemove.response?.status,
    body: disabledRemove.json,
    graphChanged: JSON.stringify(afterDisabledRemove) !== JSON.stringify(afterViewerRemove),
  });
  if (disabledRemove.json?.ok === true) {
    await recordBug(state, {
      severity: "MAJOR",
      title: "Disabled user receives success response on friend connection removal",
      stepsToReproduce: [
        "Attempt login as e2e-disabled@wishees.local",
        "POST /api/friends/connected/12/remove with the resulting cookie jar",
        "Read the friend graph",
      ],
      actualBehavior: `Disabled remove response: ${JSON.stringify(disabledRemove.json)}; graph changed: ${
        JSON.stringify(afterDisabledRemove) !== JSON.stringify(afterViewerRemove)
      }.`,
      evidence: disabledRemove.event,
    });
  }

  const anonymousRemove = await anonymous.request("POST", "/api/friends/connected/12/remove", {
    feature: "friends",
    action: "anonymous attempts friend connection removal",
  });
  const afterAnonymousRemove = await readFriendMatrixSnapshot(state, sessions, "after anonymous remove connection attempt");
  await mark(state, "friends.unauthenticated-remove-connection-denied", {
    status: anonymousRemove.response?.status,
    body: anonymousRemove.json,
    graphChanged: JSON.stringify(afterAnonymousRemove) !== JSON.stringify(afterDisabledRemove),
  });
  if (anonymousRemove.json?.ok === true) {
    await recordBug(state, {
      severity: "MAJOR",
      title: "Anonymous user receives success response on friend connection removal",
      stepsToReproduce: [
        "Without a session, POST /api/friends/connected/12/remove",
        "Read the friend graph",
      ],
      actualBehavior: `Anonymous remove response: ${JSON.stringify(anonymousRemove.json)}; graph changed: ${
        JSON.stringify(afterAnonymousRemove) !== JSON.stringify(afterDisabledRemove)
      }.`,
      evidence: anonymousRemove.event,
    });
  }

  const invalidRequestId = `codex-${RUN_ID}-missing-request`;
  const requestActors = [
    { key: "jordan", label: "Jordan member", session: sessions.jordan },
    { key: "lina", label: "Lina viewer", session: sessions.lina },
    { key: "disabled", label: "Disabled", session: sessions.disabled },
    { key: "anonymous", label: "Anonymous", session: anonymous },
  ];
  const requestActions = ["accept", "decline", "cancel"];
  const requestResults = [];
  for (const actor of requestActors) {
    for (const action of requestActions) {
      const result = await actor.session.request(
        "POST",
        `/api/friends/requests/${encodeURIComponent(invalidRequestId)}/${action}`,
        {
          feature: "friends",
          action: `${actor.label} attempts invalid friend request ${action}`,
        },
      );
      requestResults.push({
        actor: actor.key,
        action,
        status: result.response?.status || null,
        body: result.json,
      });
      if (result.json?.ok === true) {
        await recordBug(state, {
          severity: actor.key === "jordan" ? "MINOR" : "MAJOR",
          title: "Friend request action returns success for invalid request id",
          stepsToReproduce: [
            `Use ${actor.label} session`,
            `POST /api/friends/requests/{invalidId}/${action}`,
            "Read friend request lists",
          ],
          actualBehavior: JSON.stringify(result.json),
          evidence: result.event,
        });
      }
    }
  }
  const afterInvalidRequests = await readFriendMatrixSnapshot(state, sessions, "after invalid request action matrix");
  await mark(state, "friends.request-actions-invalid-id-denied", {
    invalidRequestId,
    requestResults,
    graphChanged: JSON.stringify(afterInvalidRequests) !== JSON.stringify(afterAnonymousRemove),
  });

  if (hasConnectedId(afterInvalidRequests, "lina", 12)) {
    await sessions.lina.request("POST", "/api/friends/connected/12/remove", {
      feature: "cleanup",
      action: "friend mutation cleanup removes Lina -> Alex connection",
    });
  }
  const finalSnapshot = await readFriendMatrixSnapshot(state, sessions, "after friend mutation cleanup");
  const linaBaseline = cleanBefore.lina?.connectedIds || [];
  const linaFinal = finalSnapshot.lina?.connectedIds || [];
  await mark(state, "friends.mutation-permission-cleanup", {
    baselineLinaConnected: linaBaseline,
    finalLinaConnected: linaFinal,
    restored: JSON.stringify(linaBaseline) === JSON.stringify(linaFinal),
  });
  if (JSON.stringify(linaBaseline) !== JSON.stringify(linaFinal)) {
    await recordBug(state, {
      severity: "MAJOR",
      title: "Friend mutation permission probe cleanup did not restore Lina graph",
      stepsToReproduce: [
        "Run friend mutation permission probe",
        "Create and remove Lina -> Alex connection during the probe",
        "Read Lina connected friends after cleanup",
      ],
      actualBehavior: `Baseline Lina connected IDs: ${JSON.stringify(linaBaseline)}; final: ${JSON.stringify(linaFinal)}.`,
    });
  }

  await emitTelemetry(state, startedMs, "friend mutation permission probe completed", "lina+disabled+anonymous");
}

async function friendSnapshot(state, startedMs) {
  const sessions = await loginActiveSessions(state);
  const snapshot = await readFriendMatrixSnapshot(state, sessions, "read-only friend snapshot");
  console.log(JSON.stringify(snapshot, null, 2));
  await emitTelemetry(state, startedMs, "friend snapshot completed", "matrix");
}

async function createMarkedMayaSupport(state, sessions, marker, itemId = "wish_e2e_coffee_grinder") {
  const create = await sessions.maya.request("POST", "/api/friends/wishlist/fulfill", {
    feature: "gift-intent",
    action: `maya creates marked support outcome ${marker}`,
    form: {
      contributionPercent: 20,
      helperMessage: marker,
      ownerUserId: 12,
      itemId,
      language: "de",
    },
  });
  const ownerRead = await sessions.alex.request("GET", "/api/account/wishlist/outcomes", {
    feature: "gift-intent",
    action: `owner reads marked support outcome ${marker}`,
  });
  const outcome = activeQaOutcomes(ownerRead.json?.outcomes, itemId, marker)[0] || create.json?.outcome || null;
  return { create, ownerRead, outcome };
}

function hasRawInjectedTag(text, marker) {
  const source = String(text || "");
  const index = source.indexOf(marker);
  if (index < 0) return false;
  const window = source.slice(Math.max(0, index - 350), index + marker.length + 350);
  return /<(?:img|svg)\b[^>]*(?:onerror|onload)\s*=/i.test(window);
}

async function giftMessageSecurityProbe(state, startedMs) {
  const sessions = await loginActiveSessions(state);
  await cleanupRunArtifacts(state, sessions);

  const itemId = `${RUN_PREFIX}_message_security`;
  const ready = await saveTemporaryOutcomeWish(state, sessions, itemId, "message security");
  if (!ready) {
    await emitTelemetry(state, startedMs, "gift message security probe could not create temporary wish", "matrix");
    return;
  }

  const helperMarker = `Codex helper message security ${RUN_ID}`;
  const ownerMarker = `Codex owner reply security ${RUN_ID}`;
  const helperPayload = `<img src=x onerror=alert("codex-helper-${RUN_ID}")> ${helperMarker}`;
  const ownerReplyPayload = `<svg onload=alert("codex-owner-${RUN_ID}")>${ownerMarker}</svg>`;

  const create = await sessions.maya.request("POST", "/api/friends/wishlist/fulfill", {
    feature: "gift-intent-security",
    action: "maya submits HTML-shaped helper message",
    form: {
      contributionPercent: 20,
      helperMessage: helperPayload,
      ownerUserId: 12,
      itemId,
      language: "de",
    },
  });
  await sleep(1200);

  const ownerOutcomes = await sessions.alex.request("GET", "/api/account/wishlist/outcomes", {
    feature: "gift-intent-security",
    action: "alex reads outcomes after HTML-shaped helper message",
  });
  const ownerOutcomeMatches = qaOutcomesByMarker(ownerOutcomes.json?.outcomes, helperMarker);
  const outcome = ownerOutcomeMatches[0] || create.json?.outcome || null;
  const ownerOutcomeText = JSON.stringify(ownerOutcomeMatches.length ? ownerOutcomeMatches : ownerOutcomes.json || {});
  const rawHelperInOutcomeApi = ownerOutcomeText.includes("<img") && ownerOutcomeText.includes(helperMarker);

  const ownerNotifications = await sessions.alex.request("GET", "/api/notifications", {
    feature: "gift-intent-security",
    action: "alex reads notifications after HTML-shaped helper message",
  });
  const ownerNotificationMatches = Array.isArray(ownerNotifications.json?.notifications)
    ? ownerNotifications.json.notifications.filter((notification) => JSON.stringify(notification).includes(helperMarker))
    : [];
  const ownerNotificationText = JSON.stringify(ownerNotificationMatches);
  const rawHelperInNotificationApi = ownerNotificationText.includes("<img") && ownerNotificationText.includes(helperMarker);
  const notificationPage = await sessions.alex.request("GET", "/notifications?lang=de", {
    feature: "gift-intent-security",
    action: "alex renders notifications page after HTML-shaped helper message",
    headers: { accept: "text/html,application/xhtml+xml" },
  });
  const myWisheesPage = await sessions.alex.request("GET", "/my-wishees?lang=de", {
    feature: "gift-intent-security",
    action: "alex renders my-wishees page after HTML-shaped helper message",
    headers: { accept: "text/html,application/xhtml+xml" },
  });
  const rawHelperOnNotificationPage = hasRawInjectedTag(notificationPage.text, helperMarker);
  const rawHelperOnMyWisheesPage = hasRawInjectedTag(myWisheesPage.text, helperMarker);

  await mark(state, "gift-intent.helper-message-html-escaped-owner-outcomes", {
    itemId,
    outcomeId: outcome?.id || null,
    createStatus: create.response?.status,
    createBody: create.json,
    rawHelperInOutcomeApi,
    outcomeMatchCount: ownerOutcomeMatches.length,
  });
  await mark(state, "notifications.helper-message-html-escaped-owner-feed", {
    itemId,
    notificationMatchCount: ownerNotificationMatches.length,
    rawHelperInNotificationApi,
    rawHelperOnNotificationPage,
    rawHelperOnMyWisheesPage,
    notificationPageSnippets: snippetsForNeedles(notificationPage.text || "", [helperMarker], 450),
    myWisheesPageSnippets: snippetsForNeedles(myWisheesPage.text || "", [helperMarker], 450),
  });

  if (rawHelperOnNotificationPage || rawHelperOnMyWisheesPage) {
    await recordBug(state, {
      severity: "CRITICAL",
      title: "Owner-facing page renders raw HTML from helper support message",
      stepsToReproduce: [
        "Create a temporary Alex wish",
        "Have Maya submit support with an <img onerror> helperMessage",
        "Render Alex notifications and my-wishees pages",
      ],
      actualBehavior: `Raw injected helper markup rendered. notifications=${rawHelperOnNotificationPage}, myWishees=${rawHelperOnMyWisheesPage}.`,
      evidence: {
        support: create.event,
        notificationsPage: notificationPage.event,
        myWisheesPage: myWisheesPage.event,
      },
    });
  }

  let decision = null;
  let mayaFriendPage = null;
  let mayaShare = null;
  let mayaNotifications = null;
  let ownerOutcomesAfterDecision = null;
  if (outcome?.id) {
    decision = await sessions.alex.request("POST", "/api/account/wishlist/outcomes", {
      feature: "gift-intent-security",
      action: "alex confirms support with HTML-shaped owner reply",
      body: {
        decision: "confirm",
        outcomeId: outcome.id,
        ownerReply: ownerReplyPayload,
      },
    });
    await sleep(1200);
    ownerOutcomesAfterDecision = await sessions.alex.request("GET", "/api/account/wishlist/outcomes", {
      feature: "gift-intent-security",
      action: "alex reads outcomes after HTML-shaped owner reply",
    });
    mayaFriendPage = await sessions.maya.request("GET", "/friends/wishlist?invite=user-12&lang=de", {
      feature: "gift-intent-security",
      action: "maya renders friend wishlist after HTML-shaped owner reply",
      headers: { accept: "text/html,application/xhtml+xml" },
    });
    mayaShare = await sessions.maya.request("GET", "/api/wishlist/share?sharedUserId=12", {
      feature: "gift-intent-security",
      action: "maya reads shared wishlist API after HTML-shaped owner reply",
    });
    mayaNotifications = await sessions.maya.request("GET", "/api/notifications", {
      feature: "gift-intent-security",
      action: "maya reads notifications after HTML-shaped owner reply",
    });
  }

  const ownerOutcomeAfterText = JSON.stringify(ownerOutcomesAfterDecision?.json || {});
  const rawOwnerReplyInOwnerOutcomeApi =
    ownerOutcomeAfterText.includes("<svg") && ownerOutcomeAfterText.includes(ownerMarker);
  const mayaShareText = JSON.stringify(mayaShare?.json || {});
  const rawOwnerReplyInMayaShareApi = mayaShareText.includes("<svg") && mayaShareText.includes(ownerMarker);
  const mayaNotificationText = JSON.stringify(mayaNotifications?.json || {});
  const rawOwnerReplyInMayaNotificationApi =
    mayaNotificationText.includes("<svg") && mayaNotificationText.includes(ownerMarker);
  const rawOwnerReplyOnFriendPage = hasRawInjectedTag(mayaFriendPage?.text, ownerMarker);

  await mark(state, "gift-intent.owner-reply-html-escaped-helper-view", {
    itemId,
    outcomeId: outcome?.id || null,
    decisionStatus: decision?.response?.status || null,
    decisionBody: decision?.json || null,
    rawOwnerReplyInOwnerOutcomeApi,
    rawOwnerReplyInMayaShareApi,
    rawOwnerReplyInMayaNotificationApi,
    rawOwnerReplyOnFriendPage,
    friendPageSnippets: snippetsForNeedles(mayaFriendPage?.text || "", [ownerMarker], 450),
  });

  if (rawOwnerReplyOnFriendPage) {
    await recordBug(state, {
      severity: "CRITICAL",
      title: "Helper-facing page renders raw HTML from owner support reply",
      stepsToReproduce: [
        "Create a temporary Alex wish",
        "Have Maya submit support",
        "Have Alex confirm the support with an <svg onload> ownerReply",
        "Render Maya friend wishlist page",
      ],
      actualBehavior: "Maya-facing friend wishlist HTML contained the raw ownerReply SVG payload.",
      evidence: {
        decision: decision?.event,
        friendPage: mayaFriendPage?.event,
      },
    });
  }

  await cleanupRunArtifacts(state, sessions);
  const [cleanupWishlist, cleanupOutcomes, cleanupAlexNotifications, cleanupMayaNotifications] = await Promise.all([
    sessions.alex.request("GET", "/api/account/wishlist", {
      feature: "cleanup",
      action: "verify message security wishlist cleanup",
    }),
    sessions.alex.request("GET", "/api/account/wishlist/outcomes", {
      feature: "cleanup",
      action: "verify message security outcome cleanup",
    }),
    sessions.alex.request("GET", "/api/notifications", {
      feature: "cleanup",
      action: "verify message security alex notification cleanup",
    }),
    sessions.maya.request("GET", "/api/notifications", {
      feature: "cleanup",
      action: "verify message security maya notification cleanup",
    }),
  ]);
  const remainingItems = wishlistFromPayload(cleanupWishlist.json).items.filter((item) =>
    String(item?.id || "").startsWith(RUN_PREFIX),
  );
  const remainingOutcomes = qaOutcomesByMarker(cleanupOutcomes.json?.outcomes, helperMarker).concat(
    qaOutcomesByMarker(cleanupOutcomes.json?.outcomes, ownerMarker),
  );
  const remainingNotifications = [
    ...(cleanupAlexNotifications.json?.notifications || []),
    ...(cleanupMayaNotifications.json?.notifications || []),
  ].filter((notification) => {
    const text = JSON.stringify(notification);
    return text.includes(helperMarker) || text.includes(ownerMarker);
  });
  await mark(state, "gift-intent.message-security-cleanup", {
    remainingItemIds: remainingItems.map((item) => item.id),
    remainingOutcomeIds: remainingOutcomes.map((entry) => entry.id),
    remainingNotificationIds: remainingNotifications.map((entry) => entry.id),
  });
  if (remainingItems.length || remainingOutcomes.length || remainingNotifications.length) {
    await recordBug(state, {
      severity: "MAJOR",
      title: "Message security probe cleanup left QA artifacts behind",
      stepsToReproduce: [
        "Run gift message security probe",
        "Allow cleanupRunArtifacts to remove the temporary item, outcomes, and notifications",
        "Read Alex wishlist/outcomes and Alex/Maya notifications",
      ],
      actualBehavior: `Remaining items=${JSON.stringify(remainingItems)}, outcomes=${JSON.stringify(
        remainingOutcomes,
      )}, notifications=${JSON.stringify(remainingNotifications)}.`,
    });
  }

  await emitTelemetry(state, startedMs, "gift message security probe completed", "maya+alex");
}

async function createMayaSupportNotification(state, sessions, marker) {
  await cleanupRunArtifacts(state, sessions);
  const support = await createMarkedMayaSupport(state, sessions, marker, "wish_e2e_coffee_grinder");
  const notifications = await sessions.alex.request("GET", "/api/notifications", {
    feature: "notifications",
    action: `alex reads notification for marker ${marker}`,
  });
  const notification = Array.isArray(notifications.json?.notifications)
    ? notifications.json.notifications.find((entry) => {
        return entry.actorEmail === USERS.maya.email && String(entry.type || "").startsWith("wish.support.");
      })
    : null;
  return { ...support, notifications, notification };
}

async function notificationPermissionProbe(state, startedMs) {
  const sessions = await loginActiveSessions(state);
  sessions.disabled = new QaSession("disabled-notification", state);
  const disabledLogin = await sessions.disabled.login("disabled");
  if (disabledLogin?.ok === false && disabledLogin.code === "account-disabled") {
    await mark(state, "auth.disabled-rejected", { code: disabledLogin.code, notificationProbe: true });
  }
  const anonymous = new QaSession("anonymous-notification", state);
  await cleanupRunArtifacts(state, sessions);

  const ownerMarker = `Codex notification owner ${RUN_ID}`;
  const ownerNotification = await createMayaSupportNotification(state, sessions, ownerMarker);
  if (ownerNotification.notification?.id) {
    const notificationId = ownerNotification.notification.id;
    const read = await sessions.alex.request("POST", `/api/notifications/${encodeURIComponent(notificationId)}/read`, {
      feature: "notifications",
      action: "alex marks QA notification read",
    });
    await mark(state, "notifications.owner-mark-read", {
      status: read.response?.status,
      body: read.json,
      notificationId,
    });
    if (read.json?.ok !== true) {
      await recordBug(state, {
        severity: "MAJOR",
        title: "Owner cannot mark own support notification read",
        stepsToReproduce: [
          "Create a Maya support outcome for Alex",
          "GET /api/notifications as Alex",
          "POST /api/notifications/{id}/read as Alex",
        ],
        actualBehavior: JSON.stringify(read.json ?? read.error),
        evidence: read.event,
      });
    }
    const del = await sessions.alex.request("DELETE", `/api/notifications/${encodeURIComponent(notificationId)}`, {
      feature: "notifications",
      action: "alex deletes QA notification",
    });
    await mark(state, "notifications.owner-delete", {
      status: del.response?.status,
      body: del.json,
      notificationId,
    });
    if (del.json?.ok !== true) {
      await recordBug(state, {
        severity: "MAJOR",
        title: "Owner cannot delete own support notification",
        stepsToReproduce: [
          "Create a Maya support outcome for Alex",
          "GET /api/notifications as Alex",
          "DELETE /api/notifications/{id} as Alex",
        ],
        actualBehavior: JSON.stringify(del.json ?? del.error),
        evidence: del.event,
      });
    }
  }
  await cleanupRunArtifacts(state, sessions);

  const readActors = [
    {
      key: "jordan",
      label: "Jordan member non-owner",
      session: sessions.jordan,
      point: "boundary.non-owner-notification-read-denied",
      title: "Non-owner member can mark another user's notification read",
      severity: "CRITICAL",
    },
    {
      key: "lina",
      label: "Lina viewer",
      session: sessions.lina,
      point: "boundary.viewer-notification-read-denied",
      title: "Viewer can mark another user's notification read",
      severity: "CRITICAL",
    },
    {
      key: "disabled",
      label: "Disabled account",
      session: sessions.disabled,
      point: "boundary.disabled-notification-read-denied",
      title: "Disabled user can mark notifications read after rejected login",
      severity: "CRITICAL",
    },
    {
      key: "anonymous",
      label: "Anonymous user",
      session: anonymous,
      point: "boundary.unauthenticated-notification-read-denied",
      title: "Anonymous user can mark notifications read",
      severity: "CRITICAL",
    },
  ];

  for (const actor of readActors) {
    const marker = `Codex notification read permission ${RUN_ID} ${actor.key}`;
    const created = await createMayaSupportNotification(state, sessions, marker);
    const notificationId = created.notification?.id;
    if (!notificationId) continue;
    const read = await actor.session.request("POST", `/api/notifications/${encodeURIComponent(notificationId)}/read`, {
      feature: "boundary",
      action: `${actor.label} attempts notification read`,
    });
    const verify = await sessions.alex.request("GET", "/api/notifications", {
      feature: "boundary",
      action: `alex verifies notification after ${actor.key} read attempt`,
    });
    const verifiedNotification = Array.isArray(verify.json?.notifications)
      ? verify.json.notifications.find((entry) => entry.id === notificationId)
      : null;
    const changedOwnerReadState = Boolean(verifiedNotification?.readAt);
    await mark(state, actor.point, {
      status: read.response?.status,
      body: read.json,
      notificationId,
      changedOwnerReadState,
    });
    if (changedOwnerReadState) {
      await recordBug(state, {
        severity: actor.severity,
        title: actor.title,
        stepsToReproduce: [
          "Create a Maya support notification for Alex",
          `Use ${actor.label} session`,
          "POST /api/notifications/{id}/read with Alex's notification id",
        ],
        actualBehavior: `Read response: ${JSON.stringify(read.json)}; Alex notification readAt: ${verifiedNotification?.readAt}.`,
        evidence: read.event,
      });
    } else if (read.json?.ok === true) {
      await recordBug(state, {
        severity: "MINOR",
        title: "Notification read endpoint returns ok for non-owner without changing owner notification",
        stepsToReproduce: [
          "Create a Maya support notification for Alex",
          `Use ${actor.label} session`,
          "POST /api/notifications/{id}/read with Alex's notification id",
          "GET /api/notifications as Alex",
        ],
        actualBehavior: `Read response was ok:true, but Alex notification readAt remained ${JSON.stringify(
          verifiedNotification?.readAt || null,
        )}.`,
        evidence: read.event,
      });
    }
    await cleanupRunArtifacts(state, sessions);
  }

  const deleteActors = [
    {
      key: "jordan",
      label: "Jordan member non-owner",
      session: sessions.jordan,
      point: "boundary.non-owner-notification-delete-denied",
      title: "Non-owner member can delete another user's notification",
      severity: "CRITICAL",
    },
    {
      key: "lina",
      label: "Lina viewer",
      session: sessions.lina,
      point: "boundary.viewer-notification-delete-denied",
      title: "Viewer can delete another user's notification",
      severity: "CRITICAL",
    },
    {
      key: "disabled",
      label: "Disabled account",
      session: sessions.disabled,
      point: "boundary.disabled-notification-delete-denied",
      title: "Disabled user can delete notifications after rejected login",
      severity: "CRITICAL",
    },
    {
      key: "anonymous",
      label: "Anonymous user",
      session: anonymous,
      point: "boundary.unauthenticated-notification-delete-denied",
      title: "Anonymous user can delete notifications",
      severity: "CRITICAL",
    },
  ];

  for (const actor of deleteActors) {
    const marker = `Codex notification delete permission ${RUN_ID} ${actor.key}`;
    const created = await createMayaSupportNotification(state, sessions, marker);
    const notificationId = created.notification?.id;
    if (!notificationId) continue;
    const del = await actor.session.request("DELETE", `/api/notifications/${encodeURIComponent(notificationId)}`, {
      feature: "boundary",
      action: `${actor.label} attempts notification delete`,
    });
    const verify = await sessions.alex.request("GET", "/api/notifications", {
      feature: "boundary",
      action: `alex verifies notification after ${actor.key} delete attempt`,
    });
    const stillPresent = Array.isArray(verify.json?.notifications)
      ? verify.json.notifications.some((entry) => entry.id === notificationId)
      : false;
    await mark(state, actor.point, {
      status: del.response?.status,
      body: del.json,
      notificationId,
      stillPresent,
    });
    if (!stillPresent) {
      await recordBug(state, {
        severity: actor.severity,
        title: actor.title,
        stepsToReproduce: [
          "Create a Maya support notification for Alex",
          `Use ${actor.label} session`,
          "DELETE /api/notifications/{id} with Alex's notification id",
          "GET /api/notifications as Alex",
        ],
        actualBehavior: `Delete response: ${JSON.stringify(del.json)}; still present for Alex: ${stillPresent}.`,
        evidence: del.event,
      });
    } else if (del.json?.ok === true) {
      await recordBug(state, {
        severity: "MINOR",
        title: "Notification delete endpoint returns ok for non-owner without deleting owner notification",
        stepsToReproduce: [
          "Create a Maya support notification for Alex",
          `Use ${actor.label} session`,
          "DELETE /api/notifications/{id} with Alex's notification id",
          "GET /api/notifications as Alex",
        ],
        actualBehavior: `Delete response was ok:true, but the notification was still present for Alex.`,
        evidence: del.event,
      });
    }
    await cleanupRunArtifacts(state, sessions);
  }

  await cleanupRunArtifacts(state, sessions);
  await emitTelemetry(state, startedMs, "notification permission probe completed", "matrix");
}

async function helperReplyNotificationProbe(state, startedMs) {
  const sessions = await loginActiveSessions(state);
  await cleanupRunArtifacts(state, sessions);

  const cases = [
    {
      decision: "confirm",
      point: "notifications.helper-reply-after-owner-confirm",
      suffix: "helper reply confirm",
    },
    {
      decision: "decline",
      point: "notifications.helper-reply-after-owner-decline",
      suffix: "helper reply decline",
    },
  ];

  for (const testCase of cases) {
    const itemId = `${RUN_PREFIX}_${testCase.suffix.replaceAll(" ", "_")}`;
    const ready = await saveTemporaryOutcomeWish(state, sessions, itemId, testCase.suffix);
    if (!ready) continue;
    const itemTitle = `Codex ${testCase.suffix} ${RUN_ID}`;
    const marker = `Codex ${testCase.suffix} support ${RUN_ID}`;
    const { outcome } = await createMarkedMayaSupport(state, sessions, marker, itemId);
    if (!outcome?.id) {
      await recordBug(state, {
        severity: "MAJOR",
        title: "Could not create support outcome for helper reply notification probe",
        stepsToReproduce: ["Run helper reply notification probe", `Create Maya support for ${itemId}`],
        actualBehavior: "Owner outcome read did not contain the marked support outcome.",
      });
      await cleanupRunArtifacts(state, sessions);
      continue;
    }
    const decision = await sessions.alex.request("POST", "/api/account/wishlist/outcomes", {
      feature: "notifications",
      action: `alex ${testCase.decision}s support outcome for helper reply notification probe`,
      body: {
        decision: testCase.decision,
        outcomeId: outcome.id,
        ownerReply: `${marker} owner ${testCase.decision}`,
      },
    });
    await sleep(1500);
    const feed = await sessions.maya.request("GET", "/api/notifications", {
      feature: "notifications",
      action: `maya reads notifications after owner ${testCase.decision}`,
    });
    const notifications = Array.isArray(feed.json?.notifications) ? feed.json.notifications : [];
    const matches = notifications.filter((notification) => {
      const text = JSON.stringify(notification);
      return text.includes(itemTitle) || text.includes(marker);
    });
    await mark(state, testCase.point, {
      itemId,
      itemTitle,
      outcomeId: outcome.id,
      decisionStatus: decision.response?.status,
      decisionBody: decision.json,
      notificationCount: notifications.length,
      matchedNotificationCount: matches.length,
      matches,
    });
    if (decision.json?.ok === true && matches.length === 0) {
      await recordBug(state, {
        severity: "MAJOR",
        title: "Helper does not receive a notification when the owner replies to support",
        stepsToReproduce: [
          "Create a temporary Alex wish",
          "Have Maya offer support for the wish",
          `Have Alex POST /api/account/wishlist/outcomes with decision=${testCase.decision} and an ownerReply`,
          "GET /api/notifications as Maya",
        ],
        actualBehavior: `Maya notification feed contained no entry for ${itemTitle} after owner ${testCase.decision}. Feed: ${JSON.stringify(
          feed.json,
        )}.`,
        evidence: {
          decision: decision.event,
          feed: feed.event,
        },
      });
    }
    for (const notification of matches) {
      if (!notification.id) continue;
      await sessions.maya.request("DELETE", `/api/notifications/${encodeURIComponent(notification.id)}`, {
        feature: "cleanup",
        action: `delete Maya helper reply notification ${notification.id}`,
      });
    }
    await cleanupRunArtifacts(state, sessions);
  }

  await cleanupRunArtifacts(state, sessions);
  await emitTelemetry(state, startedMs, "helper reply notification probe completed", "maya");
}

async function outcomePermissionProbe(state, startedMs) {
  const sessions = await loginActiveSessions(state);
  sessions.disabled = new QaSession("disabled-outcome", state);
  const disabledLogin = await sessions.disabled.login("disabled");
  if (disabledLogin?.ok === false && disabledLogin.code === "account-disabled") {
    await mark(state, "auth.disabled-rejected", { code: disabledLogin.code, outcomeProbe: true });
  }
  const anonymous = new QaSession("anonymous-outcome", state);
  await cleanupRunArtifacts(state, sessions);

  const decisionActors = [
    {
      key: "jordan",
      label: "Jordan member non-owner",
      session: sessions.jordan,
      point: "boundary.non-owner-outcome-decision-denied",
      title: "Non-owner member can decide another user's gift support outcome",
      severity: "CRITICAL",
    },
    {
      key: "lina",
      label: "Lina viewer",
      session: sessions.lina,
      point: "boundary.viewer-outcome-decision-denied",
      title: "Viewer can decide gift support outcomes",
      severity: "CRITICAL",
    },
    {
      key: "disabled",
      label: "Disabled account",
      session: sessions.disabled,
      point: "boundary.disabled-outcome-decision-denied",
      title: "Disabled user can decide gift support outcomes after rejected login",
      severity: "CRITICAL",
    },
    {
      key: "anonymous",
      label: "Anonymous user",
      session: anonymous,
      point: "boundary.unauthenticated-outcome-decision-denied",
      title: "Anonymous user can decide gift support outcomes",
      severity: "CRITICAL",
    },
  ];

  for (const actor of decisionActors) {
    const marker = `Codex outcome decision permission ${RUN_ID} ${actor.key}`;
    const { outcome } = await createMarkedMayaSupport(state, sessions, marker);
    if (!outcome?.id) {
      await recordBug(state, {
        severity: "MAJOR",
        title: "Could not create marked support outcome for permission probe",
        stepsToReproduce: ["Run outcome permission probe", `Create marker ${marker}`],
        actualBehavior: "Owner outcome read did not contain the marked support outcome.",
      });
      continue;
    }
    const decision = await actor.session.request("POST", "/api/account/wishlist/outcomes", {
      feature: "boundary",
      action: `${actor.label} attempts owner outcome decline`,
      body: {
        decision: "decline",
        outcomeId: outcome.id,
        ownerReply: `Codex forbidden decision probe ${actor.key}`,
      },
    });
    await mark(state, actor.point, {
      status: decision.response?.status,
      body: decision.json,
      outcomeId: outcome.id,
    });
    if (decision.json?.ok === true) {
      await recordBug(state, {
        severity: actor.severity,
        title: actor.title,
        stepsToReproduce: [
          "Log in as Maya and create a support outcome for Alex's wish",
          `Use ${actor.label} session`,
          "POST /api/account/wishlist/outcomes with decision=decline and the Maya outcomeId",
        ],
        actualBehavior: JSON.stringify(decision.json),
        evidence: decision.event,
      });
    }
    await cleanupRunArtifacts(state, sessions);
  }

  const cancelActors = [
    {
      key: "jordan",
      label: "Jordan member non-helper",
      session: sessions.jordan,
      point: "boundary.non-helper-outcome-cancel-denied",
      title: "Non-helper member can cancel another user's gift support outcome",
      severity: "CRITICAL",
    },
    {
      key: "lina",
      label: "Lina viewer",
      session: sessions.lina,
      point: "boundary.viewer-outcome-cancel-denied",
      title: "Viewer can cancel gift support outcomes",
      severity: "CRITICAL",
    },
    {
      key: "disabled",
      label: "Disabled account",
      session: sessions.disabled,
      point: "boundary.disabled-outcome-cancel-denied",
      title: "Disabled user can cancel gift support outcomes after rejected login",
      severity: "CRITICAL",
    },
    {
      key: "anonymous",
      label: "Anonymous user",
      session: anonymous,
      point: "boundary.unauthenticated-outcome-cancel-denied",
      title: "Anonymous user can cancel gift support outcomes",
      severity: "CRITICAL",
    },
  ];

  for (const actor of cancelActors) {
    const itemId = "wish_e2e_coffee_grinder";
    const marker = `Codex outcome cancel permission ${RUN_ID} ${actor.key}`;
    const { outcome } = await createMarkedMayaSupport(state, sessions, marker, itemId);
    if (!outcome?.id) continue;
    const cancel = await actor.session.request("POST", "/api/friends/wishlist/outcomes/cancel", {
      feature: "boundary",
      action: `${actor.label} attempts helper outcome cancel`,
      form: {
        ownerUserId: 12,
        itemId,
        language: "de",
      },
    });
    const ownerRead = await sessions.alex.request("GET", "/api/account/wishlist/outcomes", {
      feature: "boundary",
      action: `owner verifies ${actor.key} cancel permission attempt`,
    });
    const remaining = activeQaOutcomes(ownerRead.json?.outcomes, itemId, marker);
    await mark(state, actor.point, {
      status: cancel.response?.status,
      body: cancel.json,
      outcomeId: outcome.id,
      remainingActiveMarkedOutcomes: remaining.length,
    });
    if (cancel.json?.ok === true || remaining.length === 0) {
      await recordBug(state, {
        severity: actor.severity,
        title: actor.title,
        stepsToReproduce: [
          "Log in as Maya and create a support outcome for Alex's wish",
          `Use ${actor.label} session`,
          "POST /api/friends/wishlist/outcomes/cancel with ownerUserId=12 and the same itemId",
          "Read Alex owner outcomes",
        ],
        actualBehavior: `Cancel response: ${JSON.stringify(cancel.json)}; active marked outcomes remaining: ${remaining.length}.`,
        evidence: cancel.event,
      });
    }
    await cleanupRunArtifacts(state, sessions);
  }

  const helperMarker = `Codex outcome helper cancel ${RUN_ID}`;
  const itemId = "wish_e2e_coffee_grinder";
  const { outcome: helperOutcome } = await createMarkedMayaSupport(state, sessions, helperMarker, itemId);
  if (helperOutcome?.id) {
    const helperCancel = await sessions.maya.request("POST", "/api/friends/wishlist/outcomes/cancel", {
      feature: "gift-intent",
      action: "maya cancels own support outcome",
      form: {
        ownerUserId: 12,
        itemId,
        language: "de",
      },
    });
    const ownerRead = await sessions.alex.request("GET", "/api/account/wishlist/outcomes", {
      feature: "gift-intent",
      action: "owner verifies maya own cancel",
    });
    const remaining = activeQaOutcomes(ownerRead.json?.outcomes, itemId, helperMarker);
    await mark(state, "gift-intent.helper-cancel-own-outcome", {
      status: helperCancel.response?.status,
      body: helperCancel.json,
      remainingActiveMarkedOutcomes: remaining.length,
    });
    if (helperCancel.json?.ok !== true || remaining.length !== 0) {
      await recordBug(state, {
        severity: "MAJOR",
        title: "Helper cannot cancel their own active support outcome",
        stepsToReproduce: [
          "Log in as Maya and create a support outcome for Alex's wish",
          "POST /api/friends/wishlist/outcomes/cancel as Maya for the same ownerUserId and itemId",
          "Read Alex owner outcomes",
        ],
        actualBehavior: `Cancel response: ${JSON.stringify(helperCancel.json)}; active marked outcomes remaining: ${remaining.length}.`,
        evidence: helperCancel.event,
      });
    }
  }
  await cleanupRunArtifacts(state, sessions);
  await emitTelemetry(state, startedMs, "outcome permission probe completed", "matrix");
}

function sharedItemIds(payload) {
  return new Set((payload?.wishlist?.items || payload?.items || []).map((item) => String(item.id || "")));
}

function decodeHtmlAttribute(value) {
  return String(value || "")
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#x27;", "'")
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function extractAnchors(html) {
  const anchors = [];
  const pattern = /<a\b([^>]*?)>/gi;
  let match;
  while ((match = pattern.exec(html || ""))) {
    const attrs = match[1] || "";
    const href = attrs.match(/\bhref=["']([^"']+)["']/i)?.[1] || "";
    if (!href) continue;
    anchors.push({
      href: decodeHtmlAttribute(href),
      rel: decodeHtmlAttribute(attrs.match(/\brel=["']([^"']+)["']/i)?.[1] || ""),
      target: decodeHtmlAttribute(attrs.match(/\btarget=["']([^"']+)["']/i)?.[1] || ""),
      raw: match[0],
    });
  }
  return anchors;
}

function externalAffiliateAnchors(html) {
  return extractAnchors(html).filter((anchor) => /https?:\/\/[^/]*\b(?:amazon|ebay)\./i.test(anchor.href));
}

async function visibilityScopeProbe(state, startedMs) {
  const sessions = await loginActiveSessions(state);
  sessions.disabled = new QaSession("disabled-visibility", state);
  const disabledLogin = await sessions.disabled.login("disabled");
  if (disabledLogin?.ok === false && disabledLogin.code === "account-disabled") {
    await mark(state, "auth.disabled-rejected", { code: disabledLogin.code, visibilityProbe: true });
  }
  const anonymous = new QaSession("anonymous-visibility", state);
  await cleanupRunArtifacts(state, sessions);

  const beforeResult = await sessions.alex.request("GET", "/api/account/wishlist", {
    feature: "wishlist-visibility",
    action: "owner wishlist read before visibility probe",
  });
  if (!beforeResult.json?.ok) {
    await recordBug(state, {
      severity: "MAJOR",
      title: "Could not read owner wishlist before visibility probe",
      stepsToReproduce: ["Log in as Alex", "GET /api/account/wishlist"],
      actualBehavior: JSON.stringify(beforeResult.json ?? beforeResult.error),
      evidence: beforeResult.event,
    });
    return;
  }
  const before = wishlistFromPayload(beforeResult.json);
  const cleanBase = withoutRunItems(before.items);
  const privateId = `${RUN_PREFIX}_visibility_private`;
  const selectedId = `${RUN_PREFIX}_visibility_selected`;
  const publicId = `${RUN_PREFIX}_visibility_public`;
  const privateItem = {
    ...makeWish(privateId, "visibility private"),
    title: `Codex visibility private ${RUN_ID}`,
    visibility: "private",
  };
  const selectedItem = {
    ...makeWish(selectedId, "visibility selected"),
    title: `Codex visibility selected ${RUN_ID}`,
    visibility: "selected-people",
    allowedViewers: [USERS.maya.email],
  };
  const publicItem = {
    ...makeWish(publicId, "visibility public"),
    title: `Codex visibility public ${RUN_ID}`,
    visibility: "public",
  };
  const save = await sessions.alex.request("PUT", "/api/account/wishlist", {
    feature: "wishlist-visibility",
    action: "owner saves visibility matrix wishes",
    body: {
      currency: before.currency,
      visibility: before.visibility,
      items: [...cleanBase, privateItem, selectedItem, publicItem],
    },
  });
  if (!save.json?.ok) {
    await recordBug(state, {
      severity: "MAJOR",
      title: "Owner could not save visibility matrix wishes",
      stepsToReproduce: ["Log in as Alex", "PUT /api/account/wishlist with private, selected-people, and public items"],
      actualBehavior: JSON.stringify(save.json ?? save.error),
      evidence: save.event,
    });
    return;
  }

  const shareReads = {
    maya: await sessions.maya.request("GET", "/api/wishlist/share?sharedUserId=12", {
      feature: "wishlist-visibility",
      action: "maya reads visibility matrix shared wishlist",
    }),
    jordan: await sessions.jordan.request("GET", "/api/wishlist/share?sharedUserId=12", {
      feature: "wishlist-visibility",
      action: "jordan reads visibility matrix shared wishlist",
    }),
    lina: await sessions.lina.request("GET", "/api/wishlist/share?sharedUserId=12", {
      feature: "wishlist-visibility",
      action: "lina reads visibility matrix shared wishlist",
    }),
    disabled: await sessions.disabled.request("GET", "/api/wishlist/share?sharedUserId=12", {
      feature: "wishlist-visibility",
      action: "disabled reads visibility matrix shared wishlist",
    }),
    anonymous: await anonymous.request("GET", "/api/wishlist/share?sharedUserId=12", {
      feature: "wishlist-visibility",
      action: "anonymous reads visibility matrix shared wishlist",
    }),
  };
  const idSets = Object.fromEntries(Object.entries(shareReads).map(([key, result]) => [key, sharedItemIds(result.json)]));
  const privateLeaks = Object.entries(idSets)
    .filter(([key, ids]) => key !== "alex" && ids.has(privateId))
    .map(([key]) => key);
  const selectedAllowedVisible = idSets.maya?.has(selectedId) === true;
  const selectedLeaks = Object.entries(idSets)
    .filter(([key, ids]) => key !== "maya" && ids.has(selectedId))
    .map(([key]) => key);
  const publicVisibleAnonymous = idSets.anonymous?.has(publicId) === true;

  await mark(state, "wishlist.visibility.private-hidden-from-share-api", {
    privateId,
    leakedTo: privateLeaks,
  });
  if (privateLeaks.length > 0) {
    await recordBug(state, {
      severity: "CRITICAL",
      title: "Private wishlist item is visible through shared wishlist API",
      stepsToReproduce: [
        "Log in as Alex",
        "Save a wishlist item with visibility=private",
        "GET /api/wishlist/share?sharedUserId=12 as non-owner sessions",
      ],
      actualBehavior: `Private item ${privateId} appeared for: ${privateLeaks.join(", ")}.`,
      evidence: shareReads[privateLeaks[0]]?.event,
    });
  }

  await mark(state, "wishlist.visibility.selected-people-allowed-visible", {
    selectedId,
    allowedUser: USERS.maya.email,
    visibleToMaya: selectedAllowedVisible,
  });
  if (!selectedAllowedVisible) {
    await recordBug(state, {
      severity: "MAJOR",
      title: "Selected-people wishlist item is hidden from an allowed viewer",
      stepsToReproduce: [
        "Log in as Alex",
        "Save a wishlist item with visibility=selected-people and allowedViewers containing e2e-maya@wishees.local",
        "GET /api/wishlist/share?sharedUserId=12 as Maya",
      ],
      actualBehavior: `Maya shared API did not include selected item ${selectedId}.`,
      evidence: shareReads.maya.event,
    });
  }

  await mark(state, "wishlist.visibility.selected-people-unlisted-hidden", {
    selectedId,
    leakedTo: selectedLeaks,
  });
  if (selectedLeaks.length > 0) {
    await recordBug(state, {
      severity: "CRITICAL",
      title: "Selected-people wishlist item is visible to unlisted users",
      stepsToReproduce: [
        "Log in as Alex",
        "Save a wishlist item with visibility=selected-people and allowedViewers containing only e2e-maya@wishees.local",
        "GET /api/wishlist/share?sharedUserId=12 as unlisted users",
      ],
      actualBehavior: `Selected item ${selectedId} appeared for: ${selectedLeaks.join(", ")}.`,
      evidence: shareReads[selectedLeaks[0]]?.event,
    });
  }

  const privatePage = await sessions.maya.request("GET", `/wish?sharedWishId=${encodeURIComponent(privateId)}&lang=de`, {
    feature: "wishlist-visibility",
    action: "maya opens private direct shared wish page",
    headers: { accept: "text/html,application/xhtml+xml" },
  });
  const privateTitleRendered = privatePage.text.includes(privateItem.title);
  await mark(state, "wishlist.visibility.private-hidden-from-direct-page", {
    status: privatePage.response?.status,
    privateTitleRendered,
  });
  if (privateTitleRendered) {
    await recordBug(state, {
      severity: "CRITICAL",
      title: "Private wishlist item renders through direct shared wish page",
      stepsToReproduce: [
        "Log in as Alex",
        "Save a wishlist item with visibility=private",
        `GET /wish?sharedWishId=${privateId}&lang=de as Maya`,
      ],
      actualBehavior: "The private wish title rendered in the HTML response.",
      evidence: privatePage.event,
    });
  }

  await mark(state, "wishlist.visibility.public-visible-anonymous", {
    publicId,
    visibleToAnonymous: publicVisibleAnonymous,
    anonymousStatus: shareReads.anonymous.response?.status,
  });

  const latest = await sessions.alex.request("GET", "/api/account/wishlist", {
    feature: "cleanup",
    action: "owner wishlist read before visibility cleanup",
  });
  const latestWishlist = wishlistFromPayload(latest.json);
  const cleanup = await sessions.alex.request("PUT", "/api/account/wishlist", {
    feature: "cleanup",
    action: "cleanup visibility matrix wishes",
    body: {
      currency: latestWishlist.currency,
      visibility: latestWishlist.visibility,
      items: withoutRunItems(latestWishlist.items),
    },
  });
  if (cleanup.json?.ok) {
    await mark(state, "wishlist.visibility.cleanup", { cleaned: true });
    await mark(state, "cleanup.run-prefix-removed", { prefix: RUN_PREFIX });
  }
  await emitTelemetry(state, startedMs, "wishlist visibility scope probe completed", "matrix");
}

async function affiliateLinkProbe(state, startedMs) {
  const sessions = await loginActiveSessions(state);
  const page = await sessions.maya.request("GET", "/friends/wishlist?invite=user-12&lang=de", {
    feature: "affiliate",
    action: "render affiliate friend wishlist page",
    headers: { accept: "text/html,application/xhtml+xml" },
  });
  const anchors = externalAffiliateAnchors(page.text || "");
  const amazonLinks = anchors.filter((anchor) => /\/\/(?:www\.)?amazon\./i.test(anchor.href));
  const ebayLinks = anchors.filter((anchor) => /\/\/(?:www\.)?ebay\./i.test(anchor.href));
  const amazonWithTag = amazonLinks.filter((anchor) => /[?&]tag=wishees-[^&#]+/i.test(anchor.href));
  const ebayWithCampaign = ebayLinks.filter((anchor) => /[?&](campid|customid|toolid|mkevt)=/i.test(anchor.href));
  const unsafeBlankLinks = anchors.filter((anchor) => {
    if (anchor.target !== "_blank") return false;
    const relTokens = new Set(anchor.rel.toLowerCase().split(/\s+/).filter(Boolean));
    return !relTokens.has("noopener") && !relTokens.has("noreferrer");
  });

  await mark(state, "affiliate.external-links-rendered", {
    count: anchors.length,
    hrefs: anchors.map((anchor) => anchor.href).slice(0, 10),
  });
  await mark(state, "affiliate.amazon-link-has-tag", {
    amazonLinkCount: amazonLinks.length,
    amazonWithTagCount: amazonWithTag.length,
    hrefs: amazonLinks.map((anchor) => anchor.href).slice(0, 10),
  });
  if (amazonLinks.length === 0 || amazonWithTag.length !== amazonLinks.length) {
    await recordBug(state, {
      severity: "MAJOR",
      title: "Amazon affiliate links are missing expected tracking tags",
      stepsToReproduce: [
        "Log in as Maya",
        "GET /friends/wishlist?invite=user-12&lang=de",
        "Inspect outbound Amazon anchors",
      ],
      actualBehavior: `Amazon links: ${JSON.stringify(amazonLinks.map((anchor) => anchor.href))}`,
      evidence: page.event,
    });
  }

  await mark(state, "affiliate.ebay-link-has-campaign", {
    ebayLinkCount: ebayLinks.length,
    ebayWithCampaignCount: ebayWithCampaign.length,
    hrefs: ebayLinks.map((anchor) => anchor.href).slice(0, 10),
  });
  if (ebayLinks.length > 0 && ebayWithCampaign.length !== ebayLinks.length) {
    await recordBug(state, {
      severity: "MAJOR",
      title: "eBay affiliate links are missing expected campaign parameters",
      stepsToReproduce: [
        "Log in as Maya",
        "GET /friends/wishlist?invite=user-12&lang=de",
        "Inspect outbound eBay anchors",
      ],
      actualBehavior: `eBay links: ${JSON.stringify(ebayLinks.map((anchor) => anchor.href))}`,
      evidence: page.event,
    });
  }

  await mark(state, "affiliate.external-links-safe-rel", {
    externalLinkCount: anchors.length,
    unsafeBlankLinkCount: unsafeBlankLinks.length,
    unsafeHrefs: unsafeBlankLinks.map((anchor) => anchor.href).slice(0, 10),
  });
  if (unsafeBlankLinks.length > 0) {
    await recordBug(state, {
      severity: "MINOR",
      title: "External affiliate links opened in a new tab without noopener or noreferrer",
      stepsToReproduce: [
        "Log in as Maya",
        "GET /friends/wishlist?invite=user-12&lang=de",
        "Inspect external Amazon/eBay anchor rel attributes",
      ],
      actualBehavior: `Unsafe target=_blank links: ${JSON.stringify(unsafeBlankLinks.map((anchor) => anchor.href))}`,
      evidence: page.event,
    });
  }
  await emitTelemetry(state, startedMs, "affiliate link probe completed", "maya");
}

async function affiliateEbayProbe(state, startedMs) {
  const sessions = await loginActiveSessions(state);
  await cleanupRunArtifacts(state, sessions);
  const beforeResult = await sessions.alex.request("GET", "/api/account/wishlist", {
    feature: "affiliate",
    action: "owner wishlist read before temporary eBay affiliate probe",
  });
  if (!beforeResult.json?.ok) {
    await recordBug(state, {
      severity: "MAJOR",
      title: "Could not read owner wishlist before eBay affiliate probe",
      stepsToReproduce: ["Log in as Alex", "GET /api/account/wishlist"],
      actualBehavior: JSON.stringify(beforeResult.json ?? beforeResult.error),
      evidence: beforeResult.event,
    });
    return;
  }
  const before = wishlistFromPayload(beforeResult.json);
  const itemId = `${RUN_PREFIX}_affiliate_ebay`;
  const item = {
    ...makeWish(itemId, "affiliate ebay"),
    title: `Codex affiliate eBay ${RUN_ID}`,
    url: "https://www.ebay.com/sch/i.html?_nkw=portable+espresso+maker",
    visibility: "friends",
  };
  const save = await sessions.alex.request("PUT", "/api/account/wishlist", {
    feature: "affiliate",
    action: "owner saves temporary eBay affiliate wish",
    body: {
      currency: before.currency,
      visibility: before.visibility,
      items: [...withoutRunItems(before.items), item],
    },
  });
  if (!save.json?.ok) {
    await recordBug(state, {
      severity: "MAJOR",
      title: "Owner could not save temporary eBay affiliate wish",
      stepsToReproduce: ["Log in as Alex", "PUT /api/account/wishlist with a temporary eBay wish"],
      actualBehavior: JSON.stringify(save.json ?? save.error),
      evidence: save.event,
    });
    return;
  }

  const page = await sessions.maya.request("GET", "/friends/wishlist?invite=user-12&lang=de", {
    feature: "affiliate",
    action: "render friend wishlist with temporary eBay affiliate wish",
    headers: { accept: "text/html,application/xhtml+xml" },
  });
  const anchors = externalAffiliateAnchors(page.text || "");
  const ebayLinks = anchors.filter((anchor) => /https?:\/\/[^/]*\bebay\./i.test(anchor.href));
  const ebayWithCampaign = ebayLinks.filter((anchor) => /[?&](campid|customid|toolid|mkevt)=/i.test(anchor.href));
  const unsafeBlankLinks = ebayLinks.filter((anchor) => {
    if (anchor.target !== "_blank") return false;
    const relTokens = new Set(anchor.rel.toLowerCase().split(/\s+/).filter(Boolean));
    return !relTokens.has("noopener") && !relTokens.has("noreferrer");
  });
  const titleRendered = page.text.includes(item.title);

  await mark(state, "affiliate.ebay-temporary-link-rendered", {
    itemId,
    titleRendered,
    ebayLinkCount: ebayLinks.length,
    hrefs: ebayLinks.map((anchor) => anchor.href).slice(0, 10),
  });
  if (!titleRendered || ebayLinks.length === 0) {
    await recordBug(state, {
      severity: "MAJOR",
      title: "Temporary eBay wishlist item does not render as an outbound eBay link",
      stepsToReproduce: [
        "Log in as Alex",
        "Save a friends-visible wish with an eBay URL",
        "GET /friends/wishlist?invite=user-12&lang=de as Maya",
        "Inspect rendered eBay anchors",
      ],
      actualBehavior: `titleRendered=${titleRendered}; eBay anchors=${JSON.stringify(ebayLinks.map((anchor) => anchor.href))}.`,
      evidence: page.event,
    });
  }

  await mark(state, "affiliate.ebay-temporary-link-has-campaign", {
    ebayLinkCount: ebayLinks.length,
    ebayWithCampaignCount: ebayWithCampaign.length,
    hrefs: ebayLinks.map((anchor) => anchor.href).slice(0, 10),
  });
  if (ebayLinks.length > 0 && ebayWithCampaign.length !== ebayLinks.length) {
    await recordBug(state, {
      severity: "MAJOR",
      title: "eBay affiliate links are missing expected campaign parameters",
      stepsToReproduce: [
        "Log in as Alex",
        "Save a friends-visible wish with an eBay URL",
        "GET /friends/wishlist?invite=user-12&lang=de as Maya",
        "Inspect outbound eBay anchors for campid/customid/toolid/mkevt",
      ],
      actualBehavior: `eBay links: ${JSON.stringify(ebayLinks.map((anchor) => anchor.href))}`,
      evidence: page.event,
    });
  }

  await mark(state, "affiliate.ebay-temporary-link-safe-rel", {
    ebayLinkCount: ebayLinks.length,
    unsafeBlankLinkCount: unsafeBlankLinks.length,
    unsafeHrefs: unsafeBlankLinks.map((anchor) => anchor.href).slice(0, 10),
  });
  if (unsafeBlankLinks.length > 0) {
    await recordBug(state, {
      severity: "MINOR",
      title: "eBay affiliate links opened in a new tab without noopener or noreferrer",
      stepsToReproduce: [
        "Log in as Alex",
        "Save a friends-visible wish with an eBay URL",
        "GET /friends/wishlist?invite=user-12&lang=de as Maya",
        "Inspect rendered eBay anchor rel attributes",
      ],
      actualBehavior: `Unsafe eBay target=_blank links: ${JSON.stringify(unsafeBlankLinks.map((anchor) => anchor.href))}`,
      evidence: page.event,
    });
  }

  const latest = await sessions.alex.request("GET", "/api/account/wishlist", {
    feature: "cleanup",
    action: "owner wishlist read before eBay affiliate cleanup",
  });
  const latestWishlist = wishlistFromPayload(latest.json);
  const cleanup = await sessions.alex.request("PUT", "/api/account/wishlist", {
    feature: "cleanup",
    action: "cleanup temporary eBay affiliate wish",
    body: {
      currency: latestWishlist.currency,
      visibility: latestWishlist.visibility,
      items: withoutRunItems(latestWishlist.items),
    },
  });
  if (cleanup.json?.ok) {
    await mark(state, "cleanup.run-prefix-removed", { prefix: RUN_PREFIX, affiliateEbayProbe: true });
  }
  await emitTelemetry(state, startedMs, "temporary eBay affiliate probe completed", "maya");
}

async function directWishBoundaryProbe(state, startedMs) {
  const sessions = await loginActiveSessions(state);
  await cleanupRunArtifacts(state, sessions);
  const disabled = new QaSession("disabled-direct-wish", state);
  const disabledLogin = await disabled.login("disabled");
  if (disabledLogin?.ok === false && disabledLogin.code === "account-disabled") {
    await mark(state, "auth.disabled-rejected", { code: disabledLogin.code, directWishProbe: true });
  }
  const anonymous = new QaSession("anonymous-direct-wish", state);
  const route = "/wish?sharedWishId=wish_e2e_noise_headphones&lang=de";
  const disabledPage = await disabled.request("GET", route, {
    feature: "boundary",
    action: "disabled opens direct shared wish page",
    headers: { accept: "text/html,application/xhtml+xml" },
  });
  const disabledIncludesTitle = /Noise-canceling headphones/.test(disabledPage.text || "");
  await mark(state, "boundary.disabled-direct-shared-wish-page-denied", {
    status: disabledPage.response?.status,
    includesTitle: disabledIncludesTitle,
  });
  if (disabledIncludesTitle) {
    await recordBug(state, {
      severity: "CRITICAL",
      title: "Disabled user can render direct shared wish page after rejected login",
      stepsToReproduce: [
        "Attempt login as e2e-disabled@wishees.local",
        "GET /wish?sharedWishId=wish_e2e_noise_headphones&lang=de using the resulting cookie jar",
      ],
      actualBehavior: "Page returned the shared wish title with HTTP 200.",
      evidence: disabledPage.event,
    });
  }

  const anonymousPage = await anonymous.request("GET", route, {
    feature: "boundary",
    action: "anonymous opens direct shared wish page",
    headers: { accept: "text/html,application/xhtml+xml" },
  });
  await mark(state, "boundary.unauthenticated-direct-shared-wish-page-observed", {
    status: anonymousPage.response?.status,
    includesTitle: /Noise-canceling headphones/.test(anonymousPage.text || ""),
    includesLogin: /login|anmelden|einloggen/i.test(anonymousPage.text || ""),
  });

  const beforeResult = await sessions.alex.request("GET", "/api/account/wishlist", {
    feature: "direct-wish-boundary",
    action: "owner wishlist read before direct page matrix",
  });
  if (!beforeResult.json?.ok) {
    await recordBug(state, {
      severity: "MAJOR",
      title: "Could not read owner wishlist before direct shared wish matrix",
      stepsToReproduce: ["Log in as Alex", "GET /api/account/wishlist"],
      actualBehavior: JSON.stringify(beforeResult.json ?? beforeResult.error),
      evidence: beforeResult.event,
    });
    await emitTelemetry(state, startedMs, "direct shared wish boundary probe completed", "matrix");
    return;
  }

  const before = wishlistFromPayload(beforeResult.json);
  const cleanBase = withoutRunItems(before.items);
  const privateId = `${RUN_PREFIX}_direct_private`;
  const selectedId = `${RUN_PREFIX}_direct_selected`;
  const publicId = `${RUN_PREFIX}_direct_public`;
  const privateItem = {
    ...makeWish(privateId, "direct private"),
    title: `Codex direct private ${RUN_ID}`,
    visibility: "private",
  };
  const selectedItem = {
    ...makeWish(selectedId, "direct selected"),
    title: `Codex direct selected ${RUN_ID}`,
    visibility: "selected-people",
    allowedViewers: [USERS.maya.email],
  };
  const publicItem = {
    ...makeWish(publicId, "direct public"),
    title: `Codex direct public ${RUN_ID}`,
    visibility: "public",
  };

  const save = await sessions.alex.request("PUT", "/api/account/wishlist", {
    feature: "direct-wish-boundary",
    action: "owner saves direct shared wish matrix items",
    body: {
      currency: before.currency,
      visibility: before.visibility,
      items: [...cleanBase, privateItem, selectedItem, publicItem],
    },
  });
  if (!save.json?.ok) {
    await recordBug(state, {
      severity: "MAJOR",
      title: "Owner could not save direct shared wish matrix items",
      stepsToReproduce: ["Log in as Alex", "PUT /api/account/wishlist with private, selected-people, and public direct-link items"],
      actualBehavior: JSON.stringify(save.json ?? save.error),
      evidence: save.event,
    });
    await cleanupRunArtifacts(state, sessions);
    await emitTelemetry(state, startedMs, "direct shared wish boundary probe completed", "matrix");
    return;
  }

  const directPage = async (session, id, label) =>
    session.request("GET", `/wish?sharedWishId=${encodeURIComponent(id)}&lang=de`, {
      feature: "direct-wish-boundary",
      action: `${label} opens direct shared wish page ${id}`,
      headers: { accept: "text/html,application/xhtml+xml" },
    });
  const matrix = {
    privateMaya: await directPage(sessions.maya, privateId, "maya"),
    privateJordan: await directPage(sessions.jordan, privateId, "jordan"),
    privateLina: await directPage(sessions.lina, privateId, "lina"),
    privateDisabled: await directPage(disabled, privateId, "disabled"),
    privateAnonymous: await directPage(anonymous, privateId, "anonymous"),
    selectedMaya: await directPage(sessions.maya, selectedId, "maya"),
    selectedJordan: await directPage(sessions.jordan, selectedId, "jordan"),
    selectedLina: await directPage(sessions.lina, selectedId, "lina"),
    selectedDisabled: await directPage(disabled, selectedId, "disabled"),
    selectedAnonymous: await directPage(anonymous, selectedId, "anonymous"),
    publicAnonymous: await directPage(anonymous, publicId, "anonymous"),
  };
  const includes = (result, needle) => String(result.text || "").includes(needle);
  const privateLeaks = [
    ["maya", matrix.privateMaya],
    ["jordan", matrix.privateJordan],
    ["lina", matrix.privateLina],
    ["disabled", matrix.privateDisabled],
    ["anonymous", matrix.privateAnonymous],
  ].filter(([, result]) => includes(result, privateItem.title));
  const selectedVisibleToMaya = includes(matrix.selectedMaya, selectedItem.title);
  const selectedLeaks = [
    ["jordan", matrix.selectedJordan],
    ["lina", matrix.selectedLina],
    ["disabled", matrix.selectedDisabled],
    ["anonymous", matrix.selectedAnonymous],
  ].filter(([, result]) => includes(result, selectedItem.title));
  const publicVisibleAnonymous = includes(matrix.publicAnonymous, publicItem.title);
  const unauthorizedPaymentLeaks = [
    ["private:maya", matrix.privateMaya],
    ["private:jordan", matrix.privateJordan],
    ["private:lina", matrix.privateLina],
    ["private:disabled", matrix.privateDisabled],
    ["private:anonymous", matrix.privateAnonymous],
    ["selected:jordan", matrix.selectedJordan],
    ["selected:lina", matrix.selectedLina],
    ["selected:disabled", matrix.selectedDisabled],
    ["selected:anonymous", matrix.selectedAnonymous],
  ].filter(([, result]) => includes(result, "qa-paypal@example.test"));

  await mark(state, "wishlist.visibility.private-direct-page-matrix", {
    privateId,
    leakedTo: privateLeaks.map(([key]) => key),
    statuses: Object.fromEntries(
      [
        ["maya", matrix.privateMaya],
        ["jordan", matrix.privateJordan],
        ["lina", matrix.privateLina],
        ["disabled", matrix.privateDisabled],
        ["anonymous", matrix.privateAnonymous],
      ].map(([key, result]) => [key, result.response?.status]),
    ),
  });
  if (privateLeaks.length > 0) {
    await recordBug(state, {
      severity: "CRITICAL",
      title: "Private wishlist item renders through direct shared wish page",
      stepsToReproduce: [
        "Log in as Alex",
        "Save a wishlist item with visibility=private",
        "GET /wish?sharedWishId={privateItemId}&lang=de as non-owner sessions",
      ],
      actualBehavior: `Private item ${privateId} rendered for: ${privateLeaks.map(([key]) => key).join(", ")}.`,
      evidence: privateLeaks[0][1].event,
    });
  }

  await mark(state, "wishlist.visibility.selected-people-direct-allowed-visible", {
    selectedId,
    allowedUser: USERS.maya.email,
    visibleToMaya: selectedVisibleToMaya,
    status: matrix.selectedMaya.response?.status,
  });
  if (!selectedVisibleToMaya) {
    await recordBug(state, {
      severity: "MAJOR",
      title: "Selected-people direct wish page is hidden from an allowed viewer",
      stepsToReproduce: [
        "Log in as Alex",
        "Save a wishlist item with visibility=selected-people and allowedViewers containing e2e-maya@wishees.local",
        `GET /wish?sharedWishId=${selectedId}&lang=de as Maya`,
      ],
      actualBehavior: "The selected wish title did not render for Maya.",
      evidence: matrix.selectedMaya.event,
    });
  }

  await mark(state, "wishlist.visibility.selected-people-direct-unlisted-hidden", {
    selectedId,
    leakedTo: selectedLeaks.map(([key]) => key),
  });
  if (selectedLeaks.length > 0) {
    await recordBug(state, {
      severity: "CRITICAL",
      title: "Selected-people wishlist item renders through direct shared wish page for unlisted users",
      stepsToReproduce: [
        "Log in as Alex",
        "Save a wishlist item with visibility=selected-people and allowedViewers containing only e2e-maya@wishees.local",
        "GET /wish?sharedWishId={selectedItemId}&lang=de as unlisted sessions",
      ],
      actualBehavior: `Selected item ${selectedId} rendered for: ${selectedLeaks.map(([key]) => key).join(", ")}.`,
      evidence: selectedLeaks[0][1].event,
    });
  }

  await mark(state, "wishlist.visibility.public-direct-page-anonymous", {
    publicId,
    visibleToAnonymous: publicVisibleAnonymous,
    status: matrix.publicAnonymous.response?.status,
  });

  await mark(state, "wishlist.visibility.direct-page-payment-metadata-contained", {
    leakedTo: unauthorizedPaymentLeaks.map(([key]) => key),
  });
  if (unauthorizedPaymentLeaks.length > 0) {
    await recordBug(state, {
      severity: "CRITICAL",
      title: "Payment metadata renders in unauthorized direct shared wish page responses",
      stepsToReproduce: [
        "Log in as Alex",
        "Save private and selected-people wishlist items with giftPaymentAccount set",
        "GET the direct wish pages as unauthorized sessions",
      ],
      actualBehavior: `giftPaymentAccount qa-paypal@example.test appeared in unauthorized direct pages: ${unauthorizedPaymentLeaks
        .map(([key]) => key)
        .join(", ")}.`,
      evidence: unauthorizedPaymentLeaks[0][1].event,
    });
  }

  const latest = await sessions.alex.request("GET", "/api/account/wishlist", {
    feature: "cleanup",
    action: "owner wishlist read before direct page matrix cleanup",
  });
  const latestWishlist = wishlistFromPayload(latest.json);
  const cleanup = await sessions.alex.request("PUT", "/api/account/wishlist", {
    feature: "cleanup",
    action: "cleanup direct shared wish matrix items",
    body: {
      currency: latestWishlist.currency,
      visibility: latestWishlist.visibility,
      items: withoutRunItems(latestWishlist.items),
    },
  });
  if (cleanup.json?.ok) {
    await mark(state, "wishlist.visibility.cleanup", { cleaned: true, directWishProbe: true });
    await mark(state, "cleanup.run-prefix-removed", { prefix: RUN_PREFIX, directWishProbe: true });
  }
  await emitTelemetry(state, startedMs, "direct shared wish boundary probe completed", "matrix");
}

function wishPaymentFields(marker) {
  return {
    giftPaymentMethod: "paypal",
    giftPaymentAccount: marker,
    giftPaymentOtherLabel: "",
    giftPaymentOptions: [
      {
        account: marker,
        accountName: "Codex QA Payment Marker",
        bankName: "",
        method: "paypal",
        otherLabel: "",
        swift: "",
      },
    ],
  };
}

async function paymentMetadataProbe(state, startedMs) {
  const sessions = await loginActiveSessions(state);
  sessions.disabled = new QaSession("disabled-payment-metadata", state);
  const disabledLogin = await sessions.disabled.login("disabled");
  if (disabledLogin?.ok === false && disabledLogin.code === "account-disabled") {
    await mark(state, "auth.disabled-rejected", { code: disabledLogin.code, paymentMetadataProbe: true });
  }
  const anonymous = new QaSession("anonymous-payment-metadata", state);
  await cleanupRunArtifacts(state, sessions);

  const beforeResult = await sessions.alex.request("GET", "/api/account/wishlist", {
    feature: "payment-metadata",
    action: "owner wishlist read before payment metadata probe",
  });
  if (!beforeResult.json?.ok) {
    await recordBug(state, {
      severity: "MAJOR",
      title: "Could not read owner wishlist before payment metadata probe",
      stepsToReproduce: ["Log in as Alex", "GET /api/account/wishlist"],
      actualBehavior: JSON.stringify(beforeResult.json ?? beforeResult.error),
      evidence: beforeResult.event,
    });
    await emitTelemetry(state, startedMs, "payment metadata probe could not read owner wishlist", "matrix");
    return;
  }

  const before = wishlistFromPayload(beforeResult.json);
  const cleanBase = withoutRunItems(before.items);
  const marker = `qa-payment-${RUN_ID}@example.test`;
  const privateId = `${RUN_PREFIX}_payment_private`;
  const selectedId = `${RUN_PREFIX}_payment_selected`;
  const publicId = `${RUN_PREFIX}_payment_public`;
  const privateItem = {
    ...makeWish(privateId, "payment private"),
    ...wishPaymentFields(marker),
    title: `Codex payment private ${RUN_ID}`,
    visibility: "private",
  };
  const selectedItem = {
    ...makeWish(selectedId, "payment selected"),
    ...wishPaymentFields(marker),
    title: `Codex payment selected ${RUN_ID}`,
    visibility: "selected-people",
    allowedViewers: [USERS.maya.email],
  };
  const publicItem = {
    ...makeWish(publicId, "payment public"),
    ...wishPaymentFields(marker),
    title: `Codex payment public ${RUN_ID}`,
    visibility: "public",
  };

  const save = await sessions.alex.request("PUT", "/api/account/wishlist", {
    feature: "payment-metadata",
    action: "owner saves payment metadata matrix wishes",
    body: {
      currency: before.currency,
      visibility: before.visibility,
      items: [...cleanBase, privateItem, selectedItem, publicItem],
    },
  });
  if (!save.json?.ok) {
    await recordBug(state, {
      severity: "MAJOR",
      title: "Owner could not save payment metadata matrix wishes",
      stepsToReproduce: ["Log in as Alex", "PUT /api/account/wishlist with payment metadata test items"],
      actualBehavior: JSON.stringify(save.json ?? save.error),
      evidence: save.event,
    });
    await cleanupRunArtifacts(state, sessions);
    await emitTelemetry(state, startedMs, "payment metadata probe could not save test wishes", "matrix");
    return;
  }

  const shareReads = {
    maya: await sessions.maya.request("GET", "/api/wishlist/share?sharedUserId=12", {
      feature: "payment-metadata",
      action: "maya reads payment metadata shared API",
    }),
    jordan: await sessions.jordan.request("GET", "/api/wishlist/share?sharedUserId=12", {
      feature: "payment-metadata",
      action: "jordan reads payment metadata shared API",
    }),
    lina: await sessions.lina.request("GET", "/api/wishlist/share?sharedUserId=12", {
      feature: "payment-metadata",
      action: "lina reads payment metadata shared API",
    }),
    disabled: await sessions.disabled.request("GET", "/api/wishlist/share?sharedUserId=12", {
      feature: "payment-metadata",
      action: "disabled reads payment metadata shared API",
    }),
    anonymous: await anonymous.request("GET", "/api/wishlist/share?sharedUserId=12", {
      feature: "payment-metadata",
      action: "anonymous reads payment metadata shared API",
    }),
  };
  const shareMarkerLeaks = Object.entries(shareReads)
    .filter(([, result]) => JSON.stringify(result.json || {}).includes(marker))
    .map(([key, result]) => ({ key, result }));
  const restrictedShareMarkerLeaks = shareMarkerLeaks.filter(({ key }) => key !== "maya");
  const shareIdSets = Object.fromEntries(Object.entries(shareReads).map(([key, result]) => [key, sharedItemIds(result.json)]));

  await mark(state, "wishlist.payment-metadata.share-api-contained", {
    marker,
    privateId,
    selectedId,
    publicId,
    markerVisibleTo: shareMarkerLeaks.map(({ key }) => key),
    selectedVisibleTo: Object.entries(shareIdSets)
      .filter(([, ids]) => ids.has(selectedId))
      .map(([key]) => key),
    publicVisibleTo: Object.entries(shareIdSets)
      .filter(([, ids]) => ids.has(publicId))
      .map(([key]) => key),
  });
  if (restrictedShareMarkerLeaks.length > 0) {
    await recordBug(state, {
      severity: "CRITICAL",
      title: "Payment metadata leaks through shared wishlist API for visibility-restricted wishes",
      stepsToReproduce: [
        "Log in as Alex",
        "Save private and selected-people wishlist items with a unique giftPaymentAccount",
        "GET /api/wishlist/share?sharedUserId=12 as unlisted, disabled, or anonymous users",
      ],
      actualBehavior: `Payment marker ${marker} appeared in shared API responses for: ${restrictedShareMarkerLeaks
        .map(({ key }) => key)
        .join(", ")}.`,
      evidence: restrictedShareMarkerLeaks[0].result.event,
    });
  }

  const directPage = async (session, id, label) =>
    session.request("GET", `/wish?sharedWishId=${encodeURIComponent(id)}&lang=de`, {
      feature: "payment-metadata",
      action: `${label} opens payment metadata direct wish ${id}`,
      headers: { accept: "text/html,application/xhtml+xml" },
    });
  const directMatrix = {
    privateMaya: await directPage(sessions.maya, privateId, "maya"),
    privateJordan: await directPage(sessions.jordan, privateId, "jordan"),
    privateLina: await directPage(sessions.lina, privateId, "lina"),
    privateDisabled: await directPage(sessions.disabled, privateId, "disabled"),
    privateAnonymous: await directPage(anonymous, privateId, "anonymous"),
    selectedMaya: await directPage(sessions.maya, selectedId, "maya"),
    selectedJordan: await directPage(sessions.jordan, selectedId, "jordan"),
    selectedLina: await directPage(sessions.lina, selectedId, "lina"),
    selectedDisabled: await directPage(sessions.disabled, selectedId, "disabled"),
    selectedAnonymous: await directPage(anonymous, selectedId, "anonymous"),
    publicAnonymous: await directPage(anonymous, publicId, "anonymous"),
  };
  const directMarkerLeaks = Object.entries(directMatrix)
    .filter(([, result]) => String(result.text || "").includes(marker))
    .map(([key, result]) => ({ key, result }));
  const directPrivateLeaks = directMarkerLeaks.filter(({ key }) => key.startsWith("private"));
  const directSelectedRestrictedLeaks = directMarkerLeaks.filter(
    ({ key }) => key.startsWith("selected") && key !== "selectedMaya",
  );

  await mark(state, "wishlist.payment-metadata.direct-private-contained", {
    marker,
    privateId,
    markerVisibleTo: directPrivateLeaks.map(({ key }) => key.replace("private", "").toLowerCase()),
    titleVisibleTo: Object.entries(directMatrix)
      .filter(([key, result]) => key.startsWith("private") && String(result.text || "").includes(privateItem.title))
      .map(([key]) => key.replace("private", "").toLowerCase()),
  });
  if (directPrivateLeaks.length > 0) {
    await recordBug(state, {
      severity: "CRITICAL",
      title: "Payment metadata renders on private direct wish pages",
      stepsToReproduce: [
        "Log in as Alex",
        "Save a private wishlist item with a unique giftPaymentAccount",
        "GET /wish?sharedWishId={privateItemId}&lang=de as non-owner sessions",
      ],
      actualBehavior: `Payment marker ${marker} rendered on private direct pages: ${directPrivateLeaks
        .map(({ key }) => key)
        .join(", ")}.`,
      evidence: directPrivateLeaks[0].result.event,
    });
  }

  await mark(state, "wishlist.payment-metadata.direct-selected-contained", {
    marker,
    selectedId,
    markerVisibleTo: directMarkerLeaks
      .filter(({ key }) => key.startsWith("selected"))
      .map(({ key }) => key.replace("selected", "").toLowerCase()),
    titleVisibleTo: Object.entries(directMatrix)
      .filter(([key, result]) => key.startsWith("selected") && String(result.text || "").includes(selectedItem.title))
      .map(([key]) => key.replace("selected", "").toLowerCase()),
    publicAnonymousMarkerVisible: directMarkerLeaks.some(({ key }) => key === "publicAnonymous"),
  });
  if (directSelectedRestrictedLeaks.length > 0) {
    await recordBug(state, {
      severity: "CRITICAL",
      title: "Payment metadata renders on selected-people direct wish pages for unlisted users",
      stepsToReproduce: [
        "Log in as Alex",
        "Save a selected-people wishlist item with a unique giftPaymentAccount and only Maya allowed",
        "GET /wish?sharedWishId={selectedItemId}&lang=de as unlisted users",
      ],
      actualBehavior: `Payment marker ${marker} rendered on selected direct pages for: ${directSelectedRestrictedLeaks
        .map(({ key }) => key)
        .join(", ")}.`,
      evidence: directSelectedRestrictedLeaks[0].result.event,
    });
  }

  const latest = await sessions.alex.request("GET", "/api/account/wishlist", {
    feature: "cleanup",
    action: "owner wishlist read before payment metadata cleanup",
  });
  const latestWishlist = wishlistFromPayload(latest.json);
  const cleanup = await sessions.alex.request("PUT", "/api/account/wishlist", {
    feature: "cleanup",
    action: "cleanup payment metadata matrix wishes",
    body: {
      currency: latestWishlist.currency,
      visibility: latestWishlist.visibility,
      items: withoutRunItems(latestWishlist.items),
    },
  });
  if (cleanup.json?.ok) {
    await mark(state, "wishlist.payment-metadata.cleanup", { cleaned: true, marker });
    await mark(state, "cleanup.run-prefix-removed", { prefix: RUN_PREFIX, paymentMetadataProbe: true });
  }
  await emitTelemetry(state, startedMs, "payment metadata probe completed", "matrix");
}

async function main() {
  await mkdir(__dirname, { recursive: true });
  const args = parseArgs(process.argv);
  const startedMs = Date.now();
  const state = args.reset ? emptyState() : await loadJson(STATE_FILE, emptyState());
  state.runId = RUN_ID;
  state.bugs = dedupeBugs(state.bugs || []);
  state.updatedAt = nowIso();
  await saveJson(STATE_FILE, state);
  await saveJson(BUGS_FILE, state.bugs || []);
  if (args.reset) {
    await writeFile(EVENTS_FILE, "");
    await writeFile(TELEMETRY_FILE, "");
  }

  if (args.cleanupOnly) {
    const sessions = await loginActiveSessions(state);
    await cleanupRunArtifacts(state, sessions);
    await emitTelemetry(state, startedMs, "cleanup-only completed", "matrix");
    return;
  }

  if (args.declineOutcomeId) {
    await declineExistingOutcome(state, startedMs, args.declineOutcomeId, args.declineOutcomeReply);
    return;
  }

  if (args.listOwnerOutcomes) {
    await listOwnerOutcomes(state, startedMs);
    return;
  }

  if (args.discoverActions) {
    await discoverContributionActions(state, startedMs);
    return;
  }

  if (args.discoverFriends) {
    await discoverFriendActions(state, startedMs);
    return;
  }

  if (args.discoverNotifications) {
    await discoverNotificationActions(state, startedMs);
    return;
  }

  if (args.jordanFulfillProbe) {
    await jordanFulfillProbe(state, startedMs);
    return;
  }

  if (args.sameHelperProbe) {
    await sameHelperConcurrentProbe(state, startedMs);
    return;
  }

  if (args.sameOriginExtendedProbe) {
    await sameOriginExtendedProbe(state, startedMs);
    return;
  }

  if (args.notificationPermissionProbe) {
    await notificationPermissionProbe(state, startedMs);
    return;
  }

  if (args.helperReplyNotificationProbe) {
    await helperReplyNotificationProbe(state, startedMs);
    return;
  }

  if (args.outcomePermissionProbe) {
    await outcomePermissionProbe(state, startedMs);
    return;
  }

  if (args.ownerDecisionRaceProbe) {
    await ownerDecisionRaceProbe(state, startedMs);
    return;
  }

  if (args.visibilityProbe) {
    await visibilityScopeProbe(state, startedMs);
    return;
  }

  if (args.affiliateProbe) {
    await affiliateLinkProbe(state, startedMs);
    return;
  }

  if (args.affiliateEbayProbe) {
    await affiliateEbayProbe(state, startedMs);
    return;
  }

  if (args.directWishBoundaryProbe) {
    await directWishBoundaryProbe(state, startedMs);
    return;
  }

  if (args.paymentMetadataProbe) {
    await paymentMetadataProbe(state, startedMs);
    return;
  }

  if (args.friendInviteProbe) {
    await friendInviteBoundaryProbe(state, startedMs);
    return;
  }

  if (args.friendMutationPermissionProbe) {
    await friendMutationPermissionProbe(state, startedMs);
    return;
  }

  if (args.friendSnapshot) {
    await friendSnapshot(state, startedMs);
    return;
  }

  if (args.giftRaceProbe) {
    await giftRaceProbe(state, startedMs);
    return;
  }

  if (args.giftContributionBoundaryProbe) {
    await giftContributionBoundaryProbe(state, startedMs);
    return;
  }

  if (args.giftMessageSecurityProbe) {
    await giftMessageSecurityProbe(state, startedMs);
    return;
  }

  await probeRequestedHost(state);
  let cycle = 1;
  const deadline = args.durationMinutes > 0 ? startedMs + args.durationMinutes * 60 * 1000 : 0;
  const maxCycles = args.durationMinutes > 0 ? Number.POSITIVE_INFINITY : Math.max(1, args.cycles);
  let nextTelemetry = Date.now() + args.telemetryMinutes * 60 * 1000;
  while (cycle <= maxCycles && (!deadline || Date.now() < deadline)) {
    await runCycle(state, cycle, startedMs);
    cycle += 1;
    if (Date.now() >= nextTelemetry) {
      await emitTelemetry(state, startedMs, "scheduled telemetry heartbeat", "matrix");
      nextTelemetry = Date.now() + args.telemetryMinutes * 60 * 1000;
    }
  }
  await emitTelemetry(state, startedMs, "runner stopped at configured bound", "matrix");
}

main().catch(async (error) => {
  const state = await loadJson(STATE_FILE, emptyState());
  if (error instanceof Error && error.message.startsWith("NETWORK_UNAVAILABLE:")) {
    state.notes.push({
      ts: nowIso(),
      type: "network-blocker",
      message: error.message,
    });
    await saveJson(STATE_FILE, state);
    await emitTelemetry(state, Date.now(), "network unavailable; rerun with approved network access", "environment");
    return;
  }
  await recordBug(state, {
    severity: "CRITICAL",
    title: "Campaign runner crashed",
    stepsToReproduce: ["Run node wishees-qa-campaign-20260605/runner.mjs"],
    actualBehavior: error instanceof Error ? `${error.stack || error.message}` : String(error),
  });
  console.error(error);
  process.exitCode = 1;
});
