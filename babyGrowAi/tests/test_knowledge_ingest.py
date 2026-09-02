from pathlib import Path

import pytest

from app.knowledge.ingest import _parse_recipe_markdown

DATA_DIR = Path(__file__).parent.parent / "data"


def test_parse_recipe_markdown():
    path = DATA_DIR / "recipes" / "001-carrot-puree.md"
    assert path.exists()
    data = _parse_recipe_markdown(path)
    assert data["title"] == "胡萝卜泥"
    assert data["age_min"] == 6
    assert data["age_max"] == 8
    assert data["texture"] == "泥糊"
    assert "胡萝卜" in data["ingredient_text"]
    assert "β-胡萝卜素" in data["nutrition_text"]
