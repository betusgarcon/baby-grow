"""Allergens the parent declared must always appear in the "avoid" list.

The model is asked to carry them into its answer, but it does not always do so.
These tests pin the guarantee: safety information does not depend on the model
remembering it.
"""

from app.services.rules import merge_avoid_items


def test_declared_allergens_survive_an_empty_model_answer():
    assert merge_avoid_items(None, ["鸡蛋"]) == ["鸡蛋"]
    assert merge_avoid_items([], ["鸡蛋", "花生"]) == ["鸡蛋", "花生"]


def test_model_items_come_first_and_duplicates_are_dropped():
    merged = merge_avoid_items(["整颗坚果", "鸡蛋"], ["鸡蛋", "蜂蜜"])

    assert merged == ["整颗坚果", "鸡蛋", "蜂蜜"]


def test_blank_and_missing_values_are_ignored():
    assert merge_avoid_items(["  ", "整颗坚果"], ["", "  ", "蜂蜜"]) == ["整颗坚果", "蜂蜜"]


def test_handles_no_allergens_declared():
    assert merge_avoid_items(["整颗坚果"], []) == ["整颗坚果"]
    assert merge_avoid_items(["整颗坚果"], None) == ["整颗坚果"]
