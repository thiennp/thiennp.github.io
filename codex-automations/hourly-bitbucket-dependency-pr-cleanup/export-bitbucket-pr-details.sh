#!/usr/bin/env zsh

set -euo pipefail

INPUT_PATH="${1:-codex-automations/hourly-bitbucket-dependency-pr-cleanup/state/bitbucket-reviewing-queue.json}"
OUTPUT_PATH="${2:-codex-automations/hourly-bitbucket-dependency-pr-cleanup/state/bitbucket-pr-details.json}"
WAIT_SECONDS="${WAIT_SECONDS:-8}"

if [[ ! -f "$INPUT_PATH" ]]; then
  echo "Input queue JSON not found: $INPUT_PATH" >&2
  exit 1
fi

mkdir -p "$(dirname "$OUTPUT_PATH")"

run_jxa_file() {
  local script_path="$1"
  osascript -l JavaScript "$script_path"
}

tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

jq -c '.pull_requests[]' "$INPUT_PATH" > "$tmp_dir/queue.ndjson"

if [[ ! -s "$tmp_dir/queue.ndjson" ]]; then
  echo "Input queue JSON contains no pull requests: $INPUT_PATH" >&2
  exit 1
fi

: > "$tmp_dir/details.ndjson"

count=0

while IFS= read -r pr_json || [[ -n "$pr_json" ]]; do
  link="$(jq -r '.link' <<<"$pr_json")"
  details_json=""
  extractor='(function(){function clean(text){return (text||"").replace(/\u00a0/g," ").replace(/\r/g,"").trim();} function matchText(text, pattern){var m = text.match(pattern); return m ? clean(m[1]) : null;} function findTabLink(label, hrefPattern){var links = Array.from(document.querySelectorAll("a[href]")); return links.find(function(a){return clean(a.innerText).startsWith(label) && hrefPattern.test(a.href);}) || null;} function countFromTabLink(label, hrefPattern){var hit = findTabLink(label, hrefPattern); if(!hit){return null;} var value = clean(hit.innerText).replace(label,"").trim(); var m = value.match(/^(\d+)/); return m ? Number(m[1]) : null;} function headingSummary(pattern){var headings = Array.from(document.querySelectorAll("h1,h2,h3,[role=\"heading\"]")).map(function(el){return clean(el.innerText);}).filter(Boolean); var hit = headings.find(function(text){return pattern.test(text);}); if(!hit){return null;} var m = hit.match(/^(\d+)/); return m ? Number(m[1]) : hit;} var bodyText = clean(document.body ? document.body.innerText : ""); var titleEl = document.querySelector("h1"); var title = clean(titleEl ? titleEl.innerText : document.title.replace(/\s+—\s+Bitbucket$/,"")); var status = matchText(bodyText, /\n(OPEN|MERGED|DECLINED|SUPERSEDED)\n/) || null; var prMeta = bodyText.match(/#(\d+)\s+•\s+Created\s+(.+?)\s+•\s+Last updated\s+(.+?)(?:\n|$)/); var sourceBranch = matchText(bodyText, /Branch:\s*([^\n]+)\n[^\n]*\nBranch:/); var destinationBranch = matchText(bodyText, /Branch:\s*[^\n]+\n[^\n]*\nBranch:\s*([^\n]+)/); var descriptionMatch = bodyText.match(/\nDescription\n([\s\S]*?)(?:\n\d+ attachments\n|\n0 attachments\n|\nActivity\n)/); var activityMatch = bodyText.match(/\nActivity\n([\s\S]*)$/); var checksHeading = headingSummary(/checks passed/i); var buildsHeading = headingSummary(/build passed/i); var reviewersHeading = headingSummary(/reviewers?$/i); var tasksHeading = headingSummary(/tasks?$/i); var jiraHeading = headingSummary(/Jira work items?$/i); var activityPreview = null; if(activityMatch){activityPreview = clean(activityMatch[1].split("\n").slice(0, 40).join("\n"));} var overviewLink = findTabLink("Overview", /\/pull-requests\/\d+\/overview$/); var diffLink = findTabLink("Files changed", /\/pull-requests\/\d+\/diff/); var commitsLink = findTabLink("Commits", /\/pull-requests\/\d+\/commits$/); return JSON.stringify({page_title: document.title, page_url: location.href, title: title, status: status, created_at: prMeta ? clean(prMeta[2]) : null, last_updated_at: prMeta ? clean(prMeta[3]) : null, source_branch: sourceBranch, destination_branch: destinationBranch, description: descriptionMatch ? clean(descriptionMatch[1]) : null, files_changed_count: countFromTabLink("Files changed", /\/pull-requests\/\d+\/diff/), commits_count: countFromTabLink("Commits", /\/pull-requests\/\d+\/commits$/), builds_summary: buildsHeading, checks_summary: checksHeading, reviewers_count: typeof reviewersHeading === "number" ? reviewersHeading : null, tasks_count: typeof tasksHeading === "number" ? tasksHeading : null, jira_work_items_count: typeof jiraHeading === "number" ? jiraHeading : null, overview_link: overviewLink ? overviewLink.href : null, diff_link: diffLink ? diffLink.href : null, commits_link: commitsLink ? commitsLink.href : null, activity_preview: activityPreview, fetched_at: new Date().toISOString()});})();'
  extractor_json="$(jq -Rn --arg v "$extractor" '$v')"
  for attempt in 1 2 3; do
    tmp_json="$tmp_dir/pr-details.json"
    link_json="$(jq -Rn --arg v "$link" '$v')"
    nav_script="$tmp_dir/pr-nav.jxa"
    extract_script="$tmp_dir/pr-extract.jxa"
    cat > "$nav_script" <<JXA
