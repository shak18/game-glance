import os

from gameglance.home_errors import FILE_NAME, append_log, start_entry


def test_appends_each_entry_and_creates_the_folder(tmp_path):
    folder = tmp_path / "logs" / "Game Glance"
    append_log(str(folder), "first entry")
    path = append_log(str(folder), "second entry\n")
    assert path == os.path.join(str(folder), FILE_NAME)
    with open(path, encoding="utf-8") as f:
        assert f.read() == "first entry\nsecond entry\n"


def test_keeps_the_newest_whole_entries_when_over_the_limit(tmp_path):
    folder = str(tmp_path)
    for i in range(40):
        path = append_log(folder, f"entry {i:03d} " + "x" * 10, max_bytes=300)
    assert os.path.getsize(path) <= 300
    with open(path, encoding="utf-8") as f:
        lines = f.read().splitlines()
    assert lines[-1] == "entry 039 " + "x" * 10
    assert all(line.startswith("entry ") for line in lines)


def test_the_start_entry_names_the_version_and_the_log_file():
    entry = start_entry("3.0.3", "2026-10-12T09:00:00.000Z", "/home/deck/homebrew/logs/Game Glance/game-glance.log")
    assert entry == "v3.0.3 2026-10-12T09:00:00.000Z started, writing to /home/deck/homebrew/logs/Game Glance/game-glance.log"
