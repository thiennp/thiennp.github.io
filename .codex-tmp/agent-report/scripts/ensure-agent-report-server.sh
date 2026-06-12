#!/bin/zsh
set -euo pipefail

APP_DIR="/Users/thiennguyen/thiennp.github.io/agent-report"
HOST="${AGENT_REPORT_HOST:-127.0.0.1}"
PORT="${AGENT_REPORT_PORT:-3100}"
HTTP_URL="http://${HOST}:${PORT}/"
WS_URL="ws://${HOST}:${PORT}/stream"
LOG_DIR="${APP_DIR}/logs"
SERVER_LOG="${LOG_DIR}/server.log"
AUTOSTART_LOG="${LOG_DIR}/autostart.log"
SEND_STATUS="${AGENT_REPORT_SEND_STATUS:-1}"
SCREEN_SESSION="agent-report-${PORT}"

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:${PATH:-}"

mkdir -p "${LOG_DIR}"

log() {
  printf '%s %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*" >> "${AUTOSTART_LOG}"
}

send_report() {
  local report_status="$1"
  local title="$2"
  local message="$3"

  if [[ "${SEND_STATUS}" == "0" || "${SEND_STATUS}" == "false" ]]; then
    log "Report suppressed: ${title}"
    return
  fi

  (
    cd "${APP_DIR}"
    AGENT_REPORT_WS="${WS_URL}" npm run send -- \
      --automation-name "Agent Report Autostart" \
      --title "${title}" \
      --status "${report_status}" \
      "${message}"
  ) >> "${AUTOSTART_LOG}" 2>&1 || log "Could not send report: ${title}"
}

should_report_already_running() {
  [[ "${SEND_STATUS}" != "changes" && "${SEND_STATUS}" != "on-change" ]]
}

is_healthy() {
  curl -fsS --max-time 3 "${HTTP_URL}" >/dev/null 2>&1
}

if is_healthy; then
  log "Agent Report already running on ${HTTP_URL}"
  if should_report_already_running; then
    send_report "success" "Server already running" "Agent Report is already available on ${HTTP_URL}; automations can send reports to ${WS_URL}."
  else
    log "Report suppressed: Server already running"
  fi
  exit 0
fi

if lsof -nP -iTCP:"${PORT}" -sTCP:LISTEN >/dev/null 2>&1; then
  log "Port ${PORT} is already in use, but ${HTTP_URL} did not pass health check."
  send_report "error" "Server autostart blocked" "Port ${PORT} is already in use, but Agent Report did not answer ${HTTP_URL}. Check ${AUTOSTART_LOG} and ${SERVER_LOG}."
  exit 1
fi

log "Starting Agent Report on ${HTTP_URL}"
(
  cd "${APP_DIR}"
  if command -v screen >/dev/null 2>&1; then
    screen -S "${SCREEN_SESSION}" -X quit >/dev/null 2>&1 || true
    screen -dmS "${SCREEN_SESSION}" zsh -lc \
      "cd '${APP_DIR}' && exec env AGENT_REPORT_HOST='${HOST}' PORT='${PORT}' node server.js >> '${SERVER_LOG}' 2>&1"
    printf '%s\n' "${SCREEN_SESSION}" > "${LOG_DIR}/server.pid"
  else
    nohup env AGENT_REPORT_HOST="${HOST}" PORT="${PORT}" node server.js >> "${SERVER_LOG}" 2>&1 < /dev/null &
    server_pid="$!"
    disown "${server_pid}" 2>/dev/null || true
    printf '%s\n' "${server_pid}" > "${LOG_DIR}/server.pid"
  fi
)

for attempt in {1..10}; do
  if is_healthy; then
    log "Agent Report started on ${HTTP_URL}"
    send_report "success" "Server autostarted" "Agent Report started on ${HTTP_URL}; automations can send reports to ${WS_URL}."
    exit 0
  fi

  sleep 1
done

log "Agent Report did not become healthy on ${HTTP_URL}"
send_report "error" "Server autostart failed" "Agent Report did not become healthy on ${HTTP_URL}. Check ${AUTOSTART_LOG} and ${SERVER_LOG}."
exit 1
