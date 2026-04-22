import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from classifier import classify


def test_classifies_by_infobox_monster():
    infoboxes = [{"template": "Infobox Monster", "params": {"hp": "100"}}]
    assert classify("Burnewt", infoboxes) == "monsters-pets"


def test_classifies_by_infobox_spell():
    infoboxes = [{"template": "Infobox Spell", "params": {"damage": "50"}}]
    assert classify("Bolt", infoboxes) == "spells-battles"


def test_classifies_by_infobox_location():
    infoboxes = [{"template": "Infobox Location", "params": {"zone": "1"}}]
    assert classify("Bonfire Spire", infoboxes) == "locations-world"


def test_classifies_by_title_keyword_when_no_infobox():
    assert classify("Shipwreck Shore", []) == "locations-world"
    assert classify("Ice Dungeon", []) == "locations-world"


def test_classifies_equipment_by_title():
    assert classify("Dragon Wand", []) == "items-equipment"
    assert classify("Sky Boots", []) == "items-equipment"


def test_returns_misc_for_unknown():
    assert classify("Random Unknown Page", []) == "misc"
