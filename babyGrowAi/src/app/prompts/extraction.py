"""Prompts for baby record text extraction."""

from app.models import ExtractionResult

SYSTEM_PROMPT = """你是宝宝成长记录信息提取助手。从家长描述中提取里程碑、食物、奶量、睡眠、情绪信息。
只输出JSON，不要解释。输出最精简的JSON，不要包含空字段。

提取规则：
1. 里程碑：识别"第一次/首次/会...了"等表达，按语言/运动/社交/认知分类
2. 食物：提取食物名称，按蔬菜/水果/谷物/蛋类/肉类/豆制品/奶制品分类，判断是否首次食用
3. 奶量：提取母乳/配方奶的量（ml）和时间段
4. 睡眠：提取睡眠时长、质量
5. 情绪：提取情绪状态、触发原因
6. 没有相关信息时返回空对象 {}

注意：
- 不要编造没有的信息
- is_first 仅在家长明确表达"第一次/首次"或"第一次吃"时才为 true
- 不要包含空字段"""

FEW_SHOT_EXAMPLES = [
    {
        "role": "user",
        "content": "第一次喊妈妈，喝了800ml母乳，吃了胡萝卜泥",
    },
    {
        "role": "assistant",
        "content": '{"milestones":[{"type":"语言","event":"首次喊妈妈","is_first":true}],"food":[{"name":"胡萝卜泥","category":"蔬菜","is_first":true}],"milk":[{"type":"母乳","amount_ml":800,"period":"全天"}]}',
    },
    {
        "role": "user",
        "content": "中午喂了蛋黄泥和米粉",
    },
    {
        "role": "assistant",
        "content": '{"food":[{"name":"蛋黄泥","category":"蛋类","is_first":false},{"name":"米粉","category":"谷物","is_first":false}]}',
    },
    {
        "role": "user",
        "content": "宝宝今天会自己抓东西往嘴里塞了",
    },
    {
        "role": "assistant",
        "content": '{"milestones":[{"type":"运动","event":"首次自主抓握食物送入口中","is_first":true}]}',
    },
    {
        "role": "user",
        "content": "昨晚睡了10个小时，早上醒来看起来精神很好",
    },
    {
        "role": "assistant",
        "content": '{"sleep":[{"duration_min":600,"quality":"好"}]}',
    },
    {
        "role": "user",
        "content": "宝宝今天莫名其妙地哭闹，怎么哄都哄不好",
    },
    {
        "role": "assistant",
        "content": '{"mood":[{"mood":"烦躁","trigger":"不明"}]}',
    },
    {
        "role": "user",
        "content": "今天天气真好，带宝宝出去晒了太阳",
    },
    {
        "role": "assistant",
        "content": '{}',
    },
    {
        "role": "user",
        "content": "娃儿今朝第一次翻身咯，还吃了点苹果泥",
    },
    {
        "role": "assistant",
        "content": '{"milestones":[{"type":"运动","event":"首次翻身","is_first":true}],"food":[{"name":"苹果泥","category":"水果","is_first":true}]}',
    },
]


def build_messages(text: str, baby_age_months: int) -> list[dict[str, str]]:
    system = (
        SYSTEM_PROMPT
        + f"\n宝宝当前{baby_age_months}个月。"
    )
    messages: list[dict[str, str]] = [
        { "role": "system", "content": system},
    ]
    for example in FEW_SHOT_EXAMPLES:
        messages.append(example)
    messages.append({"role": "user", "content": text})
    return messages


def get_extraction_schema() -> dict:
    return ExtractionResult.model_json_schema()
