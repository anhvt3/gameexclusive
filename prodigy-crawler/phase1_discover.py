import time

import requests

from checkpoint import load, save
from config import (
    API_BASE,
    EXCLUDE_PREFIXES,
    INCLUDE_CATEGORIES,
    MASTER_PAGES_FILE,
    RATE_LIMIT_SEC,
)


def _get_category_members(category: str) -> list[dict]:
    """Fetch all pages + subcategories for a category (auto-paginate)."""
    members = []
    params = {
        "action": "query",
        "list": "categorymembers",
        "cmtitle": f"Category:{category}",
        "cmlimit": 500,
        "cmnamespace": "0|14",  # articles (0) + subcategories (14)
        "format": "json",
    }
    while True:
        r = requests.get(API_BASE, params=params, timeout=30)
        r.raise_for_status()
        data = r.json()
        members.extend(data["query"]["categorymembers"])
        if "continue" not in data:
            break
        params["cmcontinue"] = data["continue"]["cmcontinue"]
        time.sleep(RATE_LIMIT_SEC)
    return members


def _is_excluded(category_name: str) -> bool:
    return any(category_name.startswith(p) for p in EXCLUDE_PREFIXES)


def discover_all_pages() -> list[str]:
    cp = load()
    if cp.get("phase", 1) > 1:
        print(f"  [skip] Phase 1 already done: {len(cp['discovered'])} pages in checkpoint")
        return cp["discovered"]

    visited_cats: set[str] = set()
    page_titles: set[str] = set()
    queue: list[str] = list(INCLUDE_CATEGORIES)

    while queue:
        cat = queue.pop(0)
        if cat in visited_cats or _is_excluded(cat):
            continue
        visited_cats.add(cat)
        print(f"  Scanning: Category:{cat}")

        try:
            members = _get_category_members(cat)
        except Exception as e:
            print(f"  WARNING: failed to fetch Category:{cat} — {e}")
            continue

        for m in members:
            if m["ns"] == 14:  # subcategory namespace
                subcat_name = m["title"].replace("Category:", "")
                queue.append(subcat_name)
            elif m["ns"] == 0:  # article namespace
                page_titles.add(m["title"])

        time.sleep(RATE_LIMIT_SEC)

    result = sorted(page_titles)

    with open(MASTER_PAGES_FILE, "w", encoding="utf-8") as f:
        f.write("\n".join(result))

    cp["discovered"] = result
    cp["phase"] = 2
    save(cp)
    print(f"  Phase 1 complete: {len(result)} unique pages → {MASTER_PAGES_FILE}")
    return result
