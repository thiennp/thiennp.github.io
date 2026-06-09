#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/lib/atlassian-api.sh"

INPUT_PATH="${1:-codex-automations/hourly-bitbucket-dependency-pr-cleanup/state/bitbucket-reviewing-queue.json}"
OUTPUT_PATH="${2:-codex-automations/hourly-bitbucket-dependency-pr-cleanup/state/bitbucket-pr-details.json}"

if [[ ! -f "$INPUT_PATH" ]]; then
  printf 'Input queue JSON not found: %s\n' "$INPUT_PATH" >&2
  exit 1
fi

atlassian_require_cmds curl jq
atlassian_load_env
atlassian_setup_bitbucket_auth

mkdir -p "$(dirname "$OUTPUT_PATH")"

tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

jq -c '.pull_requests[]' "$INPUT_PATH" > "$tmp_dir/queue.ndjson"
if [[ ! -s "$tmp_dir/queue.ndjson" ]]; then
  printf 'Input queue JSON contains no pull requests: %s\n' "$INPUT_PATH" >&2
  exit 1
fi

: > "$tmp_dir/details.ndjson"

while IFS= read -r pr_json || [[ -n "$pr_json" ]]; do
  workspace="$(jq -r '.workspace' <<<"$pr_json")"
  repo="$(jq -r '.repo' <<<"$pr_json")"
  pr_id="$(jq -r '.id' <<<"$pr_json")"

  encoded_workspace="$(atlassian_urlencode "$workspace")"
  encoded_repo="$(atlassian_urlencode "$repo")"
  encoded_pr_id="$(atlassian_urlencode "$pr_id")"
  pr_base="${BITBUCKET_API_BASE}/repositories/${encoded_workspace}/${encoded_repo}/pullrequests/${encoded_pr_id}"

  details_json="$(atlassian_http_json BITBUCKET_AUTH_ARGS "${pr_base}?fields=id,title,state,author.display_name,author.nickname,author.account_id,summary.raw,created_on,updated_on,comment_count,task_count,draft,queued,source.branch.name,source.commit.hash,destination.branch.name,reviewers.display_name,reviewers.uuid,reviewers.account_id,participants.role,participants.approved,participants.user.display_name,participants.user.uuid,participants.user.account_id,links.html.href,links.commits.href,links.diff.href,links.activity.href")"
  commits_json="$(atlassian_paginated_values BITBUCKET_AUTH_ARGS "${pr_base}/commits?pagelen=100&fields=values.hash,values.message,next")"
  comments_json="$(atlassian_paginated_values BITBUCKET_AUTH_ARGS "${pr_base}/comments?pagelen=50&sort=-created_on&fields=values.user.display_name,values.user.nickname,values.content.raw,values.inline.path,values.created_on,next")"
  activity_payload="$(atlassian_http_json_optional BITBUCKET_AUTH_ARGS "${pr_base}/activity?pagelen=50&fields=values.approval.user.display_name,values.approval.date,values.comment.user.display_name,values.comment.content.raw,values.comment.inline.path,values.comment.created_on,values.update.date,values.update.author.display_name,values.update.description,values.changes.requested.date,values.changes.requested.user.display_name,values.changes.requested.comment.raw,next" || true)"
  diffstat_payload="$(atlassian_http_json_optional BITBUCKET_AUTH_ARGS "${pr_base}/diffstat?pagelen=100&fields=values.old.path,values.new.path,next" || true)"

  activity_preview="$(
    jq -rn \
      --argjson activity "${activity_payload:-{}}" \
      --argjson comments "$comments_json" '
        def activity_line:
          if .approval then
            ((.approval.user.display_name // "Unknown") + " approved on " + (.approval.date // "unknown date"))
          elif .changes.requested then
            ((.changes.requested.user.display_name // "Unknown") + " requested changes on " + (.changes.requested.date // "unknown date"))
          elif .comment then
            ((.comment.user.display_name // "Unknown") + ": " + ((.comment.content.raw // "") | gsub("\\s+"; " ") | .[0:220]))
          elif .update then
            ((.update.author.display_name // "Unknown") + " updated the pull request on " + (.update.date // "unknown date"))
          else
            empty
          end;

        (
          [
            (($activity.values // [])[] | activity_line),
            (($comments[0:10])[] | ((.user.display_name // .user.nickname // "Unknown") + ": " + ((.content.raw // "") | gsub("\\s+"; " ") | .[0:220])))
          ]
          | map(select(length > 0))
          | unique
          | .[0:20]
          | join("\n")
        )
      '
  )"

  files_changed_count="$(
    jq -rn --argjson diffstat "${diffstat_payload:-{}}" '
      if ($diffstat | type) == "object" and ($diffstat | has("values")) then
        (($diffstat.values // []) | length)
      else
        null
      end
    '
  )"

  record_json="$(
    jq -n \
      --argjson queue "$pr_json" \
      --argjson details "$details_json" \
      --argjson commits "$commits_json" \
      --argjson comments "$comments_json" \
      --arg activity_preview "$activity_preview" \
      --argjson files_changed_count "${files_changed_count:-null}" '
      $queue + {
        page_title: $details.title,
        page_url: ($details.links.html.href // $queue.link),
        title: $details.title,
        status: $details.state,
        created_at: $details.created_on,
        last_updated_at: $details.updated_on,
        source_branch: $details.source.branch.name,
        destination_branch: $details.destination.branch.name,
        description: ($details.summary.raw // null),
        files_changed_count: $files_changed_count,
        commits_count: ($commits | length),
        builds_summary: null,
        checks_summary: null,
        reviewers_count: (($details.reviewers // []) | length),
        tasks_count: ($details.task_count // 0),
        jira_work_items_count: null,
        overview_link: ($details.links.html.href // $queue.link),
        diff_link: ($details.links.diff.href // null),
        commits_link: ($details.links.commits.href // null),
        activity_preview: $activity_preview,
        latest_comments: (
          $comments[0:10]
          | map({
              author: (.user.display_name // .user.nickname // "Unknown"),
              created_on,
              path: (.inline.path // null),
              text: (.content.raw // null)
            })
        ),
        participants: (
          ($details.participants // [])
          | map({
              user: (.user.display_name // .user.account_id // .user.uuid),
              role,
              approved: (.approved // false)
            })
        ),
        source_commit_hash: ($details.source.commit.hash // null),
        draft: ($details.draft // false),
        queued: ($details.queued // false)
      }'
  )"

  printf '%s\n' "$record_json" >> "$tmp_dir/details.ndjson"
done < "$tmp_dir/queue.ndjson"

jq -s \
  --arg source_file "$INPUT_PATH" \
  --arg fetched_at "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" \
  '{
    source_file: $source_file,
    fetched_at: $fetched_at,
    count: length,
    pull_requests: .
  }' "$tmp_dir/details.ndjson" > "$OUTPUT_PATH"

printf 'Wrote %s (%s PRs)\n' "$OUTPUT_PATH" "$(jq -r '.count' "$OUTPUT_PATH")"
