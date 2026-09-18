"""Tests for the versioned prompt registry."""

import pytest

from app.prompts.registry import get_prompt_version, get_rendered_prompt, load_prompt_template, set_prompt_version


class TestLoadPromptTemplate:
    def test_load_default_version(self):
        template = load_prompt_template("extraction")
        assert template["_version"] == "v1"
        assert "system" in template
        assert "user_template" in template

    def test_load_specific_version(self):
        template = load_prompt_template("recipe_fixed", version="v1")
        assert template["_version"] == "v1"
        assert "营养师" in template["system"]

    def test_missing_template_raises(self):
        with pytest.raises(FileNotFoundError):
            load_prompt_template("nonexistent", version="v1")


class TestGetRenderedPrompt:
    def test_extraction_rendering(self):
        system, user = get_rendered_prompt("extraction", {"baby_age_months": 6, "text": "吃了苹果泥"})
        assert "提取" in system
        assert "6" in user
        assert "苹果泥" in user

    def test_recipe_fixed_rendering(self):
        variables = {
            "baby_age_months": 8,
            "query": "中午吃什么",
            "allergens": "无",
            "liked_foods": "无",
            "disliked_foods": "无",
            "texture_level": "泥糊",
            "recommended_texture": "碎末",
            "avoid_items": "蜂蜜",
            "notes": "测试提示",
            "knowledge_context": "测试知识库",
        }
        system, user = get_rendered_prompt("recipe_fixed", variables)
        assert "营养师" in system
        assert "8个月" in user


class TestVersionOverride:
    def test_set_and_get_prompt_version(self):
        # Arrange: store current version.
        original = get_prompt_version("extraction")

        # Act: override to v1 (which is also the default, but exercises the path).
        set_prompt_version("extraction", "v1")
        version = get_prompt_version("extraction")

        # Assert.
        assert version == "v1"

        # Restore.
        set_prompt_version("extraction", original)
