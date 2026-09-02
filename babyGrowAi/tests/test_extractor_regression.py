import json
from pathlib import Path

import pytest

from app.extractor import BabyRecordExtractor

FIXTURES_DIR = Path(__file__).parent / "fixtures"


def load_samples():
    with open(FIXTURES_DIR / "extraction_samples.json", encoding="utf-8") as f:
        return json.load(f)["samples"]


def _contains_food(result, food_name: str) -> bool:
    if not result or not result.data:
        return False
    # Extract key ingredient words from food name (e.g., 胡萝卜牛肉泥 -> 胡萝卜/牛肉)
    import re
    words = re.findall(r"[一-龥]{2,}", food_name)
    return any(
        any(word in food.name for word in words)
        for food in result.data.food
    )


def _contains_milestone(result, event: str) -> bool:
    if not result or not result.data:
        return False
    # Use key substrings from expected event for lenient matching
    keywords = [event]
    if "站" in event:
        keywords.append("站")
    if "爬" in event:
        keywords.append("爬")
    if "翻身" in event:
        keywords.append("翻身")
    if "叫" in event:
        keywords.append("叫")
    if "拍手" in event:
        keywords.append("拍手")
    if "指" in event:
        keywords.append("指")
    if "回应" in event or "名字" in event:
        keywords.extend(["回应", "名字"])
    if "抱" in event:
        keywords.append("抱")
    return any(
        any(kw in milestone.event for kw in keywords)
        for milestone in result.data.milestones
    )


def _contains_milk(result, amount: int) -> bool:
    if not result or not result.data:
        return False
    return any(milk.amount_ml == amount for milk in result.data.milk)


def _contains_sleep_duration(result, duration: int) -> bool:
    if not result or not result.data:
        return False
    return any(sleep.duration_min == duration for sleep in result.data.sleep)


@pytest.mark.asyncio
async def test_extractor_regression():
    samples = load_samples()
    extractor = BabyRecordExtractor()

    passed = 0
    failed_samples = []

    for sample in samples:
        result = await extractor.extract(sample["text"], sample["baby_age_months"])

        ok = True
        expected = sample.get("expected", {})

        if result.status != "ok":
            ok = False
            failed_samples.append({"id": sample["id"], "reason": f"status={result.status}"})
            continue

        # Check milestones
        for milestone in expected.get("milestones", []):
            if not _contains_milestone(result, milestone["event"]):
                ok = False
                failed_samples.append({
                    "id": sample["id"],
                    "reason": f"missing milestone: {milestone['event']}",
                    "expected": milestone,
                    "got": result.data.model_dump() if result.data else None,
                })

        # Check food
        for food in expected.get("food", []):
            if not _contains_food(result, food["name"]):
                ok = False
                failed_samples.append({
                    "id": sample["id"],
                    "reason": f"missing food: {food['name']}",
                })

        # Check milk
        for milk in expected.get("milk", []):
            if not _contains_milk(result, milk["amount_ml"]):
                ok = False
                failed_samples.append({
                    "id": sample["id"],
                    "reason": f"missing milk amount: {milk['amount_ml']}",
                })

        # Check sleep
        for sleep in expected.get("sleep", []):
            duration = sleep.get("duration_min")
            if duration and not _contains_sleep_duration(result, duration):
                ok = False
                failed_samples.append({
                    "id": sample["id"],
                    "reason": f"missing sleep duration: {duration}",
                })

        # Check empty case
        if not expected:
            if result.data and (result.data.milestones or result.data.food or result.data.milk or result.data.sleep or result.data.mood):
                ok = False
                failed_samples.append({
                    "id": sample["id"],
                    "reason": "expected empty but got results",
                })

        if ok:
            passed += 1

    total = len(samples)
    accuracy = passed / total if total else 0
    print(f"\nExtraction regression: {passed}/{total} = {accuracy:.1%}")
    for failure in failed_samples[:5]:
        print(f"  FAIL: {failure['id']} - {failure['reason']}")

    assert accuracy >= 0.85, f"Accuracy {accuracy:.1%} below 85%"
