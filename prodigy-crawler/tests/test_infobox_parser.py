import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from infobox_parser import parse_infoboxes, infobox_to_table

MONSTER_WIKITEXT = """
{{Infobox Monster
| element = Fire
| hp      = 350
| attack  = 45
| xp      = 120
}}
Some description text here.
"""

MULTI_INFOBOX = """
{{Infobox Pet
| type = Water
| rarity = Epic
}}
{{Infobox Stats
| speed = 10
}}
"""


def test_parse_single_infobox():
    result = parse_infoboxes(MONSTER_WIKITEXT)
    assert len(result) == 1
    assert result[0]["template"] == "Infobox Monster"
    assert result[0]["params"]["element"] == "Fire"
    assert result[0]["params"]["hp"] == "350"
    assert result[0]["params"]["xp"] == "120"


def test_parse_multiple_infoboxes():
    result = parse_infoboxes(MULTI_INFOBOX)
    assert len(result) == 2
    names = [r["template"] for r in result]
    assert "Infobox Pet" in names
    assert "Infobox Stats" in names


def test_parse_empty_wikitext():
    assert parse_infoboxes("No templates here.") == []


def test_infobox_to_table_contains_header():
    ib = {"template": "Infobox Monster", "params": {"element": "Fire", "hp": "350"}}
    table = infobox_to_table(ib)
    assert "**Infobox Monster**" in table
    assert "| element | Fire |" in table
    assert "| hp | 350 |" in table


def test_infobox_to_table_strips_wikilinks():
    ib = {
        "template": "Infobox Monster",
        "params": {"element": "[[Fire]]", "zone": "[[Bonfire Spire|Spire]]"},
    }
    table = infobox_to_table(ib)
    assert "[[" not in table
    assert "| zone | Spire |" in table
