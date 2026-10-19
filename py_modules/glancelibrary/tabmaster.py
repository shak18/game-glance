import json
import os
from typing import Any, Dict, List, Optional


def find_tabmaster_settings_file(plugin_settings_dir: str, user_home: str) -> Optional[str]:
    """Finds TabMaster's settings.json file across known Decky Loader locations and subdirectories."""
    search_dirs = []
    if plugin_settings_dir:
        parent_dir = os.path.dirname(os.path.normpath(plugin_settings_dir))
        search_dirs.append(parent_dir)

    search_dirs.extend([
        "/homebrew/settings",
        "/DATA/homebrew/settings",
        "/var/lib/decky/settings",
        "/homebrew/plugins",
        "/DATA/homebrew/plugins",
    ])

    if user_home:
        search_dirs.extend([
            os.path.join(user_home, "homebrew", "settings"),
            os.path.join(user_home, "homebrew", "plugins"),
            os.path.join(user_home, ".local", "share", "decky", "settings"),
            os.path.join(user_home, ".config", "decky", "settings"),
            os.path.join(user_home, ".config", "decky-template", "settings"),
        ])

    checked_dirs = set()
    for sdir in search_dirs:
        if not sdir or sdir in checked_dirs or not os.path.isdir(sdir):
            continue
        checked_dirs.add(sdir)

        # 1. Check common exact folder names
        for folder_name in ["TabMaster", "tabmaster", "tab-master", "Tab-Master", "tab_master"]:
            for fname in ["settings.json", "tabmaster.json", "config.json"]:
                candidate = os.path.join(sdir, folder_name, fname)
                if os.path.isfile(candidate):
                    return candidate

        # 2. Case-insensitive scan of subdirectories in sdir
        try:
            for entry in os.listdir(sdir):
                clean = entry.lower().replace("-", "").replace("_", "")
                if "tabmaster" in clean:
                    for fname in ["settings.json", "tabmaster.json", "config.json"]:
                        candidate = os.path.join(sdir, entry, fname)
                        if os.path.isfile(candidate):
                            return candidate
        except Exception:
            pass

    return None


def read_tabmaster_tabs(settings_file_path: str) -> List[Dict[str, Any]]:
    """Reads TabMaster settings and returns tabs list with id, title, position, filters, etc."""
    try:
        with open(settings_file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception:
        return []

    if not isinstance(data, dict):
        return []

    # Check for multi-user structure: {"usersDict": {"<user_id>": {"tabs": {...}}}}
    users_dict = data.get("usersDict") or data.get("users_dict") or data.get("users")
    tabs_source = None

    if isinstance(users_dict, dict) and users_dict:
        best_tabs = None
        best_score = -1
        for _, u_data in users_dict.items():
            if not isinstance(u_data, dict):
                continue
            raw_tabs = u_data.get("tabs") or u_data.get("currentTabs")
            if not raw_tabs:
                continue

            raw_list = []
            if isinstance(raw_tabs, dict):
                raw_list = list(raw_tabs.values())
            elif isinstance(raw_tabs, list):
                raw_list = raw_tabs

            # Score profile: custom tabs with filters or custom IDs get higher priority
            custom_count = sum(
                1
                for t in raw_list
                if isinstance(t, dict)
                and (
                    t.get("filters")
                    or t.get("customTitle")
                    or str(t.get("id", "")).lower()
                    not in (
                        "allgames",
                        "installed",
                        "greatondeck",
                        "favorites",
                        "collections",
                        "nonsteam",
                        "soundtracks",
                    )
                )
            )
            score = len(raw_list) + (custom_count * 10)
            if score > best_score:
                best_score = score
                best_tabs = raw_tabs

        if best_tabs:
            tabs_source = best_tabs

    # Format 2: Direct tabs dictionary or list at root {"tabs": {...}} or other keys
    if not tabs_source:
        for k in ["tabs", "currentTabs", "userTabs", "tabsDict"]:
            if data.get(k):
                tabs_source = data[k]
                break
    if not tabs_source and isinstance(data.get("settings"), dict):
        tabs_source = data["settings"].get("tabs") or data["settings"].get("currentTabs")

    if not tabs_source:
        return []

    raw_items: List[tuple[str, Dict[str, Any]]] = []
    if isinstance(tabs_source, dict):
        for tab_id, tab_info in tabs_source.items():
            if isinstance(tab_info, dict):
                raw_items.append((str(tab_id), tab_info))
    elif isinstance(tabs_source, list):
        for idx, tab_info in enumerate(tabs_source):
            if isinstance(tab_info, dict):
                raw_items.append((str(tab_info.get("id", idx)), tab_info))

    result = []
    for tab_id, tab_info in raw_items:
        raw_apps = tab_info.get("appIds") or tab_info.get("apps") or tab_info.get("games")
        app_ids = []
        if isinstance(raw_apps, list):
            for item in raw_apps:
                if isinstance(item, int) and item > 0:
                    app_ids.append(item)
                elif isinstance(item, dict):
                    aid = item.get("appid") or item.get("appId")
                    if isinstance(aid, int) and aid > 0:
                        app_ids.append(aid)

        tab_item = {
            "id": tab_info.get("id") or str(tab_id),
            "title": tab_info.get("customTitle") or tab_info.get("title") or str(tab_id),
            "customTitle": tab_info.get("customTitle"),
            "position": tab_info.get("position", 0),
            "autoHide": bool(tab_info.get("autoHide", False)),
            "filters": tab_info.get("filters", []),
            "filtersMode": tab_info.get("filtersMode", "and"),
            "categoriesToInclude": tab_info.get("categoriesToInclude", 1),
            "appIds": app_ids,
            "sort": tab_info.get("sort"),
            "sortMethod": tab_info.get("sortMethod") or tab_info.get("sort_method"),
            "bReverseSort": tab_info.get("bReverseSort") or tab_info.get("reverseSort"),
        }
        result.append(tab_item)

    # Sort tabs by position
    result.sort(key=lambda t: t.get("position", 0))
    return result


def get_tabmaster_data(plugin_settings_dir: str, user_home: str) -> Dict[str, Any]:
    """Finds and reads TabMaster settings, returning found status and configured tabs."""
    path = find_tabmaster_settings_file(plugin_settings_dir, user_home)
    if not path:
        return {"found": False, "tabs": []}
    tabs = read_tabmaster_tabs(path)
    return {"found": True, "path": path, "tabs": tabs}

