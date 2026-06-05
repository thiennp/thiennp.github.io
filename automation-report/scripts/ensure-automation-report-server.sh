#!/usr/bin/env zsh
set -euo pipefail

APP_DIR="/Users/thien.nguyen/thiennp.github.io/automation-report"
PORT="${AUTOMATION_REPORT_PORT:-3120}"
HOST="${AUTOMATION_REPORT_HOST:-127.0.0.1}"
HTTP_URL="http://${HOST}:${PORT}"
LOG_DIR="${APP_DIR}/logs"
PID_FILE="${LOG_DIR}/server.pid"
LOG_FILE="${LOG_DIR}/server.log"
LABEL="com.thiennp.automation-report"
SOURCE_PLIST="${APP_DIR}/launchd/${LABEL}.plist"
AGENT_PLIST="${HOME}/Library/LaunchAgents/${LABEL}.plist"

mkdir -p "${LOG_DIR}"

if curl -fsS --max-time 2 "${HTTP_URL}/api/health" >/dev/null 2>&1; then
  echo "Automation Report already healthy at ${HTTP_URL}"
  exit 0
fi

if [[ -f "${PID_FILE}" ]]; then
  OLD_PID="$(cat "${PID_FILE}" 2>/dev/null || true)"
  if [[ -n "${OLD_PID}" ]] && kill -0 "${OLD_PID}" 2>/dev/null; then
    echo "Existing process ${OLD_PID} did not answer health; leaving it running."
    exit 1
  fi
fi

cd "${APP_DIR}"
if [[ ! -d node_modules ]]; then
  npm install
fi

BUILD_ID="${APP_DIR}/.next/BUILD_ID"
if [[ ! -f "${BUILD_ID}" ]] || find "${APP_DIR}/app" "${APP_DIR}/lib" "${APP_DIR}/server.mjs" "${APP_DIR}/next.config.mjs" "${APP_DIR}/package.json" -newer "${BUILD_ID}" -print -quit | grep -q .; then
  npm run build
fi

if command -v launchctl >/dev/null 2>&1; then
  mkdir -p "${HOME}/Library/LaunchAgents"
  cp "${SOURCE_PLIST}" "${AGENT_PLIST}"
  DOMAIN="gui/$(id -u)"
  if ! launchctl print "${DOMAIN}/${LABEL}" >/dev/null 2>&1; then
    launchctl bootstrap "${DOMAIN}" "${AGENT_PLIST}" >/dev/null 2>&1 || true
  fi
  launchctl kickstart -k "${DOMAIN}/${LABEL}" >/dev/null 2>&1 || true
else
  nohup npm run start >"${LOG_FILE}" 2>&1 &
  echo "$!" > "${PID_FILE}"
fi

for _ in {1..40}; do
  if curl -fsS --max-time 2 "${HTTP_URL}/api/health" >/dev/null 2>&1; then
    echo "Automation Report started at ${HTTP_URL}"
    exit 0
  fi
  sleep 0.5
done

echo "Automation Report did not become healthy at ${HTTP_URL}. See ${LOG_FILE}" >&2
exit 1
