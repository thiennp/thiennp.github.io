#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

FULL_JSON="${SENTRY_SNAPSHOT_JSON:-$REPO_DIR/sentry-chrome-tab-snapshot.json}"
COMPACT_JSON="${SENTRY_SNAPSHOT_COMPACT_JSON:-$SCRIPT_DIR/snapshot-compact.json}"
STDERR_LOG="${SENTRY_SNAPSHOT_STDERR_LOG:-$SCRIPT_DIR/snapshot-last.stderr.log}"
LOCK_DIR="${SENTRY_SNAPSHOT_LOCK_DIR:-${TMPDIR:-/tmp}/sentry-chrome-tab-snapshot.lock}"
TARGET_EMAIL="${SENTRY_SNAPSHOT_EMAIL:-thien.nguyen.check24@gmail.com}"
TARGET_URL="${SENTRY_SNAPSHOT_URL:-https://check24-energie.sentry.io/issues/?project=-1&query=is%3Aunresolved&referrer=issue-list&sort=freq&statsPeriod=24h}"

mkdir -p "$SCRIPT_DIR" "$(dirname "$FULL_JSON")" "$(dirname "$COMPACT_JSON")"
: >"$STDERR_LOG"
exec 2> >(tee -a "$STDERR_LOG" >&2)

log() {
  printf '[sentry-chrome-tab-snapshot] %s\n' "$*" >&2
}

if [[ -x /opt/homebrew/bin/node ]]; then
  NODE_BIN="/opt/homebrew/bin/node"
elif command -v node >/dev/null 2>&1; then
  NODE_BIN="$(command -v node)"
else
  log "PRECONDITION_FAILURE: node is required"
  exit 1
fi

json_get() {
  "$NODE_BIN" -e "try{const fs=require('fs');const v=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));const p=process.argv[2].split('.');let x=v;for(const k of p)x=x&&x[k];process.stdout.write(x==null?'':String(x));}catch{}" "$1" "$2"
}

release_lock() {
  if [[ -d "$LOCK_DIR" && -f "$LOCK_DIR/metadata.json" ]]; then
    local owner_pid owner_script
    owner_pid="$(json_get "$LOCK_DIR/metadata.json" pid)"
    owner_script="$(json_get "$LOCK_DIR/metadata.json" script_path)"
    if [[ "$owner_pid" == "$$" && "$owner_script" == "$0" ]]; then
      rm -rf "$LOCK_DIR"
    fi
  fi
}

acquire_lock() {
  if mkdir "$LOCK_DIR" 2>/dev/null; then
    "$NODE_BIN" - <<'NODE' "$LOCK_DIR/metadata.json" "$$" "$0"
const fs = require('fs');
const os = require('os');
const [file, pid, scriptPath] = process.argv.slice(2);
fs.writeFileSync(file, JSON.stringify({
  pid: Number(pid),
  start_epoch: Math.floor(Date.now() / 1000),
  hostname: os.hostname(),
  script_path: scriptPath,
}, null, 2));
NODE
    trap release_lock EXIT
    return 0
  fi

  if [[ -f "$LOCK_DIR/metadata.json" ]]; then
    local owner_pid owner_script owner_host
    owner_pid="$(json_get "$LOCK_DIR/metadata.json" pid)"
    owner_script="$(json_get "$LOCK_DIR/metadata.json" script_path)"
    owner_host="$(json_get "$LOCK_DIR/metadata.json" hostname)"
    if [[ -n "$owner_pid" && "$owner_pid" =~ ^[0-9]+$ ]] && kill -0 "$owner_pid" 2>/dev/null; then
      log "LOCK_CONFLICT: active pid=$owner_pid host=$owner_host script=$owner_script"
      exit 5
    fi
    log "Removing stale lock for pid=${owner_pid:-unknown} host=${owner_host:-unknown} script=${owner_script:-unknown}"
    rm -rf "$LOCK_DIR"
    acquire_lock
    return 0
  fi

  log "LOCK_CONFLICT: lock directory exists without readable metadata: $LOCK_DIR"
  exit 5
}

if ! command -v osascript >/dev/null 2>&1; then
  log "PRECONDITION_FAILURE: osascript is required"
  exit 1
fi

acquire_lock

