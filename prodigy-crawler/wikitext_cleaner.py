import re

import mwparserfromhell


def clean(wikitext: str) -> str:
    parsed = mwparserfromhell.parse(wikitext)

    # Remove all templates (infoboxes already extracted separately)
    for template in parsed.filter_templates():
        try:
            parsed.remove(template)
        except ValueError:
            pass

    text = str(parsed)

    # Headings
    text = re.sub(r'====\s*(.+?)\s*====', r'#### \1', text)
    text = re.sub(r'===\s*(.+?)\s*===', r'### \1', text)
    text = re.sub(r'==\s*(.+?)\s*==', r'## \1', text)

    # Wikilinks: [[Link|Text]] → Text,  [[Link]] → Link
    text = re.sub(r'\[\[(?:[^|\]]*\|)?([^\]]+)\]\]', r'\1', text)

    # Bold / italic
    text = re.sub(r"'''(.+?)'''", r'**\1**', text)
    text = re.sub(r"''(.+?)''", r'*\1*', text)

    # External links [url text] → text
    text = re.sub(r'\[https?://\S+\s+([^\]]+)\]', r'\1', text)

    # HTML tags
    text = re.sub(r'<[^>]+>', '', text)

    # Unordered list markers (lone * only — not ** bold markers)
    text = re.sub(r'^\*(?!\*)\s*', '- ', text, flags=re.MULTILINE)

    # Collapse excess blank lines
    text = re.sub(r'\n{3,}', '\n\n', text)

    return text.strip()
