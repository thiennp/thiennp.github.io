#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const DEFAULT_URL =
  "https://sec.check24.de/package-audit?slug=power&vulnerabilityCountsSearch=critical%2Chigh%2Cmedium%2Clow";
const DEFAULT_MAX_AGE_MINUTES = 360;

const EXIT = {
  ok: 0,
  usage: 1,
  missing: 2,
  stale: 3,
  explicitFailure: 4,
  ambiguous: 5,
};

function parseArgs(argv) {
  const args = {
    evidenceDir: "",
    maxAgeMinutes: DEFAULT_MAX_AGE_MINUTES,
    url: DEFAULT_URL,
    stateFile: "",
    json: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      args.help = true;
    } else if (arg === "--evidence-dir") {
      args.evidenceDir = argv[++i] ?? "";
    } else if (arg === "--max-age-minutes") {
      args.maxAgeMinutes = Number(argv[++i]);
    } else if (arg === "--url") {
      args.url = argv[++i] ?? "";
    } else if (arg === "--state-file") {
      args.stateFile = argv[++i] ?? "";
    } else if (arg === "--json") {
      args.json = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return args;
}

function usage() {
  return `Usage:
  node scripts/verify-package-audit-preflight.mjs --evidence-dir <run-evidence-dir> [options]

Options:
  --max-age-minutes <n>  Maximum evidence age from newest matching file. Default: ${DEFAULT_MAX_AGE_MINUTES}
  --url <url>            Required package-audit URL. Default: ${DEFAULT_URL}
  --state-file <path>    Write the verification result as JSON.
  --json                 Print JSON instead of the compact text result.

Purpose:
  Fail closed unless this run's evidence proves the required package-audit Chrome sync
  already succeeded. Run this before PR polling, blocked-item rechecks, Jira/Bitbucket
  mutations, repository work, or remediation. This verifier does not open Chrome.`;
}

function listFiles(dir) {
  const entries = [];
  for (const name of readdirSync(dir)) {
    const fullPath = path.join(dir, name);
    const st = statSync(fullPath);
    if (st.isDirectory()) {
      entries.push(...listFiles(fullPath));
    } else if (/\.(json|log|md|txt)$/i.test(name)) {
      entries.push({ path: fullPath, mtimeMs: st.mtimeMs });
    }
  }
  return entries;
}

function looksLikeSyncEvidence(filePath) {
  const name = path.basename(filePath).toLowerCase();
  if (name === "memory-frozen.md" || name.startsWith("audit-") || name.includes("npm-audit")) {
    return false;
  }

  return [
    "sync",
    "chrome",
    "package-audit",
    "preflight",
    "dashboard",
  ].some((needle) => name.includes(needle));
}

function normalizeUrl(url) {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return url;
  }
}

function containsRequiredUrl(text, requiredUrl) {
  const normalizedRequired = normalizeUrl(requiredUrl);
  if (text.includes(requiredUrl) || text.includes(normalizedRequired)) return true;
  return text.includes("sec.check24.de/package-audit") && text.includes("slug=power");
}

