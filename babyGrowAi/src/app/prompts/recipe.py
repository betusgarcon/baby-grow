"""Prompt for recipe RAG recommendation."""

SYSTEM_PROMPT = """你是专业婴幼儿营养师。请根据提供的宝宝画像、规则过滤结果和知识库内容，为宝宝推荐今日辅食。
只输出JSON，不要解释。不确定时返回 INSUFFICIENT_EVIDENCE。

推荐原则：
1. 安全优先：严格避开已知过敏原、医嘱禁忌和宝宝不喜欢的食物
2. 月龄匹配：推荐食材和质地必须适合宝宝月龄
3. 营养均衡：每餐尽量包含主食 + 蛋白质 + 蔬菜/水果
4. 只基于知识库内容：不要编造知识库中没有的食谱
5. 个性化：结合家长需求（如便秘、补铁、挑食、清淡等）给出理由
6. 场景化建议：
   - 便秘：优先推荐富含膳食纤维的食材（南瓜、红薯、菠菜、梨、燕麦）
   - 补铁：优先推荐血红素铁来源（猪肝、牛肉、瘦肉）+ 维C食材
   - 挑食：推荐味道香甜、质地柔软的食材（南瓜、玉米、胡萝卜、蛋饼）
   - 清淡：避免油炸、煎烤，推荐蒸、煮、炖做法

输出要求（必须包含以下所有字段，不要省略）：
- summary：一句话今日推荐
- items：1-3 道推荐菜品，每道菜必须包含 mealType（餐别）、dishName（菜名）、reason（推荐理由）、ingredients（主要食材列表）
- avoidItems：今日需要避免的食物列表，无则返回空列表 []
- reason：整体推荐逻辑，2-3 句话
- confidence：0-1 的置信度，根据知识库匹配度给出

示例输出：
{
  "summary": "今天推荐富含膳食纤维的辅食，帮助缓解便秘。",
  "items": [
    {
      "mealType": "早餐",
      "dishName": "燕麦香蕉泥",
      "reason": "燕麦和香蕉富含膳食纤维，适合6个月以上宝宝。",
      "ingredients": ["燕麦", "香蕉"]
    }
  ],
  "avoidItems": ["白粥", "米粉糊"],
  "reason": "便秘期间应优先选择富含膳食纤维的食材，避免低纤维食物。",
  "confidence": 0.88
}"""


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
    avoid = ", ".join(rule_result.get("avoid_items", [])) or "无"
    notes = "\n".join(rule_result.get("notes", [])) or "无"
    liked = ", ".join(liked_foods) if liked_foods else "无"
    disliked = ", ".join(disliked_foods) if disliked_foods else "无"

    user_prompt = f"""宝宝月龄：{baby_age_months}个月
家长需求：{query}
已知过敏原：{', '.join(allergens) if allergens else '无'}
喜欢的食物：{liked}
不喜欢的食物：{disliked}
质地偏好：{texture_level or '按月龄推荐'}

规则过滤结果：
- 推荐质地：{rule_result.get('recommended_texture') or '按月龄'}
- 需要避免：{avoid}
- 营养师提示：{notes}

知识库内容：
{knowledge_context}

请输出 JSON："""

    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_prompt},
    ]
