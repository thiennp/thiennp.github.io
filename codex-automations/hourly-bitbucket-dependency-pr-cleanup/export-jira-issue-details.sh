#!/usr/bin/env zsh

set -euo pipefail

INPUT="${1:-PRE-3810}"
WAIT_SECONDS="${WAIT_SECONDS:-10}"

if [[ "$INPUT" =~ ^https?:// ]]; then
  ISSUE_URL="$INPUT"
  ISSUE_KEY="${INPUT##*/}"
else
  ISSUE_KEY="$INPUT"
  ISSUE_URL="https://c24-energie.atlassian.net/browse/${ISSUE_KEY}"
fi

OUTPUT_PATH="${2:-codex-automations/hourly-bitbucket-dependency-pr-cleanup/state/jira-${ISSUE_KEY}.json}"
mkdir -p "$(dirname "$OUTPUT_PATH")"

run_jxa_file() {
  local script_path="$1"
  osascript -l JavaScript "$script_path"
}

details_json=""
extractor='(function(){function clean(text){return (text||"").replace(/\u00a0/g," ").replace(/\r/g,"").trim();} function txt(sel){var el=document.querySelector(sel); return el?clean(el.innerText):null;} function attr(sel,name){var el=document.querySelector(sel); return el?el.getAttribute(name):null;} function parseDateBlock(sel,prefix){var text=txt(sel); if(!text) return null; var re=new RegExp("^"+prefix+"\\s+(.+)$"); var m=text.match(re); return m?clean(m[1]):text;} function bodySection(startLabel,endLabels){var body=clean(document.body?document.body.innerText:""); var start=body.indexOf(startLabel); if(start===-1) return null; var after=body.slice(start + startLabel.length); var end=after.length; endLabels.forEach(function(label){var idx=after.indexOf(label); if(idx!==-1 && idx<end) end=idx;}); return clean(after.slice(0,end));} function summaryStat(sel){var text=txt(sel); if(!text) return null; var lines=text.split("\n").map(clean).filter(Boolean); return {raw:text,count:(lines[0]&&/^\d+$/.test(lines[0]))?Number(lines[0]):null,label:lines[1]||null,status:lines[2]||null,age:lines[2]&&/ago$/.test(lines[2])?lines[2]:lines[3]||null};} var body=clean(document.body?document.body.innerText:""); var permissionMessage=null; if(/We can.t show this project\./i.test(body)&&/don.t have permission to view it, or it doesn.t exist\./i.test(body)){permissionMessage="You do not have permission to view this Jira project or it does not exist.";} var issueKey=txt("[data-testid=\"issue.views.issue-base.foundation.breadcrumbs.current-issue.item\"]"); var title=txt("h1[data-testid=\"issue.views.issue-base.foundation.summary.heading\"]") || txt("h1"); var issueTypeLabel=attr("[data-testid=\"issue.views.issue-base.foundation.change-issue-type.button\"]","aria-label"); var issueType=issueTypeLabel ? clean(issueTypeLabel.replace(/\s*-\s*Change work type$/,"")) : null; var status=txt("[data-testid=\"issue-field-status.ui.status-view.status-button.status-button\"]"); var project=txt("[data-testid=\"issue.views.issue-base.foundation.breadcrumbs.project.item\"]"); var assignee=txt("[data-testid=\"issue.views.field.user.assignee\"]"); if(assignee){assignee=clean(assignee.replace(/\nAssign to me$/,""));} var reporter=txt("[data-testid=\"issue.views.field.user.reporter\"]"); var priority=txt("[data-testid=\"issue.issue-view-layout.issue-view-priority-field.priority\"]"); if(priority){priority=clean(priority.replace(/^Priority\n/,""));} var labels=txt("[data-testid=\"issue.views.issue-base.context.labels\"]"); if(labels){labels=clean(labels.replace(/^Labels\n/,""));} var description=txt("[data-testid=\"issue.views.field.rich-text.description\"]"); var createdAt=parseDateBlock("[data-testid=\"created-date.ui.read.meta-date\"]","Created"); var updatedAt=parseDateBlock("[data-testid=\"updated-date.ui.read.meta-date\"]","Updated"); var commits=summaryStat("[data-testid=\"development-summary-commit.ui.summary-item\"]"); var pullRequests=summaryStat("[data-testid=\"development-summary-pull-request.ui.summary-item\"]"); var childSection=bodySection("Child work items",["Collapse Linked work items","Linked work items","Confluence content","Activity","Details"]); var linkedSection=bodySection("Linked work items",["Confluence content","Activity","Details"]); var activityPreview=bodySection("Activity",["Details","Development","More fields","Automation","Sentry","Atlassian project"]); if(activityPreview){activityPreview=clean(activityPreview.split("\n").slice(0,40).join("\n"));} return JSON.stringify({issue_key:issueKey,title:title,issue_type:issueType,status:status,project:project,page_title:document.title,page_url:location.href,assignee:assignee,reporter:reporter,priority:priority,labels:labels,description:description,created_at:createdAt,updated_at:updatedAt,development_commits:commits,development_pull_requests:pullRequests,child_work_items_preview:childSection,linked_work_items_preview:linkedSection,activity_preview:activityPreview,permission_message:permissionMessage,body_preview:body ? body.slice(0,500) : null,fetched_at:new Date().toISOString()});})();'
for attempt in 1 2 3; do
  tmp_json="$(mktemp)"
  nav_script="$(mktemp)"
  extract_script="$(mktemp)"
  trap 'rm -f "$tmp_json" "$nav_script" "$extract_script"' EXIT
  issue_url_json="$(jq -Rn --arg v "$ISSUE_URL" '$v')"
  extractor_json="$(jq -Rn --arg v "$extractor" '$v')"
  cat > "$nav_script" <<JXA
const chrome = Application("Google Chrome");
const windows = chrome.windows();
if (windows.length === 0) {
  throw new Error("Google Chrome has no open windows.");
}
const issueUrl = $issue_url_json;
const frontWindow = chrome.windows.whose({ index: 1 })[0];
const tab = frontWindow.activeTab();
tab.url = issueUrl;
JXA
  run_jxa_file "$nav_script" >/dev/null
  sleep "$WAIT_SECONDS"
  cat > "$extract_script" <<JXA
const chrome = Application("Google Chrome");
const windows = chrome.windows();
if (windows.length === 0) {
  throw new Error("Google Chrome has no open windows.");
}
const frontWindow = chrome.windows.whose({ index: 1 })[0];
const tab = frontWindow.activeTab();
const extractor = $extractor_json;
tab.execute({ javascript: extractor });
JXA
  run_jxa_file "$extract_script" > "$tmp_json"

  details_json="$(cat "$tmp_json")"

  extracted_url="$(jq -r '.page_url // ""' <<<"$details_json")"
  extracted_key="$(jq -r '.issue_key // ""' <<<"$details_json")"
  extracted_title="$(jq -r '.title // ""' <<<"$details_json")"
  permission_message="$(jq -r '.permission_message // ""' <<<"$details_json")"

  if [[ -n "$permission_message" ]]; then
    echo "Jira page for $ISSUE_KEY is visible in Chrome, but access is blocked: $permission_message" >&2
    exit 1
  fi

  if [[ "$extracted_url" == "$ISSUE_URL" && "$extracted_key" == "$ISSUE_KEY" && -n "$extracted_title" ]]; then
    break
  fi

  if [[ "$attempt" -eq 3 ]]; then
    echo "Could not extract expected Jira issue page for $ISSUE_URL (got $extracted_url / $extracted_key / $extracted_title)" >&2
    exit 1
  fi

  sleep 2
done

if [[ -z "$details_json" ]]; then
  echo "Chrome returned an empty Jira issue payload for $ISSUE_KEY." >&2
  exit 1
fi

printf '%s\n' "$details_json" | jq '.' > "$OUTPUT_PATH"

if [[ ! -s "$OUTPUT_PATH" ]]; then
  echo "Jira export produced an empty output file: $OUTPUT_PATH" >&2
  exit 1
fi

printf 'Wrote %s\n' "$OUTPUT_PATH"