set +e
"$NODE_BIN" - <<'NODE' "$FULL_JSON" "$COMPACT_JSON" "$TARGET_EMAIL" "$TARGET_URL" "$SCRIPT_DIR"
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const [FULL_JSON, COMPACT_JSON, TARGET_EMAIL, TARGET_URL, SCRIPT_DIR] = process.argv.slice(2);
const HOME = process.env.HOME;
const AUTOMATION_ID = 'sentry-chrome-tab-snapshot';
const SCHEMA_VERSION = 1;
const EXIT = {
  SUCCESS: 0,
  PRECONDITION: 1,
  AUTH: 2,
  PAGE_LOAD: 3,
  AMBIGUOUS: 4,
};
const sensitiveParams = new Set([
  'access_token', 'authenticity_token', 'client_data', 'code', 'csrf', 'id_token',
  'jwt', 'key', 'password', 'relaystate', 'refreshtoken', 'refresh_token',
  'samlresponse', 'secret', 'session_code', 'sid', 'state', 'ticket', 'token',
  'xsrf',
]);
const allowedCompactRowFields = [
  'rowIndex', 'issueTitle', 'issueId', 'projectSlug', 'projectId', 'sentryShortIds',
  'logger', 'level', 'status', 'eventCount', 'userCount', 'frequency', 'priority',
  'lastSeen', 'firstSeen', 'linkedJiraKeys', 'issueUrl',
];

