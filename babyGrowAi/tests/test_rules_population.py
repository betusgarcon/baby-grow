"""Tests for population routing and rule engine integration."""

import pytest

from app.services.population_router import PopulationRouter
from app.services.rule_registry import RuleRegistry
from app.services.rules import RuleEngine


class TestPopulationRouter:
    def test_default_population(self):
        router = PopulationRouter()
        assert router.population == "baby"
        assert router.is_supported() is True

    def test_pregnant_population(self):
        router = PopulationRouter("pregnant")
        assert router.population == "pregnant"
        assert router.is_supported() is True
        context = router.get_context()
        assert context.placeholder is True
        assert "pregnant" in context.message

    def test_unsupported_population(self):
        router = PopulationRouter("athlete")
        assert router.is_supported() is False


class TestRuleRegistry:
    def test_baby_rules_include_hardcoded_marker(self):
        registry = RuleRegistry()
        rules = registry.get_rules("baby")
        assert "__hardcoded_baby__" in rules

    def test_pregnant_rules_loaded_from_file(self):
        registry = RuleRegistry()
        rules = registry.get_rules("pregnant")
        keys = [rule["key"] for rule in rules if isinstance(rule, dict)]
        assert "avoid_high_mercury_fish" in keys
        assert "ensure_folate_iron" in keys

    def test_unknown_population_returns_placeholder(self):
        registry = RuleRegistry()
        rules = registry.get_rules("worker")
        assert "__placeholder__" in rules


class TestRuleEnginePopulation:
    def test_baby_default_avoid_items(self):
        engine = RuleEngine()
        result = engine.filter_by_rules(baby_age_months=8, allergens=[])
        assert result["population"] == "baby"
        assert "蜂蜜" in result["avoid_items"]
        assert "牛奶" in result["avoid_items"]

    def test_pregnant_rules_merged(self):
        engine = RuleEngine()
        result = engine.filter_by_rules(baby_age_months=8, allergens=[], population="pregnant")
        assert result["population"] == "pregnant"
        assert "鲨鱼" in result["avoid_items"]
        assert "叶酸" in " ".join(result["notes"])

    def test_allergen_still_avoided_for_pregnant(self):
        engine = RuleEngine()
        result = engine.filter_by_rules(baby_age_months=8, allergens=["花生"], population="pregnant")
        assert "花生" in result["avoid_items"]
