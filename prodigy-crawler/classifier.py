from config import INFOBOX_BUCKET_MAP, TITLE_BUCKET_KEYWORDS


def classify(title: str, infoboxes: list[dict]) -> str:
    # Priority 1: match infobox template name against bucket map
    for ib in infoboxes:
        template_lower = ib["template"].lower()
        for bucket, fragments in INFOBOX_BUCKET_MAP.items():
            if any(frag in template_lower for frag in fragments):
                return bucket

    # Priority 2: title keyword match
    title_lower = title.lower()
    for bucket, keywords in TITLE_BUCKET_KEYWORDS.items():
        if any(kw in title_lower for kw in keywords):
            return bucket

    return "misc"
