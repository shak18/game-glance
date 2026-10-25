#!/usr/bin/env python3
"""
Regenerates src/library/consoleIconData.ts from every image in assets/icons/.

Each file becomes a base64 data URI keyed by its lowercase file name without extension
(e.g. assets/icons/32x.png -> '32x'). Run this after adding or replacing icons:

    python scripts/gen_icon_data.py
"""
import base64
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ICONS_DIR = ROOT / "assets" / "icons"
OUT_FILE = ROOT / "src" / "library" / "consoleIconData.ts"

MIME = {
    ".png": "image/png",
    ".webp": "image/webp",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml",
}


def main() -> None:
    entries = []
    for path in sorted(ICONS_DIR.iterdir(), key=lambda p: p.name.lower()):
        mime = MIME.get(path.suffix.lower())
        if not path.is_file() or not mime:
            continue
        key = path.stem.lower()
        data = base64.b64encode(path.read_bytes()).decode("ascii")
        entries.append(f"    '{key}': 'data:{mime};base64,{data}',")

    lines = [
        "// Auto-generated console icon data URIs for instantaneous, 0ms synchronous rendering.",
        "// Bypasses backend RPC so console icons never flicker, fail, or freeze the UI.",
        "// Regenerate with: python scripts/gen_icon_data.py",
        "export const CONSOLE_ICON_DATA: Record<string, string> = {",
        *entries,
        "};",
        "",
        "export function getBundledConsoleIcon(key?: string | null): string | undefined {",
        "    if (!key) return undefined;",
        "    const clean = key.toLowerCase().replace(/\\.(png|webp|svg|jpe?g)$/i, '');",
        "    return CONSOLE_ICON_DATA[clean] ?? undefined;",
        "}",
        "",
    ]
    OUT_FILE.write_text("\r\n".join(lines), encoding="utf-8")
    print(f"Wrote {len(entries)} icons to {OUT_FILE.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
