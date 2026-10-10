"""Deterministic safety rules for recipe recommendations.

The `RuleEngine` encodes hard constraints that should never be left to the
LLM: age-based avoid lists, texture guidance, and known high-risk allergens.
Both the fixed pipeline and the ReAct agent use this module.

Lifespan:
    Stable. Rules will be updated as medical guidelines evolve, but the shape of
    `filter_by_rules()` is unlikely to change.
"""

from typing import Any

from app.services.rule_registry import RuleRegistry


def merge_avoid_items(from_model: Any, declared_allergens: list[str]) -> list[str]:
    """Combine the model's "avoid" list with the allergens the parent declared.

    The prompt asks the model to carry declared allergens into its answer, but it
    does not always do so. Safety information must not depend on the model
    remembering: a parent who declared an egg allergy and gets an empty avoid
    list has been told nothing, at the exact moment they were owed a warning.
    Declared allergens are therefore always merged in.

    Order is preserved (model's own items first) and duplicates are dropped.
    """
    merged: list[str] = []
    for value in list(from_model or []) + list(declared_allergens or []):
        text = str(value).strip()
        if text and text not in merged:
            merged.append(text)
    return merged


class RuleEngine:
    """Hard rules for meal recommendations.

    These are deterministic safety rules that should not be left to the LLM.
    """

    # High-risk allergens that should always be flagged, even if the LLM misses them.
    HIGH_RISK_ALLERGENS = {"蜂蜜", "花生", "坚果", "海鲜", "虾", "蟹", "贝类"}

    def __init__(self, registry: RuleRegistry | None = None):
        self._registry = registry or RuleRegistry()

    def filter_by_rules(
        self,
        baby_age_months: int,
        allergens: list[str] | None = None,
        texture_level: str | None = None,
        population: str | None = None,
    ) -> dict[str, Any]:
        """Return age, allergen and texture guidance for the given profile.

        Args:
            baby_age_months: Current age in months.
            allergens: Known allergens provided by the parent.
            texture_level: Optional preferred texture override.
            population: Population context (default baby) used to load extra rules.

        Returns:
            A dictionary with age_months, recommended_texture, avoid_items,
            warnings, notes, and population.
        """
        warnings = []
        avoid = []
        notes = []

        # Age-based rules: under 4 months we do not recommend solids at all.
        if baby_age_months < 4:
            warnings.append("4个月以下宝宝不建议添加辅食")

        if baby_age_months < 6:
            avoid.append("辅食")
            avoid.append("固体食物")

        # Egg whites and whole nuts are not age-appropriate before 8 months.
        if baby_age_months < 8:
            avoid.append("蛋白")
            avoid.append("整颗坚果")

        # Honey, salt, sugar, and cow's milk are restricted before 12 months.
        if baby_age_months < 12:
            avoid.append("蜂蜜")
            avoid.append("盐")
            avoid.append("糖")
            avoid.append("牛奶")

        # Texture guidance based on age brackets.
        texture_map = {
            (0, 8): "泥糊",
            (9, 11): "碎末",
            (12, 18): "软块",
            (19, 60): "家常",
        }
        recommended_texture = None
        for (min_age, max_age), tex in texture_map.items():
            if min_age <= baby_age_months <= max_age:
                recommended_texture = tex
                break

        # If the caller explicitly passed a texture, prefer that for the prompt.
        if texture_level:
            recommended_texture = texture_level

        # Allergen exclusion: anything the parent reports must be avoided.
        for allergen in allergens or []:
            avoid.append(allergen)
            notes.append(f"已知过敏：{allergen}，需排除相关食谱")

        population = (population or "baby").lower()
        file_rules = self._registry.get_rules(population)
        for rule in file_rules:
            if not isinstance(rule, dict):
                continue
            if not rule.get("enabled", True):
                continue
            # Only apply rules whose simple condition matches the current profile.
            condition = rule.get("condition", "")
            if condition == "population == 'pregnant'" and population != "pregnant":
                continue
            action = rule.get("action")
            target = rule.get("target", [])
            if action == "avoid":
                for item in target:
                    avoid.append(item)
                    notes.append(f"{rule.get('key')}：避免 {item}")
            elif action == "recommend":
                notes.append(f"{rule.get('key')}：推荐 {', '.join(target)}")

        return {
            "age_months": baby_age_months,
            "recommended_texture": recommended_texture,
            "avoid_items": list(set(avoid)),
            "warnings": warnings,
            "notes": notes,
            "population": population,
        }
