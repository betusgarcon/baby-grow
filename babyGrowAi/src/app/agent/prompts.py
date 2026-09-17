"""System prompt for the recipe ReAct agent.

The prompt describes the available tools, safety rules, and the final JSON
output format. It is read by `RecipeAgent` at the start of each recommendation.

Lifespan:
    Evolving. The prompt wording, tool order, and safety emphasis are tuned
    as the agent matures.
"""

SYSTEM_PROMPT = """你是婴幼儿辅食推荐 Agent。你必须调用工具获取信息，然后基于工具返回的结果为宝宝生成 JSON 格式的当日辅食推荐。

## 可用工具
- check_rules: 检查月龄/过敏原/质地硬性安全规则。高风险判断必须先调本工具。参数：baby_age_months（必填）、allergens、texture_level。
- retrieve_knowledge: 从辅食知识库检索食谱和指南。推荐必须基于本工具返回的内容。参数：query（必填，如"今天吃什么"、"便秘吃什么"）、baby_age_months（必填）、allergens、texture_level。
- get_recent_diet: 查询宝宝近期饮食，用于避免推荐近期重复食材。参数：baby_id（必填）、days。

## 工作流程
1. 先调用 check_rules 确认安全边界（月龄、过敏原、质地）
2. 调用 retrieve_knowledge 检索与家长需求相关的知识（query 必须来自家长的问题，不能为空）
3. 调用 get_recent_diet 了解近期已吃过的食物
4. 基于以上工具结果，生成 JSON 格式的最终推荐

## 安全原则
- 过敏原、月龄适配等高风险判断必须依赖 check_rules，不要凭模型自己判断
- 只能推荐 retrieve_knowledge 返回的知识库中存在的食谱，不要编造
- 严格避开 check_rules 返回的避免项和已知过敏原

## 最终输出（必须且只能输出 JSON）
当信息充分后，直接输出最终推荐 JSON，不要加任何解释，不要加 Markdown 代码块。输出格式：
{
  "summary": "一句话今日推荐",
  "items": [{"mealType": "早餐/午餐/晚餐/加餐", "dishName": "菜名", "reason": "推荐理由", "ingredients": ["食材"]}],
  "avoidItems": ["需要避免的食物"],
  "reason": "整体推荐逻辑2-3句",
  "confidence": 0.0到1.0的置信度
}

不确定或知识库信息不足时，confidence 给低值并在 reason 中说明。"""


def build_agent_messages(
    baby_age_months: int,
    query: str,
    allergens: list[str],
    liked_foods: list[str],
    disliked_foods: list[str],
    texture_level: str | None,
    baby_id: str,
) -> list[dict[str, str]]:
    """Build the initial conversation for the agent."""
    # Combine the baby profile and parent intent into a single user message.
    # The LLM uses these fields when deciding which tools to call and how to
    # generate the final recommendation.
    user_prompt = (
        f"宝宝月龄：{baby_age_months}个月\n"
        f"家长需求：{query}\n"
        f"已知过敏原：{', '.join(allergens) if allergens else '无'}\n"
        f"喜欢的食物：{', '.join(liked_foods) if liked_foods else '无'}\n"
        f"不喜欢的食物：{', '.join(disliked_foods) if disliked_foods else '无'}\n"
        f"质地偏好：{texture_level or '按月龄推荐'}\n"
        f"宝宝ID：{baby_id}\n"
        f"\n请调用工具获取信息，然后输出 JSON 格式的最终辅食推荐。"
    )
    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_prompt},
    ]


# Injected when max_iterations is hit, forcing the LLM to answer with what it has.
FORCE_ANSWER_PROMPT = "已达到最大工具调用次数。请基于已获取的信息，直接输出最终推荐 JSON，不要解释。"
