API_BASE = "https://prodigy-game.fandom.com/api.php"
RATE_LIMIT_SEC = 2.0  # 0.5 req/s — conservative after IP block

CHECKPOINT_FILE = "checkpoint.json"
RAW_PAGES_DIR = "raw_pages"
OUTPUT_DIR = "output"
MASTER_PAGES_FILE = "master_pages.txt"

INCLUDE_CATEGORIES = [
    "Prodigy Math Game",
    "Prodigy Game Island",
    "Prodigy Game Wiki",
    "Prodigy Pet Adventures",
]

EXCLUDE_PREFIXES = [
    "Prodigy English",
    "Prodigy CDN Files",
]

WIKI_BASE_URL = "https://prodigy-game.fandom.com/wiki/"
CDN_BASE_URL = "https://static.wikia.nocookie.net/prodigy/images/"
MAX_IMAGES_PER_ARTICLE = 10

# bucket name → infobox template name fragments (lowercase)
INFOBOX_BUCKET_MAP = {
    "monsters-pets":   ["monster", "pet", "boss", "creature", "enemy", "familiar"],
    "spells-battles":  ["spell", "attack", "ability", "move"],
    "items-equipment": ["item", "wand", "hat", "boot", "outfit", "robe", "armor", "wheel", "equipment", "accessory"],
    "locations-world": ["location", "island", "zone", "dungeon", "area", "world", "region", "tower"],
    "game-mechanics":  ["element", "mechanic", "system", "battle", "rune", "skill"],
    "characters-npcs": ["character", "npc", "wizard", "villain", "hero"],
    "events-rewards":  ["event", "chest", "reward", "shop", "bundle", "pack"],
}

TITLE_BUCKET_KEYWORDS = {
    "locations-world":  ["isle", "island", "shore", "cave", "dungeon", "tower", "arena", "cove", "keep", "spire"],
    "events-rewards":   ["event", "chest", "reward", "shop", "token", "prize", "pack", "bundle"],
    "items-equipment":  ["boots", "hat", "wand", "outfit", "robe", "armor", "wheel", "staff", "ring", "amulet"],
    "spells-battles":   ["blast", "storm", "surge", "strike", "bolt", "burst", "barrage"],
    "characters-npcs":  ["wizard", "cloaked", "warlock", "guardian"],
}
