#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/lib/atlassian-api.sh"

MODE="${1:-preflight}"

atlassian_require_cmds curl jq
atlassian_load_env

bitbucket_ready=false
jira_ready=false

echo "Verification mode: ${MODE}"

if atlassian_setup_bitbucket_auth >/dev/null 2>&1; then
  bitbucket_ready=true
  echo "Bitbucket credentials: present (${BITBUCKET_AUTH_KIND})"
  bitbucket_user_json="$(atlassian_http_json_optional BITBUCKET_AUTH_ARGS "${BITBUCKET_API_BASE}/user" || true)"
  if jq -e '.uuid or .account_id or .nickname' >/dev/null 2>&1 <<<"${bitbucket_user_json:-}"; then
    echo "Bitbucket auth probe: OK"
    jq -r '"Bitbucket user: " + (.display_name // .nickname // .account_id // .uuid // "unknown")' <<<"$bitbucket_user_json"

    if [[ "$MODE" == "full" ]]; then
      queue_output="$(mktemp)"
      "$SCRIPT_DIR/export-bitbucket-reviewing-queue-api.sh" "$queue_output" >/tmp/bitbucket-verify.out
      jq -r '"Bitbucket queue export count: " + ((.count // 0) | tostring)' "$queue_output"
      rm -f "$queue_output"
    fi
  else
    echo "Bitbucket auth probe: FAILED"
    printf '%s\n' "${bitbucket_user_json:-<empty response>}"
  fi
else
  echo "Bitbucket credentials: missing"
fi

if atlassian_setup_jira_auth >/dev/null 2>&1; then
  jira_ready=true
  echo "Jira credentials: present (${JIRA_AUTH_KIND})"
  jira_myself_json="$(atlassian_http_json_optional JIRA_AUTH_ARGS "${JIRA_BASE_URL}/rest/api/3/myself" || true)"
  if jq -e '.accountId or .emailAddress or .displayName' >/dev/null 2>&1 <<<"${jira_myself_json:-}"; then
    echo "Jira auth probe: OK"
    jq -r '"Jira user: " + (.displayName // .emailAddress // .accountId // "unknown")' <<<"$jira_myself_json"

    if [[ "$MODE" == "full" ]]; then
      jira_probe_key="${JIRA_PROBE_ISSUE_KEY:-}"
      if [[ -n "$jira_probe_key" ]]; then
        jira_output="$(mktemp)"
        "$SCRIPT_DIR/export-jira-issue-details-api.sh" "$jira_probe_key" "$jira_output" >/tmp/jira-verify.out
        jq -r '"Jira issue export: " + (.issue_key // "unknown") + " - " + (.title // "no title")' "$jira_output"
        rm -f "$jira_output"
      else
        echo "Jira full-mode export skipped: set JIRA_PROBE_ISSUE_KEY to test an issue export."
      fi
    fi
  else
    echo "Jira auth probe: FAILED"
    printf '%s\n' "${jira_myself_json:-<empty response>}"
  fi
else
  echo "Jira credentials: missing"
fi

if [[ "$bitbucket_ready" == false && "$jira_ready" == false ]]; then
  echo "Result: blocked on missing credentials."
  exit 2
fi

echo "Result: verification completed."
