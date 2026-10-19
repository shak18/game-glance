#!/usr/bin/env bash
# Build the plugin and package it for Decky's "Install plugin from ZIP/URL". Usage: scripts/package.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
pnpm build
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT
PKG="$STAGE/glance-library"
mkdir -p "$PKG/py_modules" out
cp plugin.json package.json main.py LICENSE THIRD_PARTY_LICENSES.md "$PKG/"
cp -R dist "$PKG/dist"
rm -f "$PKG"/dist/*.map # debugging aid only (~7 MB, mostly icon sources); dist/ keeps it locally
cp -R py_modules/glancelibrary "$PKG/py_modules/glancelibrary"
find "$PKG" -name '__pycache__' -prune -exec rm -rf {} +
rm -f out/glance-library.zip
(cd "$STAGE" && zip -qr "$ROOT/out/glance-library.zip" glance-library)
unzip -l out/glance-library.zip