const chrome = Application("Google Chrome");
const windows = chrome.windows();
if (windows.length === 0) {
  throw new Error("Google Chrome has no open windows.");
}
const link = $link_json;
const tab = chrome.windows[0].activeTab();
tab.url = link;
JXA
    run_jxa_file "$nav_script" >/dev/null
    sleep "$WAIT_SECONDS"
    cat > "$extract_script" <<JXA
const chrome = Application("Google Chrome");
const windows = chrome.windows();
if (windows.length === 0) {
  throw new Error("Google Chrome has no open windows.");
}
const tab = chrome.windows[0].activeTab();
const extractor = $extractor_json;
tab.execute({ javascript: extractor });
JXA
    run_jxa_file "$extract_script" > "$tmp_json"

    details_json="$(cat "$tmp_json")"

    extracted_url="$(jq -r '.page_url // ""' <<<"$details_json")"
    extracted_title="$(jq -r '.title // ""' <<<"$details_json")"

    if [[ "$extracted_url" == "$link" && -n "$extracted_title" && "$extracted_title" != "Launching CHECK24" ]]; then
      break
    fi

    if [[ "$attempt" -eq 3 ]]; then
      echo "Could not extract expected PR page for $link (got $extracted_url / $extracted_title)" >&2
      exit 1
    fi

    sleep 2
  done

  jq -n \
    --argjson queue "$pr_json" \
    --argjson details "$details_json" \
    '$queue + $details' >> "$tmp_dir/details.ndjson"

  count=$((count + 1))
  printf 'Extracted %s\n' "$link" >&2
done < "$tmp_dir/queue.ndjson"

if [[ ! -s "$tmp_dir/details.ndjson" ]]; then
  echo "PR detail export did not extract any pull-request records." >&2
  exit 1
fi

jq -s \
  --arg source_file "$INPUT_PATH" \
  --arg fetched_at "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" \
  '{
    source_file: $source_file,
    fetched_at: $fetched_at,
    count: length,
    pull_requests: .
  }' "$tmp_dir/details.ndjson" > "$OUTPUT_PATH"

printf 'Wrote %s (%s PRs)\n' "$OUTPUT_PATH" "$count"
