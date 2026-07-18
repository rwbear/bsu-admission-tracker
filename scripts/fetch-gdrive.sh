#!/usr/bin/env bash
# Download a Google Drive file shared as "anyone with the link".
# Usage:
#   ./scripts/fetch-gdrive.sh <file-id-or-view-url> [output-path]
# Examples:
#   ./scripts/fetch-gdrive.sh 1DggoMsT30XlAAmh2ewcMmbZHrpbXl0qf assets/rwb-icon-source.png
#   ./scripts/fetch-gdrive.sh 'https://drive.google.com/file/d/1Dggo.../view?usp=drivesdk' /tmp/icon.png
set -euo pipefail

raw="${1:-}"
out="${2:-./gdrive-download.bin}"
if [[ -z "$raw" ]]; then
  echo "usage: $0 <file-id-or-view-url> [output-path]" >&2
  exit 2
fi

id="$raw"
# Extract id from common Drive URL shapes
if [[ "$raw" == *"/file/d/"* ]]; then
  id="${raw#*/file/d/}"
  id="${id%%/*}"
  id="${id%%\?*}"
elif [[ "$raw" == *"?id="* ]] || [[ "$raw" == *"&id="* ]]; then
  id="${raw#*id=}"
  id="${id%%&*}"
  id="${id%%\?*}"
fi

if [[ ! "$id" =~ ^[A-Za-z0-9_-]+$ ]]; then
  echo "could not parse a Drive file id from: $raw" >&2
  exit 2
fi

url="https://drive.google.com/uc?export=download&id=${id}"
tmp="$(mktemp)"
cleanup() { rm -f "$tmp"; }
trap cleanup EXIT

curl -sL --fail --max-time 120 -A 'Mozilla/5.0' -o "$tmp" "$url"
ctype="$(file -b --mime-type "$tmp" 2>/dev/null || true)"

# Large-file HTML interstitial — pull confirm token if present
if [[ "$ctype" == text/html* ]]; then
  confirm="$(grep -oE 'confirm=([0-9A-Za-z_-]+)' "$tmp" | head -1 | cut -d= -f2 || true)"
  if [[ -n "${confirm:-}" ]]; then
    curl -sL --fail --max-time 120 -A 'Mozilla/5.0' \
      -o "$tmp" \
      "https://drive.google.com/uc?export=download&id=${id}&confirm=${confirm}"
    ctype="$(file -b --mime-type "$tmp" 2>/dev/null || true)"
  fi
fi

if [[ "$ctype" == text/html* || "$ctype" == application/json* ]]; then
  echo "download failed (got ${ctype}). Share the file: Anyone with the link → Viewer." >&2
  exit 1
fi

mkdir -p "$(dirname -- "$out")"
cp "$tmp" "$out"
bytes="$(wc -c <"$out" | tr -d ' ')"
echo "saved ${out} (${ctype}, ${bytes} bytes) from id=${id}"
