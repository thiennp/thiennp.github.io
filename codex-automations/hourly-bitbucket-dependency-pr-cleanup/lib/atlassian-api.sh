#!/usr/bin/env bash

# Shared auth and HTTP helpers for API-based Atlassian exports.

set -o pipefail

atlassian_load_env() {
  local env_file="${ATLASSIAN_ENV_FILE:-$HOME/.env}"
  if [[ -f "$env_file" ]]; then
    set -a
    # shellcheck disable=SC1090
    source "$env_file"
    set +a
  fi
}

atlassian_trim_trailing_slash() {
  local value="${1:-}"
  printf '%s' "${value%/}"
}

atlassian_require_cmds() {
  local missing=()
  local cmd
  for cmd in "$@"; do
    if ! command -v "$cmd" >/dev/null 2>&1; then
      missing+=("$cmd")
    fi
  done

  if (( ${#missing[@]} > 0 )); then
    printf 'Missing required command(s): %s\n' "${missing[*]}" >&2
    return 1
  fi
}

atlassian_urlencode() {
  jq -rn --arg value "${1:-}" '$value|@uri'
}

atlassian_jq_json_string() {
  jq -Rn --arg value "${1:-}" '$value'
}

atlassian_setup_bitbucket_auth() {
  BITBUCKET_API_BASE="$(atlassian_trim_trailing_slash "${BITBUCKET_API_BASE:-${BB_API_BASE:-https://api.bitbucket.org/2.0}}")"
  BITBUCKET_WORKSPACE="${BITBUCKET_WORKSPACE:-${BB_WORKSPACE:-check24}}"
  local bitbucket_token="${BITBUCKET_TOKEN:-${BB_API_TOKEN:-}}"
  local bitbucket_username="${BITBUCKET_USERNAME:-${BB_USERNAME:-}}"
  local bitbucket_app_password="${BITBUCKET_APP_PASSWORD:-${BB_APP_PASSWORD:-}}"
  local atlassian_email="${ATLASSIAN_EMAIL:-${JIRA_EMAIL:-${EMAIL:-}}}"

  if [[ -n "$bitbucket_token" && -n "$atlassian_email" ]]; then
    BITBUCKET_AUTH_ARGS=(-u "${atlassian_email}:${bitbucket_token}")
    BITBUCKET_AUTH_KIND="basic_api_token"
    return 0
  fi

  if [[ -n "$bitbucket_token" ]]; then
    BITBUCKET_AUTH_ARGS=(-H "Authorization: Bearer ${bitbucket_token}")
    BITBUCKET_AUTH_KIND="bearer"
    return 0
  fi

  if [[ -n "$bitbucket_username" && -n "$bitbucket_app_password" ]]; then
    BITBUCKET_AUTH_ARGS=(-u "${bitbucket_username}:${bitbucket_app_password}")
    BITBUCKET_AUTH_KIND="basic"
    return 0
  fi

  printf 'Bitbucket credentials missing. Set ATLASSIAN_EMAIL/EMAIL + BITBUCKET_TOKEN/BB_API_TOKEN, or BITBUCKET_USERNAME/BB_USERNAME + BITBUCKET_APP_PASSWORD/BB_APP_PASSWORD.\n' >&2
  return 1
}

atlassian_setup_jira_auth() {
  JIRA_BASE_URL="$(atlassian_trim_trailing_slash "${JIRA_BASE_URL:-https://c24-energie.atlassian.net}")"
  local jira_email="${JIRA_EMAIL:-${ATLASSIAN_EMAIL:-${EMAIL:-}}}"
  local jira_token="${JIRA_API_TOKEN:-${ATLASSIAN_API_TOKEN:-}}"

  if [[ -n "${JIRA_TOKEN:-}" ]]; then
    JIRA_AUTH_ARGS=(-H "Authorization: Bearer ${JIRA_TOKEN}")
    JIRA_AUTH_KIND="bearer"
    return 0
  fi

  if [[ -n "$jira_email" && -n "$jira_token" ]]; then
    JIRA_AUTH_ARGS=(-u "${jira_email}:${jira_token}")
    JIRA_AUTH_KIND="basic"
    return 0
  fi

  printf 'Jira credentials missing. Set JIRA_TOKEN or JIRA_EMAIL/ATLASSIAN_EMAIL + JIRA_API_TOKEN/ATLASSIAN_API_TOKEN.\n' >&2
  return 1
}

atlassian_http_json() {
  local auth_args_name="$1"
  local url="$2"
  shift 2

  local auth_args=()
  eval "auth_args=(\"\${${auth_args_name}[@]}\")"

  curl --silent --show-error --fail \
    -H 'Accept: application/json' \
    "${auth_args[@]}" \
    "$@" \
    "$url"
}

atlassian_http_json_optional() {
  local auth_args_name="$1"
  local url="$2"
  shift 2

  local auth_args=()
  eval "auth_args=(\"\${${auth_args_name}[@]}\")"

  curl --silent --show-error \
    -H 'Accept: application/json' \
    "${auth_args[@]}" \
    "$@" \
    "$url"
}

atlassian_paginated_values() {
  local auth_args_name="$1"
  local start_url="$2"
  local tmp_file
  tmp_file="$(mktemp)"
  printf '[]\n' > "$tmp_file"

  local next_url="$start_url"
  while [[ -n "$next_url" && "$next_url" != "null" ]]; do
    local page_json
    page_json="$(atlassian_http_json "$auth_args_name" "$next_url")"

    jq -s '.[0] + (.[1].values // [])' "$tmp_file" <(printf '%s\n' "$page_json") > "${tmp_file}.next"
    mv "${tmp_file}.next" "$tmp_file"

    next_url="$(jq -r '.next // empty' <<<"$page_json")"
  done

  cat "$tmp_file"
  rm -f "$tmp_file"
}
