import json
import os
from typing import Any, Dict, List, Optional


def find_tabmaster_settings_file(plugin_settings_dir: str, user_home: str) -> Optional[str]:
    """Finds TabMaster's settings.json file across known Decky Loader locations."""
    candidates = []
    if plugin_settings_dir:
        parent_dir = os.path.dirname(os.path.normpath(plugin_settings_dir))
        candidates.append(os.path.join(parent_dir, "TabMaster", "settings.json"))
        candidates.append(os.path.join(parent_dir, "tabmaster", "settings.json"))
    if user_home:
        candidates.append(os.path.join(user_home, "homebrew", "settings", "TabMaster", "settings.json"))
        candidates.append(os.path.join(user_home, "homebrew", "settings", "tabmaster", "settings.json"))
        candidates.append(os.path.join(user_home, ".config", "decky-template", "settings", "TabMaster", "settings.json"))
        candidates.append(os.path.join(user_home, ".config", "decky-template", "settings", "tabmaster", "settings.json"))

    for path in candidates:
        if os.path.isfile(path):
            return path
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

    # Format 1: Multi-user structure {"usersDict": {"<user_id>": {"tabs": {...}}}}
    users_dict = data.get("usersDict")
    tabs_dict = None
    if isinstance(users_dict, dict) and users_dict:
        for u_data in users_dict.values():
            if isinstance(u_data, dict) and isinstance(u_data.get("tabs"), dict) and u_data["tabs"]:
                tabs_dict = u_data["tabs"]
                break

    # Format 2: Direct tabs dictionary at root {"tabs": {...}}
    if not tabs_dict and isinstance(data.get("tabs"), dict):
        tabs_dict = data["tabs"]

    if not tabs_dict or not isinstance(tabs_dict, dict):
        return []

    result = []
    for tab_id, tab_info in tabs_dict.items():
        if not isinstance(tab_info, dict):
            continue
        tab_item = {
            "id": tab_info.get("id") or str(tab_id),
            "title": tab_info.get("title") or str(tab_id),
            "position": tab_info.get("position", 0),
            "autoHide": bool(tab_info.get("autoHide", False)),
            "filters": tab_info.get("filters", []),
            "filtersMode": tab_info.get("filtersMode", "and"),
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
