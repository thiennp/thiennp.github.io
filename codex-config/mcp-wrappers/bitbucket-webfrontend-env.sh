#!/bin/zsh
set -euo pipefail
ENV_FILE="/Users/thiennguyen/docker-localdev2/workdir/result-list-goes-react/.env"
if [[ -f "$ENV_FILE" ]]; then
  set -a
  source "$ENV_FILE" >/dev/null 2>&1
  set +a
fi
export BITBUCKET_HOST="${BB_WORKSPACE:-check24}"
export BITBUCKET_API_TOKEN="${BB_APP_PASSWORD:-${ATLASSIAN_CREDENTIAL:-}}"
exec npx -y @atlassian-mcp-server/bitbucket
