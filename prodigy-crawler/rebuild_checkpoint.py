#!/usr/bin/env python3
"""
Rebuild checkpoint.json from actual files on disk.
Scans raw_pages/ to find all pages already fetched, then updates
checkpoint so Phase 2 can skip them and only fetch remaining pages.
"""
import json
import os
import re

from config import CHECKPOINT_FILE, RAW_PAGES_DIR, MASTER_PAGES_FILE


def filename_to_title(filename: str) -> str:
    """Reverse _safe_filename: filename → approximate title (for matching)."""
    # Remove .json extension
    name = filename[:-5] if filename.endswith(".json") else filename
    # Restore spaces (underscores back to spaces)
    name = name.replace("_", " ")
    # Restore slashes (__ back to /)
    name = name.replace("  ", "/")  # won't work perfectly — we use set intersection
    return name


def safe_filename(title: str) -> str:
    """Same logic as phase2_fetch._safe_filename (must stay in sync)."""
    safe = title.replace("/", "__")
    safe = re.sub(r'[<>:"|?*\\]', '_', safe)
    safe = safe.replace(" ", "_")
    return safe + ".json"


def main():
    # Load master page list
    with open(MASTER_PAGES_FILE, encoding="utf-8") as f:
        all_titles = [line.strip() for line in f if line.strip()]

    print(f"Master pages: {len(all_titles)}")

    # Build set of filenames that exist on disk
    existing_files = set(os.listdir(RAW_PAGES_DIR)) if os.path.isdir(RAW_PAGES_DIR) else set()
    print(f"Files on disk: {len(existing_files)}")

    # Map each title to its expected filename, mark as fetched if file exists
    fetched = []
    missing = []
    for title in all_titles:
        fname = safe_filename(title)
        if fname in existing_files:
            fetched.append(title)
        else:
            missing.append(title)

    print(f"Fetched (file exists): {len(fetched)}")
    print(f"Still pending: {len(missing)}")

    # Write updated checkpoint
    cp = {
        "phase": 2,
        "fetched": fetched,
    }
    with open(CHECKPOINT_FILE, "w", encoding="utf-8") as f:
        json.dump(cp, f, indent=2, ensure_ascii=False)

    print(f"\nCheckpoint rebuilt -> {CHECKPOINT_FILE}")
    print(f"Phase 2 will now skip {len(fetched)} pages and fetch {len(missing)} remaining.")


if __name__ == "__main__":
    main()
