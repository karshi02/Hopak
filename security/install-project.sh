#!/usr/bin/env bash
set -euo pipefail
SRC="$(cd "$(dirname "$0")" && pwd)"
DEST="${1:-.}"
cp "$SRC/AGENTS.md" "$DEST/AGENTS.md"
mkdir -p "$DEST/.codex"
cp -R "$SRC/.codex/." "$DEST/.codex/"
echo "Installed Hopak Security-Only Codex Pack into: $DEST"
