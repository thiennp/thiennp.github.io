#!/usr/bin/env zsh

set -euo pipefail

TARGET_URL="${TARGET_URL:-https://bitbucket.org/check24/workspace/pull-requests/?user_filter=REVIEWING}"
WAIT_SECONDS="${WAIT_SECONDS:-8}"
OUTPUT_PATH="${1:-codex-automations/hourly-bitbucket-dependency-pr-cleanup/state/bitbucket-reviewing-queue.json}"

mkdir -p "$(dirname "$OUTPUT_PATH")"

run_jxa_file() {
  local script_path="$1"
  osascript -l JavaScript "$script_path"
}

extractor='(function(){var rows=Array.from(document.querySelectorAll('"'"'tbody tr'"'"'));var items=rows.map(function(row){var link=Array.from(row.querySelectorAll('"'"'a[href*="/pull-requests/"]'"'"')).find(function(a){return /\/pull-requests\/\d+$/.test(a.href)&&a.innerText.trim();});if(!link){return null;}var cells=Array.from(row.querySelectorAll('"'"'td'"'"'));var summaryText=(cells[0]&&cells[0].innerText)||"";var summaryLines=summaryText.split("\n").map(function(line){return line.trim();}).filter(Boolean);var created=(cells[1]&&cells[1].innerText||"").trim()||null;var activityText=(cells[2]&&cells[2].innerText||"").trim()||null;var href=link.href;var match=href.match(/bitbucket\.org\/([^/]+)\/([^/]+)\/pull-requests\/(\d+)$/);if(!match){return null;}var workspace=match[1];var repo=match[2];var id=Number(match[3]);var title=link.innerText.trim();var author=null;var queueAge=null;var sourceBranch=null;var destinationBranch=null;var metaLine=summaryLines.find(function(line){return line.indexOf(" - #" + id + ", ") !== -1 && line.indexOf(" in " + repo) !== -1;})||null;if(metaLine){var metaMatch=metaLine.match(/^(.*?) - #\d+, (.*?) in (.+)$/);if(metaMatch){author=metaMatch[1].trim();queueAge=metaMatch[2].trim();}}var branchMatches=Array.from(summaryText.matchAll(/Branch:\s*([^\n]+)/g)).map(function(branchMatch){return branchMatch[1].trim();});if(branchMatches.length>0){sourceBranch=branchMatches[0]||null;}if(branchMatches.length>1){destinationBranch=branchMatches[1]||null;}var commentCount=0;if(activityText&&activityText!=="No activity"){var commentMatch=activityText.match(/(\d+)\s+comments?/i);if(commentMatch){commentCount=Number(commentMatch[1]);}}return {id:id,title:title,link:href,workspace:workspace,repo:repo,status:summaryLines[0]||null,author:author,queue_age:queueAge,source_branch:sourceBranch,destination_branch:destinationBranch,created:created,activity:activityText,comment_count:commentCount};}).filter(Boolean);return JSON.stringify({source_url:location.href,page_title:document.title,fetched_at:new Date().toISOString(),count:items.length,pull_requests:items});})();'
target_url_json="$(jq -Rn --arg v "$TARGET_URL" '$v')"
extractor_json="$(jq -Rn --arg v "$extractor" '$v')"
tmp_json="$(mktemp)"
nav_script="$(mktemp)"
extract_script="$(mktemp)"
trap 'rm -f "$tmp_json" "$nav_script" "$extract_script"' EXIT
cat > "$nav_script" <<JXA
const chrome = Application("Google Chrome");
const windows = chrome.windows();
if (windows.length === 0) {
  throw new Error("Google Chrome has no open windows.");
}
const targetUrl = $target_url_json;
const tab = windows[0].tabs().find((candidate) => !String(candidate.url() || "").startsWith("http://127.0.0.1:3100/")) || windows[0].activeTab();
tab.url = targetUrl;
JXA
run_jxa_file "$nav_script" >/dev/null
sleep "$WAIT_SECONDS"
cat > "$extract_script" <<JXA
const chrome = Application("Google Chrome");
const tab = chrome.windows()[0].tabs().find((candidate) => !String(candidate.url() || "").startsWith("http://127.0.0.1:3100/")) || chrome.windows()[0].activeTab();
const extractor = $extractor_json;
tab.execute({ javascript: extractor });
JXA
run_jxa_file "$extract_script" > "$tmp_json"

raw_json="$(cat "$tmp_json")"

if [[ -z "$raw_json" ]]; then
  echo "Chrome returned an empty reviewing-queue payload." >&2
  exit 1
fi

jq '.' "$tmp_json" > "$OUTPUT_PATH"

if [[ ! -s "$OUTPUT_PATH" ]]; then
  echo "Reviewing-queue export produced an empty output file: $OUTPUT_PATH" >&2
  exit 1
fi

printf 'Wrote %s\n' "$OUTPUT_PATH"
