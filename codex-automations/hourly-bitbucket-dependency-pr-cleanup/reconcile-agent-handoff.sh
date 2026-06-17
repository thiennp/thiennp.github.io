#!/usr/bin/env bash

set -euo pipefail

QUEUE_PATH="${1:-codex-automations/hourly-bitbucket-dependency-pr-cleanup/state/bitbucket-reviewing-queue.json}"
PR_DETAILS_PATH="${2:-codex-automations/hourly-bitbucket-dependency-pr-cleanup/state/bitbucket-pr-details.json}"
JIRA_DIR="${3:-codex-automations/hourly-bitbucket-dependency-pr-cleanup/state}"
OUTPUT_PATH="${4:-codex-automations/hourly-bitbucket-dependency-pr-cleanup/state/agent-handoff.json}"

for required_file in "$QUEUE_PATH" "$PR_DETAILS_PATH"; do
  if [[ ! -f "$required_file" ]]; then
    echo "Required file not found: $required_file" >&2
    exit 1
  fi
done

if [[ ! -d "$JIRA_DIR" ]]; then
  echo "Jira state directory not found: $JIRA_DIR" >&2
  exit 1
fi

mkdir -p "$(dirname "$OUTPUT_PATH")"

tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

find "$JIRA_DIR" -maxdepth 1 -type f -name 'jira-*.json' -print | sort > "$tmp_dir/jira-files.txt"

if [[ -s "$tmp_dir/jira-files.txt" ]]; then
  while IFS= read -r jira_file; do
    jq -c '.' "$jira_file"
  done < "$tmp_dir/jira-files.txt" | jq -s '.' > "$tmp_dir/jira-catalog.json"
else
  printf '[]\n' > "$tmp_dir/jira-catalog.json"
fi

jq -c '.pull_requests[]' "$PR_DETAILS_PATH" > "$tmp_dir/prs.ndjson"
: > "$tmp_dir/records.ndjson"

