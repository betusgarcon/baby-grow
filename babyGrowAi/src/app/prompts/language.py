"""Language directive for model output.

Free-text fields follow the caller's language; enumerated fields stay on the
canonical values the Java backend maps on. Translating ``type``/``category``/
``mood``/``mealType`` would silently break those mappings, so the directive
pins them explicitly.
"""

DEFAULT_LANGUAGE = "zh"

_EN_DIRECTIVE = """

## Output language
Write every free-text value (summary, reason, dish name, event description, notes) in English.
Keep these enumerated fields exactly as defined above, untranslated:
- milestone type: 语言 / 运动 / 社交 / 认知
- food category: 蔬菜 / 水果 / 谷物 / 蛋类 / 肉类 / 豆制品 / 奶制品
- mood: 开心 / 黏人烦躁 / 身体不适
- mealType: 早餐 / 午餐 / 晚餐 / 加餐
When you cite retrieved knowledge written in Chinese, paraphrase it in English instead of copying the Chinese wording.
"""


def normalize_language(value: str | None) -> str:
    """Return ``en`` or ``zh``; anything unrecognized falls back to Chinese."""
    return "en" if value and value.strip().lower().startswith("en") else DEFAULT_LANGUAGE


def apply_language(system: str, language: str | None) -> str:
    """Append the output-language directive when the request is English."""
    return system + _EN_DIRECTIVE if normalize_language(language) == "en" else system
