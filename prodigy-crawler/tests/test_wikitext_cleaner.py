import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from wikitext_cleaner import clean


def test_removes_infobox_templates():
    text = "{{Infobox Monster|hp=100}}\nSome lore."
    result = clean(text)
    assert "{{" not in result
    assert "Some lore." in result


def test_converts_headings():
    result = clean("== Overview ==\nText\n=== Details ===\nMore")
    assert "## Overview" in result
    assert "### Details" in result


def test_strips_wikilinks():
    result = clean("The [[Burnewt]] lives in [[Bonfire Spire|the Spire]].")
    assert "[[" not in result
    assert "Burnewt" in result
    assert "the Spire" in result


def test_converts_bold_italic():
    result = clean("'''bold''' and ''italic''")
    assert "**bold**" in result
    assert "*italic*" in result


def test_removes_html_tags():
    result = clean("Hello <br/> world <ref>citation</ref>")
    assert "<" not in result
    assert "Hello" in result
    assert "world" in result


def test_collapses_blank_lines():
    result = clean("A\n\n\n\nB")
    assert "\n\n\n" not in result
