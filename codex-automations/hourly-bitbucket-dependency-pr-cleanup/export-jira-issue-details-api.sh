#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/lib/atlassian-api.sh"

INPUT="${1:-PRE-3810}"

if [[ "$INPUT" =~ ^https?:// ]]; then
  ISSUE_KEY="${INPUT##*/}"
else
  ISSUE_KEY="$INPUT"
fi

OUTPUT_PATH="${2:-codex-automations/hourly-bitbucket-dependency-pr-cleanup/state/jira-${ISSUE_KEY}.json}"

atlassian_require_cmds curl jq
atlassian_load_env
atlassian_setup_jira_auth

mkdir -p "$(dirname "$OUTPUT_PATH")"

issue_url="${JIRA_BASE_URL}/rest/api/3/issue/$(atlassian_urlencode "$ISSUE_KEY")?fields=summary,issuetype,status,project,assignee,reporter,priority,labels,description,created,updated,comment,issuelinks,subtasks,parent"
issue_json="$(atlassian_http_json JIRA_AUTH_ARGS "$issue_url")"

issue_page_url="${JIRA_BASE_URL}/browse/${ISSUE_KEY}"

jq -n \
  --arg issue_key "$ISSUE_KEY" \
  --arg page_url "$issue_page_url" \
  --arg fetched_at "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" \
  --argjson issue "$issue_json" '
  def textify:
    if . == null then ""
    elif type == "string" then .
    elif type == "array" then map(textify) | join("")
    elif type == "object" then
      if has("text") then .text
      elif has("content") then (.content | textify)
      else ""
      end
    else ""
    end;

  def compact($value; $max):
    if $value == null then null
    elif ($value | length) <= $max then $value
    else ($value[0:$max] + "...")
    end;

  def issue_link_text($link):
    [
      ($link.type.name // "link"),
      ($link.outwardIssue.key // $link.inwardIssue.key // null),
      ($link.outwardIssue.fields.summary // $link.inwardIssue.fields.summary // null)
    ]
    | map(select(. != null and . != ""))
    | join(": ");

  def subtask_text($subtask):
    [
      ($subtask.key // null),
      ($subtask.fields.summary // null),
      ($subtask.fields.status.name // null)
    ]
    | map(select(. != null and . != ""))
    | join(" | ");

  def comment_line($comment):
    [
      ($comment.author.displayName // "Unknown"),
      ($comment.created // null),
      (compact(($comment.body | textify | gsub("\\s+"; " ")); 220))
    ]
    | map(select(. != null and . != ""))
    | join(" - ");

  {
    issue_key: $issue_key,
    title: ($issue.fields.summary // null),
    issue_type: ($issue.fields.issuetype.name // null),
    status: ($issue.fields.status.name // null),
    project: ($issue.fields.project.key // $issue.fields.project.name // null),
    page_title: ($issue.fields.summary // null),
    page_url: $page_url,
    assignee: ($issue.fields.assignee.displayName // null),
    reporter: ($issue.fields.reporter.displayName // null),
    priority: ($issue.fields.priority.name // null),
    labels: (($issue.fields.labels // []) | join(", ")),
    description: compact(($issue.fields.description | textify | gsub("\\s+"; " ")); 4000),
    created_at: ($issue.fields.created // null),
    updated_at: ($issue.fields.updated // null),
    development_commits: null,
    development_pull_requests: null,
    child_work_items_preview: (
      ($issue.fields.subtasks // [])
      | map(subtask_text(.))
      | join("\n")
      | compact(.; 1200)
    ),
    linked_work_items_preview: (
      ($issue.fields.issuelinks // [])
      | map(issue_link_text(.))
      | join("\n")
      | compact(.; 1200)
    ),
    activity_preview: (
      ($issue.fields.comment.comments // [])
      | map(comment_line(.))
      | .[0:10]
      | join("\n")
      | compact(.; 1600)
    ),
    fetched_at: $fetched_at
  }' > "$OUTPUT_PATH"

printf 'Wrote %s\n' "$OUTPUT_PATH"
