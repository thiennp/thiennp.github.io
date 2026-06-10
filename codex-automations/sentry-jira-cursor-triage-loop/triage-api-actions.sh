#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
SENTRY_UNION="${SCRIPT_DIR}/sentry-source-union.mjs"
JIRA_BB="${SCRIPT_DIR}/jira-bitbucket-snapshot.mjs"
SENTRY_JIRA="${SCRIPT_DIR}/sentry-jira-integration.mjs"
SAFE_DELEGATE="${SCRIPT_DIR}/safe-delegate-cli.mjs"
ISSUE_LIST_HTML="${SCRIPT_DIR}/generate-issue-list-html.mjs"
ISSUE_STATUS_SERVER="${SCRIPT_DIR}/issue-list-status-server.mjs"

usage() {
  cat <<'EOF'
Usage: triage-api-actions.sh <action> [args...]

Read-only source actions:
  check-all [--out-dir DIR]
      Run Sentry union + Jira/Bitbucket snapshots and print compact counts.
  sentry-union [--out PATH] [extra sentry-source-union.mjs args...]
      Fetch Source A/Source B and deduplicate the Sentry union.
  jira-snapshot [--out PATH] [extra jira-bitbucket-snapshot.mjs args...]
      Fetch Jira assigned PRE status snapshot.
  bitbucket-snapshot [--out PATH] [extra jira-bitbucket-snapshot.mjs args...]
      Fetch Bitbucket Thien-authored PR inventory/state snapshot.
  jira-bitbucket-snapshot [--out PATH] [extra jira-bitbucket-snapshot.mjs args...]
      Fetch Jira + Bitbucket in one call.
  issue-list-html [--fresh] [--sentry PATH] [--jira-bitbucket PATH] [--out PATH]
      Generate a sanitized HTML issue list from API snapshots.
  issue-list-status-server [--port 8797] [--host 127.0.0.1]
      Serve the generated issue app and expose /api/status for Codex status updates.
  issue-list-status-set --issue-id ID --status STATUS [--message TEXT]
      Update the generated issue status sidecar JSON without starting the server.
  issue-list-status-get
      Print the generated issue status sidecar JSON.

Sentry Jira integration actions:
  sentry-jira-inspect --issue-id ID
      List Sentry issue integrations and currently mounted Jira issues.
  sentry-jira-create-fields --issue-id ID
      Show Jira create fields/defaults for this Sentry issue.
  sentry-jira-link-fields --issue-id ID
      Show Jira link fields for this Sentry issue.
  sentry-jira-search --field FIELD --query TEXT [--project 10004] [--issuetype 10004]
      Search Jira field choices through the Sentry Jira integration.
  sentry-jira-create-dry-run --issue-id ID --title TEXT --description TEXT [field args...]
      Build the create payload without creating a Jira issue.
  sentry-jira-create --issue-id ID --title TEXT --description TEXT --confirmed-no-existing-jira [field args...] --execute
      Create a Jira issue through the Sentry Jira integration.
  sentry-jira-link-dry-run --issue-id ID --external-issue KEY_OR_ID
      Build the link payload without linking.
  sentry-jira-link --issue-id ID --external-issue KEY_OR_ID --confirmed-same-issue --execute
      Link an existing Jira issue through the Sentry Jira integration.

Delegated CLI actions:
  delegate-cursor [cursor-agent args...]
      Run cursor-agent through the scrubbed environment wrapper.
  delegate-claude [claude args...]
      Run claude through the scrubbed environment wrapper.

Safety:
  - Tokens are read only by the Node helpers from ~/.env or process env.
  - This wrapper never prints token values.
  - Sentry/Jira create/link only mutate when the explicit action and --execute are used.
EOF
}

require_node_script() {
  local script="$1"
  if [[ ! -x "$script" && ! -f "$script" ]]; then
    echo "Missing helper: $script" >&2
    exit 2
  fi
}

json_summary() {
  node - "$@" <<'NODE'
const fs = require('fs');
const [kind, file] = process.argv.slice(2);
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
if (kind === 'sentry') {
  console.log(JSON.stringify({
    status: data.status,
    checkedAt: data.checkedAt,
    sourceA: data.sources?.A?.count,
    sourceB: data.sources?.B?.count,
    union: data.unionCount ?? data.unionIds?.length,
    paginationA: data.sources?.A?.pagination?.endedBecause,
    paginationB: data.sources?.B?.pagination?.endedBecause,
  }, null, 2));
} else if (kind === 'jira-bitbucket') {
  console.log(JSON.stringify({
    status: data.status,
    jiraStatus: data.jira?.status,
    jiraCount: data.jira?.count,
    jiraPagination: data.jira?.pagination?.endedBecause,
    bitbucketStatus: data.bitbucket?.status,
    bitbucketCount: data.bitbucket?.count,
    bitbucketPrIds: data.bitbucket?.prIds,
    bitbucketPagination: data.bitbucket?.pagination?.endedBecause,
  }, null, 2));
} else {
  throw new Error(`Unknown summary kind: ${kind}`);
}
NODE
}

