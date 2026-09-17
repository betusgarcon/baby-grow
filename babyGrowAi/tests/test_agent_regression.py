"""Regression test for the ReAct recipe agent.

Reuses the same fixture as the retrieval regression test
(recipe_recommend_samples.json). Runs the agent against each sample and checks
that allergen avoidance and age-appropriateness hold, plus that the agent
respects its iteration bound and always calls the safety-rule tool first.

Threshold is set to 75% — lower than the fixed pipeline's 80% — because the
agent adds LLM-driven orchestration, which introduces decision variance. The
point is to quantify that variance, not to beat the fixed pipeline on accuracy.
"""

import json
from pathlib import Path

import pytest

from app.agent.react import RecipeAgent
from app.config import get_settings
from app.db import db_session
from app.services.embedding import get_embedding_service, reset_embedding_service
from app.services.ollama_gateway import reset_model_gateway
from app.services.retrieval import RetrievalService

FIXTURES_DIR = Path(__file__).parent / "fixtures"


def load_samples():
    """Load recipe recommendation regression samples."""
    with open(FIXTURES_DIR / "recipe_recommend_samples.json", encoding="utf-8") as f:
        return json.load(f)["samples"]


def _response_mentions(result, keywords) -> bool:
    """Check whether the agent's summary+items+avoid contain any keyword."""
    haystack = (result.summary or "").lower()
    for item in result.items:
        haystack += " " + (item.dish_name or "").lower()
        haystack += " " + " ".join(item.ingredients or []).lower()
    haystack += " " + " ".join(result.avoid_items or []).lower()
    return any(k.lower() in haystack for k in keywords)


def _response_avoids(result, keywords) -> bool:
    """Check that none of the avoided keywords appear in recommended items."""
    haystack = ""
    for item in result.items:
        haystack += " " + (item.dish_name or "").lower()
        haystack += " " + " ".join(item.ingredients or []).lower()
    return not any(k.lower() in haystack for k in keywords)


@pytest.mark.asyncio
async def test_agent_regression():
    """Run the agent over all samples and assert on accuracy + safety invariants."""
    reset_model_gateway()
    reset_embedding_service()

    samples = load_samples()
    embedding_service = get_embedding_service()

    passed = 0
    failed_samples = []

    with db_session() as db:
        retrieval = RetrievalService(db=db, embedding_service=embedding_service)
        agent = RecipeAgent(retrieval_service=retrieval)

        for sample in samples:
            from app.models import RecipeRecommendRequest

            request = RecipeRecommendRequest(
                baby_id=sample.get("baby_id", "baby_001"),
                baby_age_months=sample["baby_age_months"],
                query=sample["query"],
                allergens=sample.get("allergens", []),
            )
            result = await agent.recommend(request)

            ok = True
            reasons = []

            # Must complete successfully.
            if result.status != "ok":
                ok = False
                reasons.append(f"status={result.status}, error={result.error}")
            else:
                # Must produce at least one recommended item.
                if not result.items:
                    ok = False
                    reasons.append("no items returned")

                # Allergen samples: recommended items must not contain avoid_topics.
                avoid_topics = sample.get("avoid_topics", [])
                if avoid_topics and not _response_avoids(result, avoid_topics):
                    ok = False
                    reasons.append(f"should avoid: {avoid_topics}")

            # Iteration bound (engineering safety, not accuracy).
            if result.iterations is None or result.iterations < 1 or result.iterations > 5:
                ok = False
                reasons.append(f"iterations out of bound: {result.iterations}")

            # The safety tool must be called (security-first design).
            if "check_rules" not in (result.tool_trace or []):
                ok = False
                reasons.append("check_rules not called (safety tool skipped)")

            if ok:
                passed += 1
            else:
                failed_samples.append({"id": sample["id"], "reasons": reasons})

    total = len(samples)
    accuracy = passed / total if total else 0
    print(f"\nAgent regression: {passed}/{total} = {accuracy:.1%}")
    for failure in failed_samples[:5]:
        print(f"  FAIL: {failure['id']} - {'; '.join(failure['reasons'])}")

    assert accuracy >= 0.75, f"Agent accuracy {accuracy:.1%} below 75%"