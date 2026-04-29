#!/usr/bin/env python3
"""
strip_white_bg.py — Convert JPEG-mạo-danh-PNG sprite assets to true PNG-32
with white background -> alpha 0.

Why: Antigravity delivered Phase 1 sprites named `.png` but encoded as
JPEG with a flat white background. Phaser renders these with a visible
white box around every monster / wizard / mascot — see UAT 29/04/2026.

Strategy (same as ImageMagick `-fuzz 5% -transparent white`):
  1. Load each candidate PNG.
  2. Convert to RGBA.
  3. Build an alpha mask where pixel R,G,B all ≥ WHITE_THRESHOLD -> alpha 0.
  4. Feather edge pixels by distance-to-white so anti-aliased outlines
     don't get a visible halo.
  5. Save back as proper PNG-32.

Excludes: backgrounds + tilesets (they're MEANT to be opaque). Files
already in valid PNG-32 RGBA format are skipped automatically.

Run:  python scripts/strip_white_bg.py
      python scripts/strip_white_bg.py --dry-run
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("Need Pillow:  pip install Pillow", file=sys.stderr)
    sys.exit(2)

WHITE_THRESHOLD = 245  # Any RGB ≥ this on all channels = treat as background.
FEATHER_BAND = 20      # RGB distance from white over which alpha ramps 0..255.

# Folders we DO want stripped — sprites that overlay onto other scenes.
INCLUDE_DIRS = ("monsters", "mascot", "player", "ui", "items", "juice")
# Folders we leave alone — opaque artwork by design.
EXCLUDE_DIRS = ("backgrounds", "tilesets", "audio")


def is_jpeg_in_disguise(path: Path) -> bool:
    """Quick magic-byte check: real PNG starts \\x89PNG, JPEG starts \\xff\\xd8."""
    with path.open("rb") as fh:
        head = fh.read(3)
    return head[:2] == b"\xff\xd8"


def has_meaningful_alpha(img: Image.Image) -> bool:
    """True when at least one pixel has alpha < 250."""
    if img.mode != "RGBA":
        return False
    alpha = img.getchannel("A")
    lo, _hi = alpha.getextrema()
    return lo < 250


def strip_white(img: Image.Image) -> Image.Image:
    rgba = img.convert("RGBA")
    pixels = rgba.load()
    w, h = rgba.size
    for y in range(h):
        for x in range(w):
            r, g, b, _ = pixels[x, y]
            min_rgb = min(r, g, b)
            if min_rgb >= WHITE_THRESHOLD:
                pixels[x, y] = (r, g, b, 0)
            elif min_rgb >= WHITE_THRESHOLD - FEATHER_BAND:
                # Linear ramp: at threshold-FEATHER_BAND => alpha 255,
                # at threshold => alpha 0.
                t = (WHITE_THRESHOLD - min_rgb) / FEATHER_BAND
                alpha = max(0, min(255, int(t * 255)))
                pixels[x, y] = (r, g, b, alpha)
    return rgba


def candidate(root: Path) -> list[Path]:
    out: list[Path] = []
    for sub in INCLUDE_DIRS:
        d = root / sub
        if not d.is_dir():
            continue
        for p in d.rglob("*.png"):
            out.append(p)
    return sorted(out)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--root",
        default="app/public/assets",
        help="Asset root (default: app/public/assets)",
    )
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    root = Path(args.root).resolve()
    if not root.is_dir():
        print(f"Asset root not found: {root}", file=sys.stderr)
        return 2

    files = candidate(root)
    if not files:
        print(f"No candidate PNGs under {root}")
        return 0

    converted = 0
    skipped_alpha = 0
    failed = 0

    for path in files:
        try:
            jpeg_disguise = is_jpeg_in_disguise(path)
            with Image.open(path) as src:
                src.load()
                already_alpha = has_meaningful_alpha(src)
                if already_alpha and not jpeg_disguise:
                    skipped_alpha += 1
                    continue
                stripped = strip_white(src)
            label = "JPEG->PNG-32" if jpeg_disguise else "white->alpha"
            print(f"  {label}: {path.relative_to(root)}")
            if not args.dry_run:
                stripped.save(path, format="PNG", optimize=True)
            converted += 1
        except Exception as exc:  # noqa: BLE001
            failed += 1
            print(f"  FAIL: {path.relative_to(root)} — {exc}", file=sys.stderr)

    print(f"\nDone. Converted={converted} SkippedAlphaOK={skipped_alpha} Failed={failed}")
    if args.dry_run:
        print("(dry-run — no files written)")
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