has_arg() {
  local needle="$1"
  shift || true
  local arg
  for arg in "$@"; do
    [[ "$arg" == "$needle" ]] && return 0
  done
  return 1
}

reject_execute() {
  if has_arg "--execute" "$@"; then
    echo "This dry-run action refuses --execute. Use the explicit mutating action after required checks." >&2
    exit 2
  fi
}

require_execute() {
  if ! has_arg "--execute" "$@"; then
    echo "This mutating action requires --execute. Use the dry-run action first." >&2
    exit 2
  fi
}

require_confirmation() {
  local flag="$1"
  shift || true
  if ! has_arg "$flag" "$@"; then
    echo "This mutating action requires $flag after documented evidence checks." >&2
    exit 2
  fi
}

run_check_all() {
  local out_dir="/tmp"
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --out-dir)
        out_dir="$2"
        shift 2
        ;;
      *)
        echo "Unknown check-all argument: $1" >&2
        exit 2
        ;;
    esac
  done
  mkdir -p "$out_dir"
  local sentry_out="${out_dir}/sentry-source-union.$(date -u +%Y%m%dT%H%M%SZ).json"
  local jira_bb_out="${out_dir}/jira-bitbucket-snapshot.$(date -u +%Y%m%dT%H%M%SZ).json"
  node "$SENTRY_UNION" --out "$sentry_out" >/dev/null
  node "$JIRA_BB" --mode all --out "$jira_bb_out" >/dev/null
  echo "Sentry:"
  json_summary sentry "$sentry_out"
  echo "Jira/Bitbucket:"
  json_summary jira-bitbucket "$jira_bb_out"
  echo "Artifacts:"
  printf '%s\n%s\n' "$sentry_out" "$jira_bb_out"
}

action="${1:-}"
if [[ -z "$action" || "$action" == "--help" || "$action" == "-h" ]]; then
  usage
  exit 0
fi
shift || true

case "$action" in
  check-all)
    require_node_script "$SENTRY_UNION"
    require_node_script "$JIRA_BB"
    run_check_all "$@"
    ;;
  sentry-union)
    require_node_script "$SENTRY_UNION"
    node "$SENTRY_UNION" "$@"
    ;;
  jira-snapshot)
    require_node_script "$JIRA_BB"
    node "$JIRA_BB" --mode jira "$@"
    ;;
  bitbucket-snapshot)
    require_node_script "$JIRA_BB"
    node "$JIRA_BB" --mode bitbucket "$@"
    ;;
  jira-bitbucket-snapshot)
    require_node_script "$JIRA_BB"
    node "$JIRA_BB" --mode all "$@"
    ;;
  issue-list-html)
    require_node_script "$ISSUE_LIST_HTML"
    node "$ISSUE_LIST_HTML" "$@"
    ;;
  issue-list-status-server)
    require_node_script "$ISSUE_STATUS_SERVER"
    node "$ISSUE_STATUS_SERVER" serve "$@"
    ;;
  issue-list-status-set)
    require_node_script "$ISSUE_STATUS_SERVER"
    node "$ISSUE_STATUS_SERVER" set "$@"
    ;;
  issue-list-status-get)
    require_node_script "$ISSUE_STATUS_SERVER"
    node "$ISSUE_STATUS_SERVER" get "$@"
    ;;
  sentry-jira-inspect)
    require_node_script "$SENTRY_JIRA"
    node "$SENTRY_JIRA" inspect "$@"
    ;;
  sentry-jira-create-fields)
    require_node_script "$SENTRY_JIRA"
    node "$SENTRY_JIRA" fields --action create "$@"
    ;;
  sentry-jira-link-fields)
    require_node_script "$SENTRY_JIRA"
    node "$SENTRY_JIRA" fields --action link "$@"
    ;;
  sentry-jira-search)
    require_node_script "$SENTRY_JIRA"
    node "$SENTRY_JIRA" search-field "$@"
    ;;
  sentry-jira-create-dry-run)
    require_node_script "$SENTRY_JIRA"
    reject_execute "$@"
    node "$SENTRY_JIRA" create "$@"
    ;;
  sentry-jira-create)
    require_node_script "$SENTRY_JIRA"
    require_execute "$@"
    require_confirmation "--confirmed-no-existing-jira" "$@"
    node "$SENTRY_JIRA" create "$@"
    ;;
  sentry-jira-link-dry-run)
    require_node_script "$SENTRY_JIRA"
    reject_execute "$@"
    node "$SENTRY_JIRA" link "$@"
    ;;
  sentry-jira-link)
    require_node_script "$SENTRY_JIRA"
    require_execute "$@"
    require_confirmation "--confirmed-same-issue" "$@"
    node "$SENTRY_JIRA" link "$@"
    ;;
  delegate-cursor)
    require_node_script "$SAFE_DELEGATE"
    "$SAFE_DELEGATE" -- cursor-agent "$@"
    ;;
  delegate-claude)
    require_node_script "$SAFE_DELEGATE"
    "$SAFE_DELEGATE" -- claude "$@"
    ;;
  *)
    echo "Unknown action: $action" >&2
    usage >&2
    exit 2
    ;;
esac
