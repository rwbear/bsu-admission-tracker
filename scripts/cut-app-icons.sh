#!/usr/bin/env bash
# Cut favicon / apple-touch / PWA sizes from assets/rwb-icon-source.png
# Usage: ./scripts/cut-app-icons.sh [source-png]
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="${1:-$ROOT/assets/rwb-icon-source.png}"
OUT="$ROOT/assets"
if [[ ! -f "$SRC" ]]; then
  echo "missing source: $SRC" >&2
  exit 1
fi
python3 - "$SRC" "$OUT" <<'PY'
import sys
from pathlib import Path
from PIL import Image

src_path, out_dir = Path(sys.argv[1]), Path(sys.argv[2])
master = Image.open(src_path).convert("RGBA")
if master.size[0] != master.size[1]:
    raise SystemExit(f"source must be square, got {master.size}")

def resize(n: int) -> Image.Image:
    return master.resize((n, n), Image.Resampling.LANCZOS)

resize(1024).save(out_dir / "rwb-icon.png", optimize=True)
resize(16).save(out_dir / "favicon-16.png", optimize=True)
resize(32).save(out_dir / "favicon-32.png", optimize=True)
resize(180).save(out_dir / "apple-touch-icon.png", optimize=True)
resize(192).save(out_dir / "icon-192.png", optimize=True)
resize(512).save(out_dir / "icon-512.png", optimize=True)
sizes = [16, 32, 48]
imgs = [resize(s) for s in sizes]
imgs[-1].save(
    out_dir / "favicon.ico",
    format="ICO",
    sizes=[(s, s) for s in sizes],
    append_images=imgs[:-1],
)
print(f"cut icons from {src_path} ({master.size[0]}²) → {out_dir}")
PY
