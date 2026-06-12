#!/usr/bin/env python3
import argparse
import json
import os
import shutil
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path


@dataclass
class SessionMatch:
    path: Path
    session_id: str
    timestamp: datetime


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Archive old Codex session files related to one automation."
    )
    parser.add_argument("--automation-id", required=True)
    parser.add_argument("--automation-name", required=True)
    parser.add_argument("--keep", type=int, default=1)
    parser.add_argument("--min-age-seconds", type=int, default=3600)
    parser.add_argument("--dry-run", action="store_true")
    return parser.parse_args()


def iter_session_files(sessions_root: Path):
    for path in sorted(sessions_root.rglob("*.jsonl")):
        if path.is_file():
            yield path


def read_session_meta(path: Path):
    try:
        with path.open("r", encoding="utf-8") as handle:
            first_line = handle.readline()
            if not first_line:
                return None
            parsed = json.loads(first_line)
    except Exception:
        return None

    if parsed.get("type") != "session_meta":
        return None

    payload = parsed.get("payload") or {}
    session_id = payload.get("id")
    timestamp = payload.get("timestamp")
    if not session_id or not timestamp:
        return None

    try:
        dt = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
    except ValueError:
        return None

    return SessionMatch(path=path, session_id=session_id, timestamp=dt)


def is_related(path: Path, automation_id: str, automation_name: str) -> bool:
    try:
        text = path.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return False
    return automation_id in text or automation_name in text


def archive_path(dest_root: Path, source_path: Path) -> Path:
    candidate = dest_root / source_path.name
    if not candidate.exists():
        return candidate

    stem = source_path.stem
    suffix = source_path.suffix
    index = 1
    while True:
        candidate = dest_root / f"{stem}-{index}{suffix}"
        if not candidate.exists():
            return candidate
        index += 1


def main():
    args = parse_args()
    codex_home = Path.home() / ".codex"
    sessions_root = codex_home / "sessions"
    archive_override = os.environ.get("CODEX_ARCHIVED_SESSIONS_DIR")
    archived_root = Path(archive_override) if archive_override else (codex_home / "archived_sessions")
    archived_root.mkdir(parents=True, exist_ok=True)

    related = []
    for path in iter_session_files(sessions_root):
        meta = read_session_meta(path)
        if not meta:
            continue
        if is_related(path, args.automation_id, args.automation_name):
            related.append(meta)

    related.sort(key=lambda item: item.timestamp, reverse=True)

    keep_ids = {item.session_id for item in related[: max(args.keep, 0)]}
    cutoff = datetime.now(timezone.utc) - timedelta(seconds=max(args.min_age_seconds, 0))

    archived = []
    kept = []
    for item in related:
        if item.session_id in keep_ids or item.timestamp > cutoff:
            kept.append(item)
            continue

        destination = archive_path(archived_root, item.path)
        archived.append((item, destination))
        if not args.dry_run:
            shutil.move(str(item.path), str(destination))

    result = {
        "automation_id": args.automation_id,
        "automation_name": args.automation_name,
        "sessions_found": len(related),
        "sessions_kept": len(kept),
        "sessions_archived": len(archived),
        "keep_session_ids": sorted(keep_ids),
        "archived_files": [
            {
                "source": str(item.path),
                "destination": str(destination),
                "session_id": item.session_id,
                "timestamp": item.timestamp.isoformat(),
            }
            for item, destination in archived
        ],
    }
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
