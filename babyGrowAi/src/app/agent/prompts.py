"""System prompt for the recipe ReAct agent.

The prompt describes the available tools, safety rules, and the final JSON
output format. It is read by `RecipeAgent` at the start of each recommendation.

Lifespan:
    Evolving. The prompt wording, tool order, and safety emphasis are tuned
    as the agent matures.
"""

from app.prompts.registry import get_rendered_prompt


def build_agent_messages(
    baby_age_months: int,
    query: str,
    allergens: list[str],
    liked_foods: list[str],
    disliked_foods: list[str],
    texture_level: str | None,
    baby_id: str,
    population: str | None = None,
) -> list[dict[str, str]]:
    """Build the initial conversation for the agent."""
    # Combine the baby profile and parent intent into a single user message.
    # The LLM uses these fields when deciding which tools to call and how to
    # generate the final recommendation.
    system, user = get_rendered_prompt(
        "recipe_agent",
        {
            "baby_age_months": baby_age_months,
            "query": query,
            "allergens": ", ".join(allergens) if allergens else "无",
            "liked_foods": ", ".join(liked_foods) if liked_foods else "无",
            "disliked_foods": ", ".join(disliked_foods) if disliked_foods else "无",
            "texture_level": texture_level or "按月龄推荐",
            "baby_id": baby_id,
        },
    )
    if population and population != "baby":
        system = f"[{population} 人群辅食推荐 Agent]\n{system}"
    return [
        {"role": "system", "content": system},
        {"role": "user", "content": user},
    ]


# Injected when max_iterations is hit, forcing the LLM to answer with what it has.
FORCE_ANSWER_PROMPT = "已达到最大工具调用次数。请基于已获取的信息，直接输出最终推荐 JSON，不要解释。"
