import json
import os

from classifier import classify
from config import (
    CDN_BASE_URL,
    MAX_IMAGES_PER_ARTICLE,
    OUTPUT_DIR,
    RAW_PAGES_DIR,
    WIKI_BASE_URL,
)
from infobox_parser import infobox_to_table, parse_infoboxes
from wikitext_cleaner import clean

BUCKET_FILES = {
    "monsters-pets":   ("monsters-pets.md",   "Monsters & Pets"),
    "spells-battles":  ("spells-battles.md",  "Spells & Battles"),
    "items-equipment": ("items-equipment.md", "Items & Equipment"),
    "locations-world": ("locations-world.md", "Locations & World"),
    "game-mechanics":  ("game-mechanics.md",  "Game Mechanics"),
    "characters-npcs": ("characters-npcs.md", "Characters & NPCs"),
    "events-rewards":  ("events-rewards.md",  "Events & Rewards"),
    "misc":            ("misc.md",            "Miscellaneous"),
}


def _build_article_md(title: str, data: dict) -> tuple[str, str, bool]:
    """Returns (bucket, markdown_content, has_infobox)."""
    wikitext = data.get("wikitext", {}).get("*", "")
    images = [img for img in data.get("images", []) if not img.lower().endswith(".svg")]

    infoboxes = parse_infoboxes(wikitext)
    bucket = classify(title, infoboxes)
    prose = clean(wikitext)

    source_url = WIKI_BASE_URL + title.replace(" ", "_")
    lines = [
        f"## {title}",
        "",
        f"**Source:** [{title}]({source_url})",
        "",
    ]

    for ib in infoboxes:
        lines.append(infobox_to_table(ib))
        lines.append("")

    if prose:
        lines.append(prose)
        lines.append("")

    if images:
        lines.append("**Images:**")
        for img in images[:MAX_IMAGES_PER_ARTICLE]:
            img_url = CDN_BASE_URL + img
            lines.append(f"![{img}]({img_url})")
        lines.append("")

    lines.append("---")
    lines.append("")

    return bucket, "\n".join(lines), bool(infoboxes)


def generate():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    buckets: dict[str, list[str]] = {k: [] for k in BUCKET_FILES}
    index_rows: list[str] = []

    raw_files = sorted(f for f in os.listdir(RAW_PAGES_DIR) if f.endswith(".json"))
    total = len(raw_files)
    print(f"  Processing {total} cached pages...")

    for i, fname in enumerate(raw_files):
        path = os.path.join(RAW_PAGES_DIR, fname)
        with open(path, encoding="utf-8") as f:
            data = json.load(f)

        title = data.get("title", fname.replace(".json", "").replace("_", " "))
        if not title:
            continue

        bucket, article_md, has_infobox = _build_article_md(title, data)
        buckets[bucket].append(article_md)

        source_url = WIKI_BASE_URL + title.replace(" ", "_")
        index_rows.append(
            f"| [{title}]({source_url}) | {bucket} | {'Yes' if has_infobox else 'No'} |"
        )

        if (i + 1) % 200 == 0:
            print(f"  {i+1}/{total} processed...")

    for bucket, (filename, heading) in BUCKET_FILES.items():
        path = os.path.join(OUTPUT_DIR, filename)
        header = (
            f"# Prodigy Math Game — {heading}\n\n"
            f"*{len(buckets[bucket])} articles*\n\n"
            f"---\n\n"
        )
        with open(path, "w", encoding="utf-8") as f:
            f.write(header + "\n".join(buckets[bucket]))
        print(f"  {filename}: {len(buckets[bucket])} articles")

    index_path = os.path.join(OUTPUT_DIR, "index.md")
    with open(index_path, "w", encoding="utf-8") as f:
        f.write("# Prodigy Math Game Wiki — Master Index\n\n")
        f.write(f"*{len(index_rows)} total articles*\n\n")
        f.write("| Title | Bucket | Has Infobox |\n")
        f.write("|-------|--------|-------------|\n")
        f.write("\n".join(index_rows))

    print(f"  index.md: {len(index_rows)} entries")
    print(f"  Phase 3 complete -> {OUTPUT_DIR}/")
