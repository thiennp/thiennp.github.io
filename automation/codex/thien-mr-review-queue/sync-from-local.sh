#!/usr/bin/env bash
set -euo pipefail

ROOT="/Users/study/thiennp.github.io/automation/codex/thien-mr-review-queue"

mkdir -p "$ROOT/dashboard" "$ROOT/state"

cp "/Users/study/.codex/automations/thien-mr-review-queue/automation.toml" "$ROOT/automation.toml"
cp "/Users/study/aurora/fs-academy/.cursor/.temp/thien-mr-dashboard/server.mjs" "$ROOT/dashboard/server.mjs"
cp "/Users/study/.codex/automations/thien-mr-review-queue-report.json" "$ROOT/state/thien-mr-review-queue-report.json"
cp "/Users/study/.codex/automations/thien-mr-dashboard-history.json" "$ROOT/state/thien-mr-dashboard-history.json"

for optional_file in \
  "/Users/study/.codex/automations/thien-mr-dashboard-reply-tone.json" \
  "/Users/study/.codex/automations/thien-mr-dashboard-comment-fixes.json"
do
  if [[ -f "$optional_file" ]]; then
    cp "$optional_file" "$ROOT/state/$(basename "$optional_file")"
  fi
done

echo "Synced Thien MR review queue automation to $ROOT"
