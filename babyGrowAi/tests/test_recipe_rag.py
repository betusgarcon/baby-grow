import pytest

from app.models import RecipeRecommendRequest
from app.prompts import recipe as recipe_prompts
from app.services.rules import RuleEngine


def test_rule_engine_basic():
    engine = RuleEngine()
    result = engine.filter_by_rules(
        baby_age_months=8,
        allergens=["鸡蛋"],
        texture_level="泥糊",
    )

    assert result["age_months"] == 8
    assert result["recommended_texture"] == "泥糊"
    assert "鸡蛋" in result["avoid_items"]
    assert len(result["notes"]) == 1


def test_rule_engine_under_4_months():
    engine = RuleEngine()
    result = engine.filter_by_rules(baby_age_months=3)
    assert len(result["warnings"]) >= 1
    assert "辅食" in result["avoid_items"]


def test_build_recipe_prompt():
    request = RecipeRecommendRequest(
        baby_id="test",
        baby_age_months=9,
        query="中午吃什么",
        allergens=["鸡蛋"],
    )
    rule_result = RuleEngine().filter_by_rules(
        baby_age_months=request.baby_age_months,
        allergens=request.allergens,
    )
    messages = recipe_prompts.build_recipe_prompt(
        baby_age_months=request.baby_age_months,
        query=request.query,
        allergens=request.allergens,
        liked_foods=[],
        disliked_foods=[],
        texture_level=request.texture_level,
        rule_result=rule_result,
        knowledge_context="知识库内容示例",
    )

    assert len(messages) == 2
    assert messages[0]["role"] == "system"
    assert "9个月" in messages[1]["content"]
    assert "鸡蛋" in messages[1]["content"]
