import json
from pathlib import Path

import pytest

from app.config import get_settings
from app.db import db_session
from app.models import get_engine
from app.services.embedding import get_embedding_service, reset_embedding_service
from app.services.ollama_gateway import reset_model_gateway
from app.services.retrieval import RetrievalService

FIXTURES_DIR = Path(__file__).parent / "fixtures"


def load_samples():
    with open(FIXTURES_DIR / "recipe_recommend_samples.json", encoding="utf-8") as f:
        return json.load(f)["samples"]


def _retrieved_contains(retrieved, keywords) -> bool:
    content = "\n".join([r["content"] for r in retrieved]).lower()
    return any(k.lower() in content for k in keywords)


def _contains_expected_recipes(retrieved, recipe_names) -> bool:
    content = "\n".join([r["content"] for r in retrieved]).lower()
    return any(name.lower() in content for name in recipe_names)


@pytest.mark.asyncio
async def test_retrieval_regression():
    # Reset cached clients to avoid event loop issues between tests
    reset_model_gateway()
    reset_embedding_service()

    samples = load_samples()
    embedding_service = get_embedding_service()

    passed = 0
    failed_samples = []

    with db_session() as db:
        retrieval = RetrievalService(db=db, embedding_service=embedding_service)

        for sample in samples:
            retrieved = await retrieval.retrieve(
                query=sample["query"],
                baby_age_months=sample["baby_age_months"],
                allergens=sample.get("allergens", []),
                top_k=get_settings().rag_top_k,
            )

            ok = True
            reasons = []

            # Check expected topics
            expected_topics = sample.get("expected_topics", [])
            if expected_topics and not _retrieved_contains(retrieved, expected_topics):
                ok = False
                reasons.append(f"missing topics: {expected_topics}")

            # Check expected recipes
            expected_recipes = sample.get("expected_recipes", [])
            if expected_recipes and not _contains_expected_recipes(retrieved, expected_recipes):
                ok = False
                reasons.append(f"missing recipes: {expected_recipes}")

            # Check avoided topics/recipes
            avoid_topics = sample.get("avoid_topics", [])
            if avoid_topics and _retrieved_contains(retrieved, avoid_topics):
                ok = False
                reasons.append(f"should avoid: {avoid_topics}")

            # Check age appropriateness
            for r in retrieved:
                meta = r.get("metadata", {})
                age_min = meta.get("age_min_month", 0)
                age_max = meta.get("age_max_month", 60)
                if not (age_min <= sample["baby_age_months"] <= age_max):
                    ok = False
                    reasons.append(f"age mismatch: {r['content'][:30]}")

            if ok:
                passed += 1
            else:
                failed_samples.append({
                    "id": sample["id"],
                    "reasons": reasons,
                })

    total = len(samples)
    accuracy = passed / total if total else 0
    print(f"\nRetrieval regression: {passed}/{total} = {accuracy:.1%}")
    for failure in failed_samples[:5]:
        print(f"  FAIL: {failure['id']} - {'; '.join(failure['reasons'])}")

    assert accuracy >= 0.80, f"Retrieval accuracy {accuracy:.1%} below 80%"
