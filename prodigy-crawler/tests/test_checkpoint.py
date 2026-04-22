import os
import sys
import json
import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from checkpoint import load, save, mark_fetched, is_fetched


def test_load_returns_defaults_when_no_file(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    cp = load()
    assert cp["phase"] == 1
    assert cp["discovered"] == []
    assert cp["fetched"] == []


def test_save_and_reload(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    save({"phase": 2, "discovered": ["PageA", "PageB"], "fetched": ["PageA"]})
    cp = load()
    assert cp["phase"] == 2
    assert "PageA" in cp["discovered"]


def test_mark_fetched_and_is_fetched(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    save({"phase": 1, "discovered": [], "fetched": []})
    mark_fetched("SomePage")
    assert is_fetched("SomePage")
    assert not is_fetched("OtherPage")
