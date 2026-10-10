"""Prompts for baby record text extraction.

The system prompt defines how to extract structured baby records from free-form
parent notes. Few-shot examples are injected into the conversation to improve
reliability for small local models.

Lifespan:
    Stable. Prompt wording and examples are tuned regularly, but the structure
    (system + few-shot + user) is unlikely to change.
"""

from app.models import ExtractionResult
from app.prompts.registry import get_rendered_prompt

# Few-shot examples help the model understand the exact JSON shape expected.
# Keep them short so they fit within the configured context window.
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
        "content": "今天去体检，体重 8.2 公斤，身高 68 厘米",
    },
    {
        "role": "assistant",
        "content": '{"growth":[{"weight_kg":8.2,"height_cm":68}]}',
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


def build_messages(text: str, baby_age_months: int, population: str | None = None) -> list[dict[str, str]]:
    """Build the full message list for the extraction task."""
    system, user = get_rendered_prompt(
        "extraction",
        {"baby_age_months": baby_age_months, "text": text},
    )
    if population and population != "baby":
        system = f"[{population} 人群记录提取]\n{system}"
    messages: list[dict[str, str]] = [{"role": "system", "content": system}]
    for example in FEW_SHOT_EXAMPLES:
        messages.append(example)
    messages.append({"role": "user", "content": user})
    return messages


# Instruction for the multimodal path. The JSON shape is still enforced by the
# `format` parameter, so few-shot text examples would only waste context here.
VISION_INSTRUCTION = (
    "这是家长上传的一张宝宝日常照片，可能附带一句说明。"
    "请从画面中提取可结构化的成长记录：里程碑、食物、奶量、睡眠、情绪、身高体重。"
    "只依据画面与说明，不要臆测画面里没有的信息；若确实没有可提取的记录，返回空对象。"
    "\n家长的补充说明：{note}"
)


def build_vision_messages(
    image_base64: str,
    baby_age_months: int,
    note: str = "",
    population: str | None = None,
) -> list[dict]:
    """Build a message list carrying an image for the VLM extraction path.

    The image rides on the user message as Ollama's `images` list (base64).
    """
    system, _ = get_rendered_prompt(
        "extraction",
        {"baby_age_months": baby_age_months, "text": note or ""},
    )
    if population and population != "baby":
        system = f"[{population} 人群记录提取]\n{system}"

    return [
        {"role": "system", "content": system},
        {
            "role": "user",
            "content": VISION_INSTRUCTION.format(note=note.strip() if note else "（无）"),
            "images": [image_base64],
        },
    ]


def get_extraction_schema() -> dict:
    """Return the JSON schema that constrines the model output."""
    return ExtractionResult.model_json_schema()
