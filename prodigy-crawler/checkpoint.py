import json
import os

from config import CHECKPOINT_FILE


def load() -> dict:
    if not os.path.exists(CHECKPOINT_FILE):
        return {"phase": 1, "discovered": [], "fetched": []}
    with open(CHECKPOINT_FILE, encoding="utf-8") as f:
        return json.load(f)


def save(data: dict):
    with open(CHECKPOINT_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def mark_fetched(title: str):
    cp = load()
    if title not in cp["fetched"]:
        cp["fetched"].append(title)
    save(cp)


def is_fetched(title: str) -> bool:
    return title in load()["fetched"]
