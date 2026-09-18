"""Recipe prompt builder using the registry-based template system.

This module is kept for backward compatibility. New callers should prefer
``prompts.registry.get_rendered_prompt``.
"""

from app.prompts.registry import get_rendered_prompt


def build_recipe_prompt(
    baby_age_months: int,
    query: str,
    allergens: list[str],
    liked_foods: list[str],
    disliked_foods: list[str],
    texture_level: str | None,
    rule_result: dict,
    knowledge_context: str,
) -> list[dict[str, str]]:
    """Build the user message that combines profile, rules, and retrieved context."""
    avoid = ", ".join(rule_result.get("avoid_items", [])) or "无"
    notes = "\n".join(rule_result.get("notes", [])) or "无"
    liked = ", ".join(liked_foods) if liked_foods else "无"
    disliked = ", ".join(disliked_foods) if disliked_foods else "无"

    system, user = get_rendered_prompt(
        "recipe_fixed",
        {
            "baby_age_months": baby_age_months,
            "query": query,
            "allergens": ", ".join(allergens) if allergens else "无",
            "liked_foods": liked,
            "disliked_foods": disliked,
            "texture_level": texture_level or "按月龄推荐",
            "recommended_texture": rule_result.get("recommended_texture") or "按月龄",
            "avoid_items": avoid,
            "notes": notes,
            "knowledge_context": knowledge_context,
        },
    )

    return [
        {"role": "system", "content": system},
        {"role": "user", "content": user},
    ]