while IFS= read -r pr_json; do
  jira_keys="$(printf '%s\n' "$pr_json" | jq -c '
    def explicit_jira_keys:
      [(.description // "") | scan("https?://[^[:space:]]+/browse/([A-Z][A-Z0-9]+-[0-9]+)")]
      | map(.[0]);
    def branch_or_title_keys:
      [
        ((.source_branch // "") | capture("^(?<key>[A-Z][A-Z0-9]+-[0-9]+)$").key?),
        ((.title // "") | capture("(?<key>\\b[A-Z][A-Z0-9]+-[0-9]+\\b)").key?)
      ]
      | map(select(. != null));
    (explicit_jira_keys + branch_or_title_keys) | unique')"

  jira_found="$(jq -c --argjson keys "$jira_keys" '
    [ $keys[] as $key
      | .[]
      | select(.issue_key == $key)
      | {
          issue_key,
          title,
          issue_type,
          status,
          project,
          assignee,
          reporter,
          priority,
          labels,
          page_url,
          created_at,
          updated_at,
          description_excerpt: (.description // null | if . == null then null elif (length <= 1200) then . else .[0:1200] + "..." end),
          development_commits,
          development_pull_requests,
          child_work_items_preview: (.child_work_items_preview // null | if . == null then null elif (length <= 800) then . else .[0:800] + "..." end),
          linked_work_items_preview: (.linked_work_items_preview // null | if . == null then null elif (length <= 800) then . else .[0:800] + "..." end),
          activity_preview: (.activity_preview // null | if . == null then null elif (length <= 800) then . else .[0:800] + "..." end)
        }
    ]' "$tmp_dir/jira-catalog.json")"

  jira_missing="$(jq -nc --argjson keys "$jira_keys" --argjson found "$jira_found" '$keys - ($found | map(.issue_key))')"

  record_json="$(
    jq -nc \
      --argjson pr "$pr_json" \
      --argjson jira_keys "$jira_keys" \
      --argjson jira_found "$jira_found" \
      --argjson jira_missing "$jira_missing" '
      def excerpt($text; $len):
        if ($text == null) then null
        elif ($text | length) <= $len then $text
        else ($text[0:$len] + "...")
        end;

      def compact_lines($text; $count):
        if ($text == null) then null
        else
          ($text
          | split("\n")
          | map(gsub("^\\s+|\\s+$"; ""))
          | map(select(length > 0))
          | .[0:$count]
          | join("\n"))
        end;

      def recommended_focus($pr; $jira_found; $jira_missing):
        [
          if (($pr.comment_count // 0) > 0 or (($pr.activity_preview // "") | length) > 0) then
            "Review prior PR discussion and unresolved feedback before commenting."
          else empty end,
          if (($pr.files_changed_count // 0) >= 20) then
            "Large diff: prioritize changed-file hotspots and regression risk."
          else empty end,
          if (($pr.commits_count // 0) > 1) then
            "Multiple commits: verify whether earlier review feedback was addressed."
          else empty end,
          if (($pr.checks_summary // 0) > 0) then
            "Cross-check CI/check status against the code changes."
          else empty end,
          if (($jira_found | length) > 0) then
            "Use attached Jira context to validate scope and acceptance criteria."
          else empty end,
          if (($jira_missing | length) > 0) then
            ("Missing Jira export for: " + ($jira_missing | join(", ")) + ".")
          else empty end
        ];

      def data_gaps($pr; $jira_keys; $jira_missing):
        [
          if ($pr.description == null or $pr.description == "" or $pr.description == "Add a description...") then
            "PR description is missing or placeholder."
          else empty end,
          if (($jira_keys | length) == 0) then
            "No Jira key inferred from current PR data."
          else empty end,
          if (($jira_missing | length) > 0) then
            ("Jira exports missing for: " + ($jira_missing | join(", ")))
          else empty end
        ];

      {
        handoff_id: ($pr.workspace + "/" + $pr.repo + "#" + ($pr.id | tostring)),
        pr: {
          id: $pr.id,
          title: $pr.title,
          link: $pr.link,
          workspace: $pr.workspace,
          repo: $pr.repo,
          status: $pr.status,
          source_branch: $pr.source_branch,
          destination_branch: $pr.destination_branch,
          queue_age: $pr.queue_age,
          created: $pr.created,
          created_at: $pr.created_at,
          last_updated_at: $pr.last_updated_at,
          author: $pr.author,
          review_surface: {
            overview_link: $pr.overview_link,
            diff_link: $pr.diff_link,
            commits_link: $pr.commits_link
          }
        },
        review_signals: {
          files_changed_count: $pr.files_changed_count,
          commits_count: $pr.commits_count,
          comment_count: $pr.comment_count,
          reviewers_count: $pr.reviewers_count,
          checks_summary: $pr.checks_summary,
          builds_summary: $pr.builds_summary,
          tasks_count: $pr.tasks_count,
          jira_work_items_count: $pr.jira_work_items_count
        },
        summaries: {
          pr_description_excerpt: excerpt($pr.description; 1200),
          pr_activity_excerpt: compact_lines($pr.activity_preview; 20)
        },
        jira: {
          keys: $jira_keys,
          found: $jira_found,
          missing_keys: $jira_missing
        },
        agent_context: {
          primary_ticket_key: ($jira_keys[0] // null),
          should_fetch_more_jira: (($jira_missing | length) > 0),
          recommended_focus: recommended_focus($pr; $jira_found; $jira_missing),
          data_gaps: data_gaps($pr; $jira_keys; $jira_missing)
        }
      }'
  )"

  printf '%s\n' "$record_json" >> "$tmp_dir/records.ndjson"
done < "$tmp_dir/prs.ndjson"

records_json="$(jq -s '.' "$tmp_dir/records.ndjson")"

jq -n \
  --slurpfile queue "$QUEUE_PATH" \
  --slurpfile details "$PR_DETAILS_PATH" \
  --slurpfile jira "$tmp_dir/jira-catalog.json" \
  --argjson records "$records_json" \
  --arg queue_path "$QUEUE_PATH" \
  --arg pr_details_path "$PR_DETAILS_PATH" \
  --arg jira_dir "$JIRA_DIR" \
  --arg generated_at "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" \
  '{
    generated_at: $generated_at,
    source_files: {
      queue: $queue_path,
      pr_details: $pr_details_path,
      jira_directory: $jira_dir
    },
    source_timestamps: {
      queue_fetched_at: $queue[0].fetched_at,
      pr_details_fetched_at: $details[0].fetched_at
    },
    stats: {
      queue_count: ($queue[0].count // 0),
      pr_details_count: ($details[0].count // 0),
      jira_exports_count: ($jira[0] | length),
      handoff_records_count: ($records | length)
    },
    pull_requests: $records
  }' > "$OUTPUT_PATH"

printf 'Wrote %s\n' "$OUTPUT_PATH"
