"""Citation tests for recipe recommendation.

Validates that both the fixed pipeline and the ReAct agent return
non-empty source_refs with real chunk ids.
"""

import pytest

from app.agent.react import RecipeAgent
from app.config import get_settings
from app.db import db_session
from app.models import RecipeRecommendRequest
from app.recipe_rag import RecipeRAGService
from app.services.embedding import get_embedding_service, reset_embedding_service
from app.services.ollama_gateway import reset_model_gateway
from app.services.retrieval import RetrievalService


@pytest.mark.asyncio
async def test_fixed_pipeline_source_refs():
    """The fixed pipeline should attach real chunk references."""
    reset_model_gateway()
    reset_embedding_service()

    request = RecipeRecommendRequest(
        baby_id="baby_001",
        baby_age_months=9,
        query="补铁",
        allergens=[],
    )
    service = RecipeRAGService()

    result = await service.recommend(request, use_agent=False)

    assert result.status == "ok"
    assert result.source_refs, "fixed pipeline should return source_refs"
    for ref in result.source_refs:
        assert ref.chunk_id > 0
        assert ref.document_id > 0
        assert ref.content
        assert ref.similarity > 0.0, "source_ref similarity must be real, not placeholder"


@pytest.mark.asyncio
async def test_agent_source_refs():
    """The ReAct agent should attach real chunk references to recommended items."""
    reset_model_gateway()
    reset_embedding_service()

    with db_session() as db:
        retrieval = RetrievalService(db=db, embedding_service=get_embedding_service())
        agent = RecipeAgent(retrieval_service=retrieval)

        request = RecipeRecommendRequest(
            baby_id="baby_001",
            baby_age_months=9,
            query="补铁吃什么",
            allergens=[],
        )
        result = await agent.recommend(request)

    assert result.status == "ok"
    assert result.items, "agent should produce at least one item"

    # Every recommended item should bind to at least one chunk.
    for item in result.items:
        assert item.source_chunk_ids, f"item {item.dish_name} missing source_chunk_ids"

    # Deduped source_refs should cover all item bindings.
    bound_chunk_ids = {cid for item in result.items for cid in item.source_chunk_ids}
    returned_chunk_ids = {ref.chunk_id for ref in result.source_refs}
    assert bound_chunk_ids.issubset(returned_chunk_ids), "source_refs missing item bindings"

    for ref in result.source_refs:
        assert ref.chunk_id > 0
        assert ref.document_id > 0
        assert ref.content
        assert ref.similarity >= 0.0