function analyzeEvidence(files, requiredUrl) {
  const explicitFailures = [];
  const successes = [];
  const inspected = [];

  for (const file of files.filter((entry) => looksLikeSyncEvidence(entry.path))) {
    let text = "";
    try {
      text = readFileSync(file.path, "utf8");
    } catch {
      continue;
    }

    if (!text.includes("package-audit") && !text.includes("PACKAGE_AUDIT")) {
      continue;
    }

    const hasUrl = containsRequiredUrl(text, requiredUrl);
    const hasSuccess =
      /PACKAGE_AUDIT_SYNC\s*=\s*success/i.test(text) ||
      /Package-audit Chrome sync:\s*success/i.test(text) ||
      /Package-audit Chrome sync:\s*authenticated/i.test(text) ||
      /Check Package-audit Chrome sync:\s*authenticated/i.test(text);
    const hasAuthEvidence =
      /title\s*=\s*CHECK24 Security/i.test(text) ||
      /title [`'"]?CHECK24 Security[`'"]?/i.test(text) ||
      /CHECK24 Security/i.test(text) ||
      /authenticated existing tab/i.test(text);
    const hasFailure =
      /Package-audit Chrome sync:\s*(blocked|failed|not attempted|unavailable)/i.test(text) ||
      /PACKAGE_AUDIT_SYNC\s*=\s*(failed|blocked|missing|unavailable)/i.test(text) ||
      /Existing Google Chrome .*unavailable/i.test(text) ||
      /cannot be inspected or navigated/i.test(text);

    inspected.push({
      path: file.path,
      hasUrl,
      hasSuccess,
      hasAuthEvidence,
      hasFailure,
      mtimeMs: file.mtimeMs,
    });

    if (hasFailure && hasUrl) {
      explicitFailures.push(file.path);
    }

    if (hasUrl && hasSuccess && hasAuthEvidence) {
      successes.push(file);
    }
  }

  return { explicitFailures, successes, inspected };
}

function formatResult(result, asJson) {
  if (asJson) {
    return JSON.stringify(result, null, 2);
  }

  const evidence = result.evidencePath ? ` evidence=${result.evidencePath}` : "";
  const next = result.nextAction ? ` next="${result.nextAction}"` : "";
  return `PACKAGE_AUDIT_PREFLIGHT=${result.status} step=${result.step} reason="${result.reason}"${evidence}${next}`;
}

function finish(result, stateFile, asJson) {
  if (stateFile) {
    writeFileSync(stateFile, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  }
  console.log(formatResult(result, asJson));
  process.exit(result.exitCode);
}

let args;
try {
  args = parseArgs(process.argv.slice(2));
} catch (error) {
  console.error(error.message);
  console.error(usage());
  process.exit(EXIT.usage);
}

if (args.help) {
  console.log(usage());
  process.exit(EXIT.ok);
}

if (!args.evidenceDir || !Number.isFinite(args.maxAgeMinutes) || args.maxAgeMinutes < 0) {
  console.error(usage());
  process.exit(EXIT.usage);
}

const now = Date.now();
const baseResult = {
  verifier: "verify-package-audit-preflight",
  step: "2.1",
  requiredUrl: args.url,
  checkedAtUtc: new Date(now).toISOString(),
};

if (!existsSync(args.evidenceDir) || !statSync(args.evidenceDir).isDirectory()) {
  finish(
    {
      ...baseResult,
      status: "blocked",
      exitCode: EXIT.missing,
      reason: "run evidence directory is missing",
      evidenceDir: args.evidenceDir,
      nextAction:
        "Open/sync package-audit in the existing authenticated Chrome tab, write sync evidence, then rerun this verifier.",
    },
    args.stateFile,
    args.json,
  );
}

const files = listFiles(args.evidenceDir);
const { explicitFailures, successes, inspected } = analyzeEvidence(files, args.url);

if (explicitFailures.length > 0) {
  finish(
    {
      ...baseResult,
      status: "blocked",
      exitCode: EXIT.explicitFailure,
      reason: "package-audit Chrome sync evidence contains an explicit failure",
      evidenceDir: args.evidenceDir,
      evidencePath: explicitFailures[0],
      inspectedCount: inspected.length,
      nextAction:
        "Stop before PR/Jira/repository work; restore access to the existing authenticated Chrome package-audit tab and rerun the sync gate.",
    },
    args.stateFile,
    args.json,
  );
}

if (successes.length === 0) {
  finish(
    {
      ...baseResult,
      status: "blocked",
      exitCode: EXIT.missing,
      reason: "no run-scoped package-audit Chrome sync success evidence was found",
      evidenceDir: args.evidenceDir,
      inspectedCount: inspected.length,
      nextAction:
        "Run step 2.1 against the required package-audit URL in existing Chrome and record PACKAGE_AUDIT_SYNC=success before continuing.",
    },
    args.stateFile,
    args.json,
  );
}

const newestSuccess = successes.reduce((newest, current) =>
  current.mtimeMs > newest.mtimeMs ? current : newest,
);
const ageMinutes = (now - newestSuccess.mtimeMs) / 60000;

if (ageMinutes > args.maxAgeMinutes) {
  finish(
    {
      ...baseResult,
      status: "blocked",
      exitCode: EXIT.stale,
      reason: `package-audit sync evidence is stale (${ageMinutes.toFixed(1)} minutes old)`,
      evidenceDir: args.evidenceDir,
      evidencePath: newestSuccess.path,
      maxAgeMinutes: args.maxAgeMinutes,
      nextAction:
        "Refresh package-audit in the existing authenticated Chrome tab and record new sync evidence before continuing.",
    },
    args.stateFile,
    args.json,
  );
}

finish(
  {
    ...baseResult,
    status: "success",
    exitCode: EXIT.ok,
    reason: "fresh package-audit Chrome sync success evidence found",
    evidenceDir: args.evidenceDir,
    evidencePath: newestSuccess.path,
    ageMinutes: Number(ageMinutes.toFixed(1)),
    inspectedCount: inspected.length,
    nextAction: "Continue to Jira and Bitbucket sync gate checks.",
  },
  args.stateFile,
  args.json,
);
