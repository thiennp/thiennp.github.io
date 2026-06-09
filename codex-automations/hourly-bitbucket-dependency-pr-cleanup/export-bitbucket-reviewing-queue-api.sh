#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/lib/atlassian-api.sh"

OUTPUT_PATH="${1:-codex-automations/hourly-bitbucket-dependency-pr-cleanup/state/bitbucket-reviewing-queue.json}"
STATE_FILTER="${STATE_FILTER:-OPEN}"
REVIEWING_USER="${REVIEWING_USER:-}"

atlassian_require_cmds curl jq
atlassian_load_env
atlassian_setup_bitbucket_auth

mkdir -p "$(dirname "$OUTPUT_PATH")"

user_json="$(atlassian_http_json BITBUCKET_AUTH_ARGS "${BITBUCKET_API_BASE}/user")"
user_uuid="$(jq -r '.uuid // empty' <<<"$user_json")"
user_account_id="$(jq -r '.account_id // empty' <<<"$user_json")"
user_nickname="$(jq -r '.nickname // empty' <<<"$user_json")"
user_display_name="$(jq -r '.display_name // empty' <<<"$user_json")"

if [[ -n "$REVIEWING_USER" ]]; then
  target_user="$REVIEWING_USER"
elif [[ -n "$user_nickname" ]]; then
  target_user="$user_nickname"
else
  target_user="$user_account_id"
fi

repos_url="${BITBUCKET_API_BASE}/repositories/$(atlassian_urlencode "$BITBUCKET_WORKSPACE")?pagelen=100&fields=values.slug,values.full_name,next"
repos_json="$(atlassian_paginated_values BITBUCKET_AUTH_ARGS "$repos_url")"

tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT
: > "$tmp_dir/prs.ndjson"

while IFS= read -r repo_json || [[ -n "$repo_json" ]]; do
  repo_slug="$(jq -r '.slug' <<<"$repo_json")"
  [[ -n "$repo_slug" && "$repo_slug" != "null" ]] || continue

  prs_url="${BITBUCKET_API_BASE}/repositories/$(atlassian_urlencode "$BITBUCKET_WORKSPACE")/$(atlassian_urlencode "$repo_slug")/pullrequests?state=$(atlassian_urlencode "$STATE_FILTER")&pagelen=50&fields=values.id,values.title,values.state,values.author.display_name,values.author.nickname,values.author.account_id,values.created_on,values.updated_on,values.comment_count,values.task_count,values.links.html.href,values.source.branch.name,values.destination.branch.name,values.reviewers.account_id,values.reviewers.uuid,values.reviewers.display_name,values.participants.role,values.participants.user.account_id,values.participants.user.uuid,values.participants.approved,next"
  repo_prs="$(atlassian_paginated_values BITBUCKET_AUTH_ARGS "$prs_url")"

  jq -c \
    --arg workspace "$BITBUCKET_WORKSPACE" \
    --arg repo "$repo_slug" \
    --arg user_uuid "$user_uuid" \
    --arg user_account_id "$user_account_id" \
    '
      .[]
      | select(
          ((.reviewers // []) | any((.uuid // "") == $user_uuid or (.account_id // "") == $user_account_id))
          or
          ((.participants // []) | any(.role == "REVIEWER" and (((.user.uuid // "") == $user_uuid) or ((.user.account_id // "") == $user_account_id))))
        )
      | {
          id,
          title,
          link: .links.html.href,
          workspace: $workspace,
          repo: $repo,
          status: .state,
          author: (.author.display_name // .author.nickname // .author.account_id),
          queue_age: null,
          source_branch: .source.branch.name,
          destination_branch: .destination.branch.name,
          created: .created_on,
          created_at: .created_on,
          updated_on: .updated_on,
          activity: null,
          comment_count: (.comment_count // 0),
          task_count: (.task_count // 0)
        }
    ' <<<"$repo_prs" >> "$tmp_dir/prs.ndjson"
done < <(jq -c '.[]' <<<"$repos_json")

if [[ ! -s "$tmp_dir/prs.ndjson" ]]; then
  jq -n \
    --arg source "bitbucket-api" \
    --arg source_url "${BITBUCKET_API_BASE}/repositories/${BITBUCKET_WORKSPACE}" \
    --arg fetched_at "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" \
    --arg workspace "$BITBUCKET_WORKSPACE" \
    --arg user_display_name "$user_display_name" \
    --arg user_nickname "$user_nickname" \
    --arg user_uuid "$user_uuid" \
    '{
      source: $source,
      source_url: $source_url,
      fetched_at: $fetched_at,
      workspace: $workspace,
      current_user: {
        display_name: $user_display_name,
        nickname: $user_nickname,
        uuid: $user_uuid
      },
      count: 0,
      pull_requests: []
    }' > "$OUTPUT_PATH"
  printf 'Wrote %s (0 PRs)\n' "$OUTPUT_PATH"
  exit 0
fi

jq -s \
  --arg source "bitbucket-api" \
  --arg source_url "${BITBUCKET_API_BASE}/repositories/${BITBUCKET_WORKSPACE}" \
  --arg fetched_at "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" \
  --arg workspace "$BITBUCKET_WORKSPACE" \
  --arg user_display_name "$user_display_name" \
  --arg user_nickname "$user_nickname" \
  --arg user_uuid "$user_uuid" \
  '
    sort_by(.updated_on // .created_at // "") | reverse
    | {
        source: $source,
        source_url: $source_url,
        fetched_at: $fetched_at,
        workspace: $workspace,
        current_user: {
          display_name: $user_display_name,
          nickname: $user_nickname,
          uuid: $user_uuid
        },
        count: length,
        pull_requests: .
      }
  ' "$tmp_dir/prs.ndjson" > "$OUTPUT_PATH"

printf 'Wrote %s (%s PRs)\n' "$OUTPUT_PATH" "$(jq -r '.count' "$OUTPUT_PATH")"
