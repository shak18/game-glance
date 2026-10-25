import base64
import datetime
import os

import decky


from glancelibrary.heroic import HeroicLibrary, heroic_cache_dirs
from glancelibrary.home_errors import FILE_NAME, append_log, start_entry
from glancelibrary.kv import KvStore
from glancelibrary.migrate import carry_over, old_data_path
from glancelibrary.store_lookup import RegistryCache, key_for_appid, store_for_appid
from glancelibrary.tabmaster import get_tabmaster_data

DATA_PATH = os.path.join(decky.DECKY_PLUGIN_SETTINGS_DIR, "data.json")
if carry_over(old_data_path(decky.DECKY_PLUGIN_SETTINGS_DIR), DATA_PATH):
    decky.logger.info("[glance-library] carried over data from Ally Game Page")
KV = KvStore(DATA_PATH)
REGISTRY = RegistryCache(
    os.path.join(decky.DECKY_USER_HOME, ".local", "share", "unifideck", "shortcuts_registry.json")
)

HEROIC = HeroicLibrary(heroic_cache_dirs(decky.DECKY_USER_HOME))

_IMAGE_CACHE: dict = {}


class Plugin:
    async def kv_get(self, key: str):
        try:
            return KV.get(key)
        except Exception:
            decky.logger.exception(f"[glance-library] kv_get({key}) failed")
            return None

    async def kv_set(self, key: str, value) -> None:
        try:
            KV.set(key, value)
        except Exception:
            decky.logger.exception(f"[glance-library] kv_set({key}) failed")
            raise

    async def kv_delete(self, key: str) -> None:
        KV.delete(key)

    async def kv_delete_prefix(self, prefix: str) -> int:
        return KV.delete_prefix(prefix)

    async def get_store(self, appid: int):
        try:
            return store_for_appid(REGISTRY.get(), int(appid))
        except Exception:
            decky.logger.exception("[glance-library] get_store failed")
            return None

    async def get_unifideck_key(self, appid: int):
        # {"store": "gog", "id": "1450711444"}: the key Unifideck's own backend takes (e.g. its get_playtime), or None.
        try:
            return key_for_appid(REGISTRY.get(), int(appid))
        except Exception:
            decky.logger.exception("[glance-library] get_unifideck_key failed")
            return None

    async def get_heroic_description(self, runner: str, app_name: str):
        try:
            return HEROIC.description(str(runner), str(app_name))
        except Exception:
            decky.logger.exception("[glance-library] get_heroic_description failed")
            return None

    async def get_tabmaster_settings(self):
        try:
            res = get_tabmaster_data(decky.DECKY_PLUGIN_SETTINGS_DIR, decky.DECKY_USER_HOME)
            decky.logger.info(
                f"[glance-library] get_tabmaster_settings: found={res.get('found')}, "
                f"path={res.get('path')}, tabs={len(res.get('tabs', []))}"
            )
            return res
        except Exception:
            decky.logger.exception("[glance-library] get_tabmaster_settings failed")
            return {"found": False, "tabs": []}

    async def log_home_error(self, entry: str) -> None:
        # Home recovered from an error (src/home/RouteGuard): kept in the plugin's own log for a bug report.
        try:
            append_log(decky.DECKY_PLUGIN_LOG_DIR, f"v{decky.DECKY_PLUGIN_VERSION} {entry}"[:8000])
        except Exception:
            decky.logger.exception("[glance-library] log_home_error failed")

    async def get_version(self):
        # The installed version, from package.json at install time (Decky's environment); the updater compares it.
        return decky.DECKY_PLUGIN_VERSION

    async def get_storage_locations(self):
        """Returns convenient browse locations: Pictures, Home, and detected SD Card mounts."""
        try:
            user_home = getattr(decky, "DECKY_USER_HOME", None) or os.environ.get("DECKY_USER_HOME") or "/home/deck"
            locations = [
                {"label": "Pictures (~/Pictures)", "path": os.path.join(user_home, "Pictures")},
                {"label": "User Home (~)", "path": user_home},
            ]
            media_root = "/run/media"
            if os.path.isdir(media_root):
                try:
                    for entry in sorted(os.listdir(media_root)):
                        entry_path = os.path.join(media_root, entry)
                        if os.path.isdir(entry_path):
                            submounts = []
                            try:
                                submounts = [s for s in sorted(os.listdir(entry_path)) if os.path.isdir(os.path.join(entry_path, s))]
                            except Exception:
                                pass
                            if submounts:
                                for sub in submounts:
                                    locations.append({"label": f"SD Card ({sub})", "path": os.path.join(entry_path, sub)})
                            else:
                                locations.append({"label": f"Removable ({entry})", "path": entry_path})
                except Exception:
                    pass
            locations.append({"label": "Root (/)", "path": "/"})
            return locations
        except Exception:
            decky.logger.exception("[glance-library] get_storage_locations failed")
            return [
                {"label": "Pictures (~/Pictures)", "path": "/home/deck/Pictures"},
                {"label": "User Home (~)", "path": "/home/deck"},
                {"label": "SD Card (/run/media)", "path": "/run/media"},
                {"label": "Root (/)", "path": "/"},
            ]

    async def get_image_data(self, path: str):
        """Reads an image from disk or bundled icons and returns a base64 data URI."""
        try:
            if not path or not isinstance(path, str):
                return None

            path = path.strip().strip("\"'")

            # Already a data URI or web URL?
            if path.startswith("data:") or path.startswith("http://") or path.startswith("https://"):
                return path

            if path in _IMAGE_CACHE:
                return _IMAGE_CACHE[path]

            # Strip file:// scheme
            if path.startswith("file://"):
                path = path[7:]
                if os.name == "nt" and path.startswith("/") and len(path) > 2 and path[2] == ":":
                    # file:///C:/path -> C:/path
                    path = path[1:]

            # Expand ~ to user home
            if path.startswith("~"):
                user_home = getattr(decky, "DECKY_USER_HOME", None) or os.environ.get("DECKY_USER_HOME") or "/home/deck"
                path = os.path.join(user_home, path[1:].lstrip("/\\"))

            filepath = path
            rel_name = os.path.basename(path)

            plugin_dir = getattr(decky, "DECKY_PLUGIN_DIR", None) or os.environ.get("DECKY_PLUGIN_DIR") or os.path.dirname(os.path.abspath(__file__))

            # If not an existing absolute file on disk, search candidate locations
            if not os.path.isfile(filepath):
                clean_rel = path.lstrip("/\\")
                if clean_rel.startswith("icons/") or clean_rel.startswith("icons\\"):
                    clean_rel = clean_rel[6:]
                elif clean_rel.startswith("plugins/glance-library/icons/"):
                    clean_rel = clean_rel[29:]

                candidates = [
                    os.path.join(plugin_dir, "icons", clean_rel),
                    os.path.join(plugin_dir, "icons", rel_name),
                    os.path.join(plugin_dir, "assets", "icons", clean_rel),
                    os.path.join(plugin_dir, "assets", "icons", rel_name),
                    os.path.join(plugin_dir, clean_rel),
                    os.path.join(os.path.dirname(os.path.abspath(__file__)), "icons", clean_rel),
                    os.path.join(os.path.dirname(os.path.abspath(__file__)), "icons", rel_name),
                    os.path.join(os.path.dirname(os.path.abspath(__file__)), "assets", "icons", clean_rel),
                    os.path.join(os.path.dirname(os.path.abspath(__file__)), "assets", "icons", rel_name),
                    os.path.join(os.path.dirname(os.path.abspath(__file__)), clean_rel),
                    os.path.join(os.path.dirname(os.path.abspath(__file__)), rel_name),
                ]
                found = None
                for c in candidates:
                    if os.path.isfile(c):
                        found = c
                        break
                if found:
                    filepath = found
                else:
                    decky.logger.warning(f"[glance-library] get_image_data: file not found: {path} (checked rel: {rel_name})")
                    return None

            if not os.path.isfile(filepath):
                decky.logger.warning(f"[glance-library] get_image_data: file not found: {filepath}")
                return None

            # Prevent reading absurdly huge files (> 15MB)
            if os.path.getsize(filepath) > 15 * 1024 * 1024:
                decky.logger.warning(f"[glance-library] get_image_data: file too large (>15MB): {filepath}")
                return None

            ext = os.path.splitext(filepath)[1].lower()
            mime_map = {
                ".png": "image/png",
                ".jpg": "image/jpeg",
                ".jpeg": "image/jpeg",
                ".webp": "image/webp",
                ".svg": "image/svg+xml",
                ".gif": "image/gif",
                ".bmp": "image/bmp",
                ".avif": "image/avif",
                ".ico": "image/x-icon",
            }
            mime = mime_map.get(ext, "image/png")

            with open(filepath, "rb") as f:
                data = f.read()
                b64 = base64.b64encode(data).decode("utf-8")
                decky.logger.info(f"[glance-library] get_image_data: loaded {filepath} ({len(data)} bytes) as {mime}")
                data_uri = f"data:{mime};base64,{b64}"
                _IMAGE_CACHE[path] = data_uri
                _IMAGE_CACHE[rel_name] = data_uri
                return data_uri
        except Exception:
            decky.logger.exception(f"[glance-library] get_image_data failed for {path}")
            return None

    async def find_collection_art(self, name: str, collection_id: str = ""):
        """Looks for custom collection artwork files in local user folders."""
        try:
            candidates_dirs = [
                os.path.join(decky.DECKY_USER_HOME, "Pictures", "Collections"),
                os.path.join(decky.DECKY_USER_HOME, "Pictures"),
                os.path.join(decky.DECKY_PLUGIN_SETTINGS_DIR, "collection_art"),
                os.path.join(decky.DECKY_PLUGIN_DIR, "collection_art"),
            ]
            extensions = [".png", ".jpg", ".jpeg", ".webp", ".svg"]
            names_to_check = [name, name.lower(), name.replace(" ", "_"), name.replace(" ", "-")]
            if collection_id:
                names_to_check.append(collection_id)

            for d in candidates_dirs:
                if not os.path.isdir(d):
                    continue
                for n in names_to_check:
                    for ext in extensions:
                        filepath = os.path.join(d, f"{n}{ext}")
                        if os.path.isfile(filepath):
                            data_uri = await self.get_image_data(filepath)
                            return {"found": True, "path": filepath, "url": data_uri or f"file://{filepath}"}
            return {"found": False}
        except Exception:
            decky.logger.exception("[glance-library] find_collection_art failed")
            return {"found": False}

    async def _main(self):
        decky.logger.info("[glance-library] backend started")
        # Our own log records each start-up and where it is, so a report can show the location without an error.
        try:
            now = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")
            path = os.path.join(decky.DECKY_PLUGIN_LOG_DIR, FILE_NAME)
            append_log(decky.DECKY_PLUGIN_LOG_DIR, start_entry(decky.DECKY_PLUGIN_VERSION, now, path))
        except Exception:
            decky.logger.exception("[glance-library] start-up log entry failed")

    async def _unload(self):
        decky.logger.info("[glance-library] backend stopped")
