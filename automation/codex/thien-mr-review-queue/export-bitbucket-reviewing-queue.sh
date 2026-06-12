#!/usr/bin/env bash

set -euo pipefail

TARGET_URL="${TARGET_URL:-https://bitbucket.org/check24/workspace/pull-requests/?user_filter=REVIEWING}"
WAIT_SECONDS="${WAIT_SECONDS:-8}"
OUTPUT_PATH="${1:-automation/codex/thien-mr-review-queue/state/bitbucket-reviewing-queue.json}"

mkdir -p "$(dirname "$OUTPUT_PATH")"

raw_json="$(
  osascript - "$TARGET_URL" "$WAIT_SECONDS" <<'APPLESCRIPT'
on run argv
  set targetUrl to item 1 of argv
  set waitSeconds to (item 2 of argv) as number
  set extractor to "(function(){var rows=Array.from(document.querySelectorAll('tbody tr'));var items=rows.map(function(row){var link=Array.from(row.querySelectorAll('a[href*=\"/pull-requests/\"]')).find(function(a){return /\\/pull-requests\\/\\d+$/.test(a.href)&&a.innerText.trim();});if(!link){return null;}var cells=Array.from(row.querySelectorAll('td'));var summaryText=(cells[0]&&cells[0].innerText)||'';var summaryLines=summaryText.split('\\n').map(function(line){return line.trim();}).filter(Boolean);var created=(cells[1]&&cells[1].innerText||'').trim()||null;var activityText=(cells[2]&&cells[2].innerText||'').trim()||null;var href=link.href;var match=href.match(/bitbucket\\.org\\/([^/]+)\\/([^/]+)\\/pull-requests\\/(\\d+)$/);if(!match){return null;}var workspace=match[1];var repo=match[2];var id=Number(match[3]);var title=link.innerText.trim();var author=null;var queueAge=null;var sourceBranch=null;var destinationBranch=null;var metaLine=summaryLines.find(function(line){return line.indexOf(' - #' + id + ', ') !== -1 && line.indexOf(' in ' + repo) !== -1;})||null;if(metaLine){var metaMatch=metaLine.match(/^(.*?) - #\\d+, (.*?) in (.+)$/);if(metaMatch){author=metaMatch[1].trim();queueAge=metaMatch[2].trim();}}var branchMatches=Array.from(summaryText.matchAll(/Branch:\\s*([^\\n]+)/g)).map(function(branchMatch){return branchMatch[1].trim();});if(branchMatches.length>0){sourceBranch=branchMatches[0]||null;}if(branchMatches.length>1){destinationBranch=branchMatches[1]||null;}var commentCount=0;if(activityText&&activityText!=='No activity'){var commentMatch=activityText.match(/(\\d+)\\s+comments?/i);if(commentMatch){commentCount=Number(commentMatch[1]);}}return {id:id,title:title,link:href,workspace:workspace,repo:repo,status:summaryLines[0]||null,author:author,queue_age:queueAge,source_branch:sourceBranch,destination_branch:destinationBranch,created:created,activity:activityText,comment_count:commentCount};}).filter(Boolean);return JSON.stringify({source_url:location.href,page_title:document.title,fetched_at:new Date().toISOString(),count:items.length,pull_requests:items});})();"

  tell application "Google Chrome"
    if (count of windows) = 0 then make new window
    set URL of active tab of front window to targetUrl
    delay waitSeconds
    tell active tab of front window
      return execute javascript extractor
    end tell
  end tell
end run
APPLESCRIPT
)"

printf '%s\n' "$raw_json" | jq '.' > "$OUTPUT_PATH"
printf 'Wrote %s\n' "$OUTPUT_PATH"