function log(message) {
  console.error(`[sentry-chrome-tab-snapshot] ${message}`);
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function runJxa(source) {
  return cp.execFileSync('/usr/bin/osascript', ['-l', 'JavaScript'], {
    input: source,
    encoding: 'utf8',
    maxBuffer: 80 * 1024 * 1024,
  }).trim();
}

function safeJsonParse(text, fallback = null) {
  try { return JSON.parse(text); } catch { return fallback; }
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function sanitizeUrl(value) {
  if (!value || typeof value !== 'string') return value;
  try {
    const url = new URL(value);
    for (const key of [...url.searchParams.keys()]) {
      if (sensitiveParams.has(key.toLowerCase()) || /token|secret|password|session|csrf|xsrf|saml/i.test(key)) {
        url.searchParams.set(key, '[REDACTED]');
      }
    }
    return url.toString();
  } catch {
    return value.replace(/([?&](?:token|state|code|session_code|client_data|access_token|refresh_token|id_token|secret|password)=)[^&\s]+/gi, '$1[REDACTED]');
  }
}

function atomicWriteJson(file, data) {
  const dir = path.dirname(file);
  fs.mkdirSync(dir, {recursive: true});
  const tmp = path.join(dir, `.${path.basename(file)}.tmp-${process.pid}-${Date.now()}`);
  const json = `${JSON.stringify(data, null, 2)}\n`;
  const fd = fs.openSync(tmp, 'w', 0o600);
  try {
    fs.writeFileSync(fd, json, 'utf8');
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  fs.renameSync(tmp, file);
  try {
    const dirFd = fs.openSync(dir, 'r');
    try { fs.fsyncSync(dirFd); } finally { fs.closeSync(dirFd); }
  } catch {
    // Directory fsync is best-effort on macOS for this snapshot workflow.
  }
}

function blockerResult(label, message, exitCode, extra = {}) {
  const now = new Date().toISOString();
  return {
    schema_version: SCHEMA_VERSION,
    automationId: AUTOMATION_ID,
    extractionStartedAt,
    extractionFinishedAt: now,
    target: {
      email: TARGET_EMAIL,
      url: TARGET_URL,
      action: 'blocked',
      selectedTab: null,
      loadState: null,
    },
    profileVerification: extra.profileVerification || null,
    openedTabs: extra.openedTabs || {profileWindowCount: 0, profileTabCount: 0, windows: []},
    sentryIssueList: extra.sentryIssueList || null,
    run: {
      status: 'blocked',
      exitCode,
      label,
      message,
    },
    blockers: [{type: label, message, exitCode}],
    notes: [
      'This is a structured blocker snapshot written by snapshot.sh.',
      'No non-target Chrome profile was used.',
    ],
  };
}

function compactFromFull(full) {
  const rows = full.sentryIssueList?.rows || [];
  return {
    schema_version: SCHEMA_VERSION,
    automationId: AUTOMATION_ID,
    extractionStartedAt: full.extractionStartedAt,
    extractionFinishedAt: full.extractionFinishedAt,
    target: full.target,
    openedTabs: {
      profileWindowCount: full.openedTabs.profileWindowCount,
      profileTabCount: full.openedTabs.profileTabCount,
      tabs: (full.openedTabs.windows || []).flatMap(window =>
        (window.tabs || []).map(tab => ({
          windowIndex: window.windowIndex,
          tabIndex: tab.tabIndex,
          active: tab.active,
          title: tab.title,
          url: tab.url,
        }))
      ),
    },
    sentryIssueList: full.sentryIssueList ? {
      title: full.sentryIssueList.title,
      url: full.sentryIssueList.url,
      authState: full.sentryIssueList.authState,
      rowCount: full.sentryIssueList.rowCount,
      emptyReason: full.sentryIssueList.emptyReason || null,
      rows: rows.map(row => {
        const out = {};
        for (const key of allowedCompactRowFields) {
          if (key === 'lastSeen') out[key] = row.lastSeen?.text || row.lastSeen || null;
          else if (key === 'firstSeen') out[key] = row.firstSeen?.text || row.firstSeen || null;
          else out[key] = row[key] ?? null;
        }
        return out;
      }),
    } : null,
    run: full.run,
    blockers: full.blockers || [],
  };
}

function writeAndExit(full, exitCode) {
  const compact = compactFromFull(full);
  atomicWriteJson(FULL_JSON, full);
  atomicWriteJson(COMPACT_JSON, compact);
  readJson(FULL_JSON);
  readJson(COMPACT_JSON);
  console.log(JSON.stringify({
    status: exitCode === 0 ? 'success' : 'blocked',
    exitCode,
    label: full.run?.label || null,
    action: full.target?.action || null,
    profileTabs: full.openedTabs?.profileTabCount || 0,
    rows: full.sentryIssueList?.rowCount || 0,
    blockers: full.blockers?.length || 0,
    output: FULL_JSON,
    compactOutput: COMPACT_JSON,
  }, null, 2));
  process.exit(exitCode);
}

function preconditions() {
  if (!fs.existsSync('/Applications/Google Chrome.app')) {
    return {ok: false, code: EXIT.PRECONDITION, label: 'PRECONDITION_FAILURE', message: 'Google Chrome.app was not found in /Applications.'};
  }
  if (!HOME) {
    return {ok: false, code: EXIT.PRECONDITION, label: 'PRECONDITION_FAILURE', message: 'HOME is not set.'};
  }
  const chromeRoot = path.join(HOME, 'Library/Application Support/Google/Chrome');
  if (!fs.existsSync(path.join(chromeRoot, 'Local State'))) {
    return {ok: false, code: EXIT.PRECONDITION, label: 'PRECONDITION_FAILURE', message: 'Chrome Local State was not found.'};
  }
  return {ok: true};
}

function profileEntries() {
  const root = path.join(HOME, 'Library/Application Support/Google/Chrome');
  const localState = readJson(path.join(root, 'Local State'));
  const entries = Object.entries(localState.profile?.info_cache || {}).map(([dir, info]) => {
    let prefs = {};
    try { prefs = readJson(path.join(root, dir, 'Preferences')); } catch {}
    const prefEmails = Array.isArray(prefs.account_info) ? prefs.account_info.map(a => a.email).filter(Boolean) : [];
    return {
      dir,
      path: path.join(root, dir),
      name: info.name,
      userName: info.user_name || null,
      gaiaName: info.gaia_name || null,
      prefEmails,
      isTarget: info.user_name === TARGET_EMAIL || prefEmails.includes(TARGET_EMAIL),
    };
  });
  return {root, entries};
}

function chromeState() {
  return JSON.parse(runJxa(`
const chrome = Application('Google Chrome');
if (!chrome.running()) {
  JSON.stringify([]);
} else {
  JSON.stringify(chrome.windows().map((w, wi) => ({
    windowIndex: wi + 1,
    id: String(w.id()),
    name: w.name(),
    activeTabIndex: w.activeTabIndex(),
    mode: w.mode(),
    bounds: w.bounds(),
    tabs: w.tabs().map((t, ti) => ({
      tabIndex: ti + 1,
      id: String(t.id()),
      title: t.title(),
      url: t.url(),
      loading: t.loading(),
      active: ti + 1 === w.activeTabIndex()
    }))
  })));
}
`));
}

function sessionTextForProfile(root, dir) {
  const sessionsDir = path.join(root, dir, 'Sessions');
  if (!fs.existsSync(sessionsDir)) return '';
  let out = '';
  for (const name of fs.readdirSync(sessionsDir)) {
    const file = path.join(sessionsDir, name);
    try {
      out += cp.execFileSync('/usr/bin/strings', [file], {
        encoding: 'utf8',
        maxBuffer: 150 * 1024 * 1024,
      });
      out += '\n';
    } catch {}
  }
  return out;
}

function scoreWindows(root, profiles, windows) {
  const sessionTexts = new Map(profiles.map(profile => [profile.dir, sessionTextForProfile(root, profile.dir)]));
  return windows.map(window => {
    const profileScores = profiles.map(profile => {
      const blob = sessionTexts.get(profile.dir) || '';
      let exactUrlMatches = 0;
      let originHints = 0;
      const matchedTabIndexes = [];
      for (const tab of window.tabs) {
        const value = tab.url;
        if (!value || value.length < 20 || value.startsWith('about:') || value.startsWith('chrome:')) continue;
        if (blob.includes(value)) {
          exactUrlMatches += 1;
          matchedTabIndexes.push(tab.tabIndex);
        } else {
          try {
            const origin = new URL(value).origin;
            if (origin && blob.includes(origin)) originHints += 1;
          } catch {}
        }
      }
      return {
        profileDir: profile.dir,
        profileEmail: profile.userName || profile.prefEmails[0] || null,
        isTarget: profile.isTarget,
        exactUrlMatches,
        originHints,
        score: exactUrlMatches + (originHints * 0.1),
        matchedTabIndexes,
      };
    }).sort((a, b) => b.score - a.score);
    return {
      windowIndex: window.windowIndex,
      windowId: window.id,
      windowName: window.name,
      profileScores,
      bestProfileDir: profileScores[0]?.profileDir || null,
      bestProfileEmail: profileScores[0]?.profileEmail || null,
      isTargetProfileWindow: !!profileScores[0]?.isTarget && profileScores[0].score > 0 && profileScores[0].score >= ((profileScores[1]?.score || 0) + 1),
    };
  });
}

function focusTab(windowIndex, tabIndex) {
  runJxa(`
const chrome = Application('Google Chrome');
chrome.activate();
const w = chrome.windows()[${windowIndex - 1}];
w.index = 1;
w.activeTabIndex = ${tabIndex};
'focused';
`);
}

function openTargetInWindow(windowIndex) {
  runJxa(`
const chrome = Application('Google Chrome');
chrome.activate();
const w = chrome.windows()[${windowIndex - 1}];
w.index = 1;
w.tabs.push(chrome.Tab({url: ${JSON.stringify(TARGET_URL)}}));
w.activeTabIndex = w.tabs().length;
'opened';
`);
}

function waitForActiveTabComplete(timeoutMs = 30000) {
  const start = Date.now();
  let state = null;
  while (Date.now() - start < timeoutMs) {
    state = JSON.parse(runJxa(`
const chrome = Application('Google Chrome');
const w = chrome.windows()[0];
const t = w.tabs()[w.activeTabIndex() - 1];
JSON.stringify({title: t.title(), url: t.url(), loading: t.loading()});
`));
    if (!state.loading) return state;
    sleep(750);
  }
  return state;
}

function executeActiveTabJavascript(js) {
  return runJxa(`
const chrome = Application('Google Chrome');
const w = chrome.windows()[0];
const t = w.tabs()[w.activeTabIndex() - 1];
t.execute({javascript: ${JSON.stringify(js)}});
`);
}

function inspectPageState() {
  const js = `(() => {
    const clean = value => (value || '').replace(/\\s+/g, ' ').trim();
    const rows = document.querySelectorAll('[data-test-id="group"]').length;
    const issueLinks = [...document.querySelectorAll('a[href]')].filter(a => /\\/issues\\/\\d+/.test(String(a.getAttribute('href') || '')) && !/\\/activity\\//.test(String(a.getAttribute('href') || ''))).length;
    const body = clean(document.body ? document.body.innerText : '');
    const loginish = /sign in|log in|login|authenticate/i.test(document.title + ' ' + body.slice(0, 800));
    const hasShell = /Issues|Feed|Errors & Outages|Recently Run/.test(body.slice(0, 2000));
    const emptyReason = rows === 0 && /no issues|no results|nothing to show|there are no/i.test(body) ? 'Sentry page shows an explicit empty issue-list state.' : null;
    return JSON.stringify({title: document.title, url: location.href, readyState: document.readyState, rows, issueLinks, loginish, hasShell, emptyReason, bodySample: body.slice(0, 1000)});
  })()`;
  return safeJsonParse(executeActiveTabJavascript(js), {});
}

function pollForIssueList(timeoutMs = 30000) {
  const start = Date.now();
  let last = inspectPageState();
  while (Date.now() - start < timeoutMs) {
    if (last.issueLinks > 0 || last.emptyReason) return {ok: true, state: last};
    if (last.loginish && !last.hasShell) return {ok: false, code: EXIT.AUTH, label: 'AUTH_FAILURE', state: last};
    sleep(2000);
    last = inspectPageState();
  }
  if (last.loginish && !last.hasShell) return {ok: false, code: EXIT.AUTH, label: 'AUTH_FAILURE', state: last};
  return {ok: false, code: EXIT.PAGE_LOAD, label: 'PAGE_LOAD_FAILURE', state: last};
}

function extractSentryPage() {
  const pageJs = `(() => {
    const clean = value => (value || '').replace(/\\s+/g, ' ').trim();
    const absolutize = value => { try { return new URL(value, location.href).href; } catch { return value || null; } };
    const issueIdFromUrl = value => { const m = String(value || '').match(/\\/issues\\/(\\d+)/); return m ? m[1] : null; };
    const projectFromUrl = value => {
      try {
        const u = new URL(value, location.href);
        const slug = (u.pathname.match(/\\/projects\\/([^/]+)/) || [])[1] || null;
        return {slug, projectId: u.searchParams.get('project')};
      } catch { return {slug: null, projectId: null}; }
    };
    const parseCountStatus = value => {
      const m = clean(value).match(/^([0-9.,]+\\s*[KMB]?)\\s*(.*)$/i);
      return m ? {count: m[1].replace(/\\s+/g, ''), statusOrTrend: clean(m[2]) || null} : {count: null, statusOrTrend: clean(value) || null};
    };
    const rows = [...document.querySelectorAll('[data-test-id="group"]')].map((row, index) => {
      const links = [...row.querySelectorAll('a[href]')].map(a => ({text: clean(a.textContent), href: absolutize(a.getAttribute('href'))}));
      const issueLink = links.find(l => /\\/issues\\/\\d+/.test(l.href || '') && !/\\/activity\\//.test(l.href || '')) || null;
      const projectLink = links.find(l => /\\/projects\\//.test(l.href || '')) || null;
      const loggerLink = links.find(l => /query=logger%3A|query=logger:/i.test(l.href || '')) || null;
      const header = row.querySelector('[data-test-id="event-issue-header"]');
      const headerText = clean(header ? header.innerText : '');
      const title = issueLink ? clean(issueLink.text) : null;
      const level = (headerText.match(/Level:\\s*([A-Za-z]+)/) || [])[1] || null;
      let culprit = null;
      if (headerText) culprit = clean(headerText.replace(title || '', '').replace(/Level:\\s*[A-Za-z]+/, '')) || null;
      const times = [...row.querySelectorAll('time')].map(t => ({label: t.getAttribute('aria-label') || null, text: clean(t.textContent), datetime: t.getAttribute('datetime') || null, title: t.getAttribute('title') || null}));
      const cellTexts = [...row.children].map(el => clean(el.innerText)).filter(Boolean);
      const countAndStatus = parseCountStatus(cellTexts[3] || '');
      const project = projectLink ? projectFromUrl(projectLink.href) : {slug: null, projectId: null};
      const jiraKeys = links.filter(l => /atlassian\\.net\\/browse\\//.test(l.href || '')).map(l => ({key: clean(l.text) || ((l.href || '').match(/browse\\/([A-Z][A-Z0-9]+-\\d+)/) || [])[1] || null, href: l.href}));
      const shortIds = [...new Set((clean(row.innerText).match(/\\b[A-Z][A-Z0-9]+(?:-[A-Z0-9]+)+\\b/g) || []).filter(v => !/^PRE-\\d+$|^OPS-\\d+$/.test(v)))];
      return {
        rowIndex: index + 1,
        issueTitle: title,
        issueId: issueIdFromUrl(issueLink && issueLink.href),
        issueUrl: issueLink && issueLink.href,
        culprit,
        projectSlug: project.slug,
        projectId: project.projectId,
        sentryShortIds: shortIds,
        logger: loggerLink ? clean(loggerLink.text) : null,
        level,
        status: countAndStatus.statusOrTrend,
        eventCount: countAndStatus.count,
        userCount: cellTexts[4] || null,
        frequency: cellTexts[5] || null,
        priority: cellTexts[6] || null,
        lastSeen: times.find(t => /last/i.test(t.label || '')) || null,
        firstSeen: times.find(t => /first/i.test(t.label || '')) || null,
        linkedJiraKeys: jiraKeys,
        cellTexts,
        rawText: clean(row.innerText),
        links,
      };
    });
    const bodyText = clean(document.body ? document.body.innerText : '');
    const emptyReason = rows.length === 0 && /no issues|no results|nothing to show|there are no/i.test(bodyText) ? 'Sentry page shows an explicit empty issue-list state.' : null;
    const authState = /sign in|log in|login|authenticate/i.test(document.title + ' ' + bodyText.slice(0, 500)) && rows.length === 0 ? 'login_or_auth_required' : (rows.length > 0 ? 'issue_list_loaded' : 'loaded_no_rows');
    return JSON.stringify({
      title: document.title,
      url: location.href,
      readyState: document.readyState,
      capturedAt: new Date().toISOString(),
      authState,
      rowCount: rows.length,
      emptyReason,
      rows,
      listMetadata: {
        headingText: clean((document.querySelector('h1,h2') || {}).innerText || ''),
        pagination: clean((document.querySelector('[data-test-id="pagination"]') || {}).innerText || ''),
        bodyCharacterCount: document.body ? document.body.innerText.length : 0,
      },
      errorText: rows.length === 0 ? bodyText.slice(0, 1000) : null,
    });
  })()`;
  return JSON.parse(executeActiveTabJavascript(pageJs));
}

function sanitizePage(page) {
  if (!page) return page;
  return {
    ...page,
    url: sanitizeUrl(page.url),
    rows: (page.rows || []).map(row => ({
      ...row,
      issueUrl: sanitizeUrl(row.issueUrl),
      links: (row.links || []).map(link => ({...link, href: sanitizeUrl(link.href)})),
      linkedJiraKeys: (row.linkedJiraKeys || []).map(link => ({...link, href: sanitizeUrl(link.href)})),
    })),
  };
}

function sanitizeWindows(windows, matches) {
  const targetWindowIndexes = new Set(matches.filter(match => match.isTargetProfileWindow).map(match => match.windowIndex));
  return windows
    .filter(window => targetWindowIndexes.has(window.windowIndex))
    .map(window => {
      const match = matches.find(item => item.windowIndex === window.windowIndex);
      return {
        windowIndex: window.windowIndex,
        windowId: window.id,
        windowName: window.name,
        bounds: window.bounds,
        activeTabIndex: window.activeTabIndex,
        profileDir: match?.bestProfileDir || null,
        profileEmail: match?.bestProfileEmail || null,
        tabs: window.tabs.map(tab => {
          const redactedUrl = sanitizeUrl(tab.url);
          return {...tab, url: redactedUrl, rawUrlRedacted: redactedUrl !== tab.url};
        }),
      };
    });
}

const extractionStartedAt = new Date().toISOString();

const pre = preconditions();
if (!pre.ok) {
  writeAndExit(blockerResult(pre.label, pre.message, pre.code), pre.code);
}

let profiles;
try {
  profiles = profileEntries();
} catch (error) {
  writeAndExit(blockerResult('PRECONDITION_FAILURE', `Could not read Chrome profile metadata: ${error.message}`, EXIT.PRECONDITION), EXIT.PRECONDITION);
}

const targetProfile = profiles.entries.find(profile => profile.isTarget) || null;
if (!targetProfile || !fs.existsSync(targetProfile.path)) {
  writeAndExit(blockerResult('PRECONDITION_FAILURE', `No Chrome profile directory matched ${TARGET_EMAIL}.`, EXIT.PRECONDITION, {
    profileVerification: {
      method: 'Chrome Local State/Preferences email match',
      targetProfile,
      allProfiles: profiles.entries,
      windowMatches: [],
    },
  }), EXIT.PRECONDITION);
}

let initialWindows = [];
let initialMatches = [];
try {
  initialWindows = chromeState();
  initialMatches = scoreWindows(profiles.root, profiles.entries, initialWindows);
} catch (error) {
  writeAndExit(blockerResult('PRECONDITION_FAILURE', `Could not inspect Chrome windows via Apple Events: ${error.message}`, EXIT.PRECONDITION, {
    profileVerification: {
      method: 'Chrome Local State/Preferences email match plus per-window Chrome Sessions exact URL correlation',
      targetProfile,
      allProfiles: profiles.entries,
      windowMatches: initialMatches,
    },
  }), EXIT.PRECONDITION);
}

const targetWindows = initialMatches.filter(match => match.isTargetProfileWindow).map(match => match.windowIndex);
if (targetWindows.length === 0) {
  writeAndExit(blockerResult('PRECONDITION_FAILURE', `No open Chrome window could be verified as profile ${TARGET_EMAIL}.`, EXIT.PRECONDITION, {
    profileVerification: {
      method: 'Chrome Local State/Preferences email match plus per-window Chrome Sessions exact URL correlation',
      targetProfile,
      allProfiles: profiles.entries,
      windowMatches: initialMatches,
    },
    openedTabs: {profileWindowCount: 0, profileTabCount: 0, windows: []},
  }), EXIT.PRECONDITION);
}

let action = 'blocked';
let selected = null;
let exact = null;
for (const window of initialWindows.filter(item => targetWindows.includes(item.windowIndex))) {
  for (const tab of window.tabs) {
    if (tab.url === TARGET_URL) exact = {windowIndex: window.windowIndex, windowId: window.id, tabIndex: tab.tabIndex, tabId: tab.id};
  }
}

if (exact) {
  action = 'reused';
  selected = exact;
  focusTab(exact.windowIndex, exact.tabIndex);
} else {
  action = 'opened';
  openTargetInWindow(targetWindows[0]);
  sleep(1000);
  const current = chromeState()[0];
  selected = {
    windowIndex: current.windowIndex,
    windowId: current.id,
    tabIndex: current.activeTabIndex,
    tabId: current.tabs[current.activeTabIndex - 1]?.id || null,
  };
}

let loadState = null;
try {
  loadState = waitForActiveTabComplete();
  executeActiveTabJavascript('JSON.stringify({ok:true})');
} catch (error) {
  writeAndExit(blockerResult('PRECONDITION_FAILURE', `Chrome JavaScript from Apple Events failed: ${error.message}`, EXIT.PRECONDITION), EXIT.PRECONDITION);
}

const poll = pollForIssueList();
if (!poll.ok) {
  const finalWindows = chromeState();
  const finalMatches = scoreWindows(profiles.root, profiles.entries, finalWindows);
  const openedWindows = sanitizeWindows(finalWindows, finalMatches);
  writeAndExit(blockerResult(poll.label, `${poll.label}: ${poll.state?.title || 'Sentry page did not reach an extractable issue-list state.'}`, poll.code, {
    profileVerification: {
      method: 'Chrome Local State/Preferences email match plus per-window Chrome Sessions exact URL correlation',
      targetProfile,
      allProfiles: profiles.entries,
      windowMatches: finalMatches,
    },
    openedTabs: {
      profileWindowCount: openedWindows.length,
      profileTabCount: openedWindows.reduce((sum, window) => sum + window.tabs.length, 0),
      windows: openedWindows,
    },
    sentryIssueList: {
      title: poll.state?.title || null,
      url: sanitizeUrl(poll.state?.url || null),
      readyState: poll.state?.readyState || null,
      capturedAt: new Date().toISOString(),
      authState: poll.label === 'AUTH_FAILURE' ? 'login_or_auth_required' : 'not_loaded',
      rowCount: poll.state?.rows || 0,
      emptyReason: poll.state?.emptyReason || null,
      rows: [],
      listMetadata: {},
      errorText: poll.state?.bodySample || null,
    },
  }), poll.code);
}

let page = sanitizePage(extractSentryPage());
const extractedIssueUrlCount = (page.rows || []).filter(row => row.issueUrl || row.issueId).length;
if ((page.rowCount === 0 && !page.emptyReason) || (page.rowCount > 0 && extractedIssueUrlCount === 0)) {
  const finalWindows = chromeState();
  const finalMatches = scoreWindows(profiles.root, profiles.entries, finalWindows);
  const openedWindows = sanitizeWindows(finalWindows, finalMatches);
  const ambiguousMessage = page.rowCount === 0
    ? 'Sentry extraction returned zero rows without an explicit empty issue-list state.'
    : `Sentry extraction returned ${page.rowCount} row shell(s) but no issue URLs/IDs.`;
  writeAndExit(blockerResult('EXTRACTION_AMBIGUOUS', ambiguousMessage, EXIT.AMBIGUOUS, {
    profileVerification: {
      method: 'Chrome Local State/Preferences email match plus per-window Chrome Sessions exact URL correlation',
      targetProfile,
      allProfiles: profiles.entries,
      windowMatches: finalMatches,
    },
    openedTabs: {
      profileWindowCount: openedWindows.length,
      profileTabCount: openedWindows.reduce((sum, window) => sum + window.tabs.length, 0),
      windows: openedWindows,
    },
    sentryIssueList: page,
  }), EXIT.AMBIGUOUS);
}

const finalWindows = chromeState();
const finalMatches = scoreWindows(profiles.root, profiles.entries, finalWindows);
const openedWindows = sanitizeWindows(finalWindows, finalMatches);

if (selected) {
  const targetWindow = finalWindows.find(window => finalMatches.find(match => match.windowIndex === window.windowIndex)?.isTargetProfileWindow && window.tabs.some(tab => tab.url === TARGET_URL));
  const targetTab = targetWindow?.tabs.find(tab => tab.url === TARGET_URL);
  if (targetWindow && targetTab) focusTab(targetWindow.windowIndex, targetTab.tabIndex);
}

const full = {
  schema_version: SCHEMA_VERSION,
  automationId: AUTOMATION_ID,
  extractionStartedAt,
  extractionFinishedAt: new Date().toISOString(),
  target: {
    email: TARGET_EMAIL,
    url: TARGET_URL,
    action,
    selectedTab: selected,
    loadState: loadState ? {...loadState, url: sanitizeUrl(loadState.url)} : null,
  },
  profileVerification: {
    method: 'Chrome Local State/Preferences email match plus per-window Chrome Sessions exact URL correlation',
    targetProfile,
    allProfiles: profiles.entries.map(profile => ({
      dir: profile.dir,
      name: profile.name,
      userName: profile.userName,
      prefEmails: profile.prefEmails,
      isTarget: profile.isTarget,
    })),
    windowMatches: finalMatches,
  },
  openedTabs: {
    profileWindowCount: openedWindows.length,
    profileTabCount: openedWindows.reduce((sum, window) => sum + window.tabs.length, 0),
    windows: openedWindows,
  },
  sentryIssueList: page,
  run: {
    status: 'success',
    exitCode: 0,
    label: 'SUCCESS',
    message: 'Sentry issue-list snapshot completed.',
  },
  blockers: [],
  notes: [
    'URLs in openedTabs and extracted links have sensitive auth query parameters redacted before saving.',
    'Only windows verified as the target profile are included in openedTabs.windows.',
    'snapshot-compact.json is generated from the saved full JSON for chat display.',
  ],
};

writeAndExit(full, EXIT.SUCCESS);
NODE
snapshot_exit=$?
set -e

sync_exit=0
if [[ -f "$SCRIPT_DIR/sync-live-report.mjs" && -f "$FULL_JSON" ]]; then
  if ! "$NODE_BIN" "$SCRIPT_DIR/sync-live-report.mjs" "$FULL_JSON"; then
    sync_exit=1
    log "LIVE_REPORT_SYNC_WARNING: snapshot JSON was written, but localhost:8766 sync failed; see $SCRIPT_DIR/live-report-sync-status.json"
  fi
fi

if [[ "$snapshot_exit" -eq 0 && "$sync_exit" -eq 0 && -f "$SCRIPT_DIR/scan-issue-jira-links.mjs" ]]; then
  if ! "$NODE_BIN" "$SCRIPT_DIR/scan-issue-jira-links.mjs" "$FULL_JSON"; then
    log "ISSUE_JIRA_SCAN_WARNING: snapshot and localhost sync succeeded, but issue detail Jira scan had warnings; see $SCRIPT_DIR/issue-jira-scan-status.json"
  fi
fi

exit "$snapshot_exit"
