import re

import mwparserfromhell


def parse_infoboxes(wikitext: str) -> list[dict]:
    parsed = mwparserfromhell.parse(wikitext)
    infoboxes = []
    for template in parsed.filter_templates():
        name = str(template.name).strip()
        params = {}
        for param in template.params:
            key = str(param.name).strip()
            val = str(param.value).strip()
            if key:
                params[key] = val
        if params:
            infoboxes.append({"template": name, "params": params})
    return infoboxes


def _strip_wikilinks(text: str) -> str:
    return re.sub(r'\[\[(?:[^|\]]*\|)?([^\]]+)\]\]', r'\1', text)


def infobox_to_table(infobox: dict) -> str:
    lines = [
        f"**{infobox['template']}**\n",
        "| Attribute | Value |",
        "|-----------|-------|",
    ]
    for k, v in infobox["params"].items():
        v_clean = _strip_wikilinks(v).replace("\n", " ")
        lines.append(f"| {k} | {v_clean} |")
    return "\n".join(lines)
