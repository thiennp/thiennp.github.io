import { readFile } from "node:fs/promises";
import path from "node:path";

const STATE_DIR = path.resolve(process.cwd(), "..", "state");
const HANDOFF_PATH = path.join(STATE_DIR, "agent-handoff.json");
const MEMORY_PATH = "/Users/thiennguyen/.codex/automations/hourly-bitbucket-dependency-pr-cleanup/memory.md";

const APPROVED_FROM_MEMORY = new Set([
  "check24/enrg-web-frontend#1093",
  "check24/enrg-energycenter-rev#1437",
  "check24/enrg-chatty#45",
  "check24/enrg-chatty#48"
]);

const PREFERRED_CHECKING_ORDER = [
  "check24/enrg-web-frontend#1092",
  "check24/enrg-web-frontend#1099",
  "check24/enrg-web-frontend#1076",
  "check24/enrg-energycenter-rev#1446"
];

function getActivityText(item) {
  return item?.summaries?.pr_activity_excerpt || "";
}

function inferWorkflowStatus(item) {
  const activity = getActivityText(item);

  if (APPROVED_FROM_MEMORY.has(item.handoff_id) || /Thien Nguyen\s*\nAPPROVED/i.test(activity)) {
    return "approved";
  }

  if (/-- Thien's Agent --/i.test(activity) || (/changes requested/i.test(activity) && !/no changes requested/i.test(activity))) {
    return "change requested";
  }

  return "will check";
}

function findCheckingHandoffId(items, memoryText) {
  const explicitMatch = memoryText.match(/Next to work on:\s*`?([a-z0-9-]+)#(\d+)`?/i);
  if (explicitMatch) {
    return `check24/${explicitMatch[1]}#${explicitMatch[2]}`;
  }

  const fallbackMatch = memoryText.match(/Needs fresh Thien review on effective diff.*?(enrg-[a-z-]+)#(\d+)/i);
  if (fallbackMatch) {
    return `check24/${fallbackMatch[1]}#${fallbackMatch[2]}`;
  }

  for (const handoffId of PREFERRED_CHECKING_ORDER) {
    const match = items.find((item) => item.handoff_id === handoffId);
    if (match && inferWorkflowStatus(match) === "will check") {
      return handoffId;
    }
  }

  return items.find((item) => inferWorkflowStatus(item) === "will check")?.handoff_id ?? null;
}

export async function getReportData() {
  const raw = await readFile(HANDOFF_PATH, "utf8");
  const parsed = JSON.parse(raw);
  let memoryText = "";

  try {
    memoryText = await readFile(MEMORY_PATH, "utf8");
  } catch {
    memoryText = "";
  }

  const checkingHandoffId = findCheckingHandoffId(parsed.pull_requests || [], memoryText);
  const pullRequests = (parsed.pull_requests || []).map((item) => {
    const workflowStatus = item.handoff_id === checkingHandoffId ? "checking" : inferWorkflowStatus(item);

    return {
      ...item,
      ui: {
        workflowStatus,
        isChecking: workflowStatus === "checking",
        isCollapsedByDefault: workflowStatus !== "checking"
      }
    };
  });

  return {
    ...parsed,
    // Preserve the exported Bitbucket reviewing-queue order exactly.
    pull_requests: pullRequests
  };
}
