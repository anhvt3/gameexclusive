import json
import os
import re
import time

import requests

from checkpoint import load, save
from config import API_BASE, RAW_PAGES_DIR, RATE_LIMIT_SEC

IMPERSONATE = "chrome110"  # curl_cffi Chrome fingerprint

BATCH_SIZE = 50  # MediaWiki supports up to 50 titles per query request


def _fetch_batch(titles: list[str]) -> dict[str, dict]:
    """Fetch wikitext + images for up to 50 pages in one API call.
    Returns dict of {title: page_data} in same format as old action=parse.
    """
    params = {
        "action": "query",
        "titles": "|".join(titles),
        "prop": "revisions|images|categories",
        "rvprop": "content",
        "rvslots": "main",
        "imlimit": 50,
        "cllimit": 50,
        "format": "json",
    }
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
    r = requests.get(API_BASE, params=params, headers=headers, timeout=30)
    r.raise_for_status()
    data = r.json()

    pages = data.get("query", {}).get("pages", {})
    result = {}
    for page_data in pages.values():
        title = page_data.get("title", "")
        if not title or page_data.get("missing") is not None:
            continue

        # Extract wikitext from revisions
        wikitext = ""
        revisions = page_data.get("revisions", [])
        if revisions:
            slots = revisions[0].get("slots", {})
            if slots:
                wikitext = slots.get("main", {}).get("*", "")
            else:
                wikitext = revisions[0].get("*", "")

        # Extract image filenames
        images = [
            img["title"].replace("File:", "").replace("file:", "")
            for img in page_data.get("images", [])
        ]

        # Extract categories
        categories = [
            {"title": cat["title"].replace("Category:", "")}
            for cat in page_data.get("categories", [])
        ]

        # Store in same format as old action=parse output (phase3 compatibility)
        result[title] = {
            "title": title,
            "wikitext": {"*": wikitext},
            "images": images,
            "categories": categories,
        }
    return result


def _safe_filename(title: str) -> str:
    safe = title.replace("/", "__")
    # Strip all Windows-invalid filename characters
    safe = re.sub(r'[<>:"|?*\\]', '_', safe)
    safe = safe.replace(" ", "_")
    return safe + ".json"


def fetch_all(page_titles: list[str]):
    os.makedirs(RAW_PAGES_DIR, exist_ok=True)
    cp = load()
    fetched_set = set(cp.get("fetched", []))
    total = len(page_titles)

    # Build list of pages that still need fetching
    pending = [t for t in page_titles if t not in fetched_set]
    print(f"  Pending: {len(pending)}/{total} pages (batch size: {BATCH_SIZE})")

    batch_count = 0
    fetched_this_run = 0

    for batch_start in range(0, len(pending), BATCH_SIZE):
        batch = pending[batch_start:batch_start + BATCH_SIZE]

        for attempt in range(3):
            try:
                batch_data = _fetch_batch(batch)

                # Write each page to disk
                for title, data in batch_data.items():
                    out_path = os.path.join(RAW_PAGES_DIR, _safe_filename(title))
                    with open(out_path, "w", encoding="utf-8") as f:
                        json.dump(data, f, ensure_ascii=False, indent=2)
                    fetched_set.add(title)

                # Mark whole batch as fetched (even pages with no data = missing/deleted)
                for title in batch:
                    fetched_set.add(title)

                fetched_this_run += len(batch)
                break

            except Exception as e:
                # curl_cffi raises RequestsError; stdlib raises HTTPError — handle both generically
                status = None
                if hasattr(e, 'response') and e.response is not None:
                    status = e.response.status_code
                elif hasattr(e, 'code'):
                    status = e.code

                if status in (403, 404):
                    for title in batch:
                        fetched_set.add(title)
                    print(f"  Batch {batch_count+1}: HTTP {status} — skipping {len(batch)} pages")
                    break

                wait = 2 ** (attempt + 1)
                print(f"  Batch retry {attempt+1}/3 (err={e}), wait {wait}s")
                time.sleep(wait)

        batch_count += 1

        # Checkpoint every 10 batches (= 500 pages)
        if batch_count % 10 == 0:
            cp["fetched"] = list(fetched_set)
            save(cp)
            done = len([t for t in page_titles if t in fetched_set])
            pct = done / total * 100
            print(f"  Progress: {done}/{total} ({pct:.1f}%) — checkpointed")

        time.sleep(RATE_LIMIT_SEC)

    cp["fetched"] = list(fetched_set)
    cp["phase"] = 3
    save(cp)
    files = len([f for f in os.listdir(RAW_PAGES_DIR) if f.endswith(".json")])
    print(f"  Phase 2 complete: {files} files in {RAW_PAGES_DIR}/")
