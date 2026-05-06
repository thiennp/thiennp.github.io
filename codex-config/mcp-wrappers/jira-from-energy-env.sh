#!/bin/zsh
set -euo pipefail
ENV_FILE="/Users/thiennguyen/docker-localdev2/workdir/enrg-energycenter-rev/frontend/.env"
if [[ -f "$ENV_FILE" ]]; then
  set -a
  source "$ENV_FILE" >/dev/null 2>&1
  set +a
fi
export JIRA_HOST="${JIRA_BASE_URL#https://}"
export JIRA_HOST="${JIRA_HOST#http://}"
exec npx -y @aot-tech/jira-mcp-server
