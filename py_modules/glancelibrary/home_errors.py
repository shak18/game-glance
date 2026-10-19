"""The plugin's own log, game-glance.log in its log folder (Decky's DECKY_PLUGIN_LOG_DIR): start-ups and Home errors, for reports."""
from __future__ import annotations

import os

FILE_NAME = "game-glance.log"
# Enough for hundreds of entries; the oldest go first once the file passes it.
MAX_BYTES = 200_000


def append_log(folder: str, entry: str, max_bytes: int = MAX_BYTES) -> str:
    """Appends `entry` (a line break is added if missing), keeps the newest whole entries within `max_bytes`, returns the file's path."""
    os.makedirs(folder, exist_ok=True)
    path = os.path.join(folder, FILE_NAME)
    with open(path, "a", encoding="utf-8") as f:
        f.write(entry if entry.endswith("\n") else entry + "\n")
    if os.path.getsize(path) > max_bytes:
        with open(path, "rb") as f:
            f.seek(-(max_bytes // 2), os.SEEK_END)
            tail = f.read()
        cut = tail.find(b"\n")  # start from a whole line
        with open(path, "wb") as f:
            f.write(tail[cut + 1 :] if cut >= 0 else tail)
    return path


def start_entry(version: str, now: str, path: str) -> str:
    """The line written each time the plugin starts: its version and where this log is."""
    return f"v{version} {now} started, writing to {path}"
