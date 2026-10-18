"""Output-language plumbing: free text follows the request, enums stay canonical."""

from app.prompts.extraction import build_messages, build_vision_messages
from app.prompts.recipe import build_recipe_prompt
from app.agent.prompts import build_agent_messages
from app.prompts.language import apply_language, normalize_language


def test_normalize_language_defaults_to_chinese():
    assert normalize_language(None) == "zh"
    assert normalize_language("fr") == "zh"
    assert normalize_language("en-US") == "en"
    assert normalize_language("EN") == "en"


def test_english_directive_is_absent_for_chinese():
    system = "系统提示"
    assert apply_language(system, "zh") == system
    assert apply_language(system, None) == system


def test_english_directive_pins_enums():
    system = apply_language("系统提示", "en")
    assert "Output language" in system
    assert "语言 / 运动 / 社交 / 认知" in system
    assert "早餐 / 午餐 / 晚餐 / 加餐" in system


def test_extraction_messages_carry_language():
    messages = build_messages("first smile today", 6, language="en")
    assert "Output language" in messages[0]["content"]

    messages = build_messages("今天第一次翻身", 6, language="zh")
    assert "Output language" not in messages[0]["content"]


def test_vision_messages_carry_language():
    messages = build_vision_messages("base64", 12, note="smiled", language="en")
    assert "Output language" in messages[0]["content"]


def test_recipe_prompts_carry_language():
    fixed = build_recipe_prompt(
        baby_age_months=9,
        query="What should we eat today?",
        allergens=[],
        liked_foods=[],
        disliked_foods=[],
        texture_level=None,
        rule_result={},
        knowledge_context="",
        language="en",
    )
    assert "Output language" in fixed[0]["content"]

    agent = build_agent_messages(
        baby_age_months=9,
        query="What should we eat today?",
        allergens=[],
        liked_foods=[],
        disliked_foods=[],
        texture_level=None,
        baby_id="1",
        language="en",
    )
    assert "Output language" in agent[0]["content"]
