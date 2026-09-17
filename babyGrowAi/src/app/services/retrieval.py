"""RAG retrieval over the knowledge base.

`RetrievalService` turns the user query into an embedding, runs a cosine-
similarity search over `KnowledgeChunk`, then post-filters by age range,
texture level, and known allergens.

Lifespan:
    Stable. Future improvements may include re-ranking, hybrid full-text search,
    and returning the similarity score to callers.
"""

import logging
from typing import Any

from app.config import get_settings
from app.models import KnowledgeChunk
from app.services.embedding import get_embedding_service

logger = logging.getLogger(__name__)


class RetrievalService:
    """Retrieve relevant knowledge chunks for a given baby profile and query."""

    def __init__(self, db=None, embedding_service=None):
        # `db` may be None when the service is created without an active session.
        self.db = db
        self.embedding_service = embedding_service or get_embedding_service()

    async def retrieve(
        self,
        query: str,
        baby_age_months: int,
        allergens: list[str] | None = None,
        texture_level: str | None = None,
        top_k: int | None = None,
    ) -> list[dict[str, Any]]:
        """Return the top-k knowledge chunks matching the query and baby profile.

        Args:
            query: Free-text query from the parent (e.g. "便秘").
            baby_age_months: Used to filter chunks by age range.
            allergens: Any chunk mentioning these strings is excluded.
            texture_level: Optional texture preference filter.
            top_k: Number of results to return (default from settings).
        """
        top_k = top_k or get_settings().rag_top_k

        # Guard against empty queries that produce zero-dimension vectors.
        if not query or not query.strip():
            logger.warning("Empty query passed to retrieval; returning no results.")
            return []

        query_vector = await self.embedding_service.embed(query)

        # Cannot retrieve without an active DB session.
        if self.db is None:
            return []

        # Retrieve more candidates than needed so post-filtering still leaves
        # enough results for the caller.
        chunks = (
            self.db.query(KnowledgeChunk)
            .order_by(
                KnowledgeChunk.embedding.cosine_distance(query_vector)  # type: ignore[attr-defined]
            )
            .limit(top_k * 4)
            .all()
        )

        results = []
        for chunk in chunks:
            meta = chunk.chunk_metadata or {}
            age_min = int(meta.get("age_min_month", 0) or 0)
            age_max = int(meta.get("age_max_month", 60) or 60)

            # Structured filter: drop chunks whose age range does not cover the baby.
            if not (age_min <= baby_age_months <= age_max):
                continue

            # Texture filter: exact match only when both sides specify a texture.
            if texture_level and meta.get("texture_level") and meta.get("texture_level") != texture_level:
                continue

            # Allergen exclusion: drop chunks whose content mentions an allergen.
            excluded = False
            for allergen in allergens or []:
                if allergen.lower() in chunk.content.lower():
                    excluded = True
                    break
            if excluded:
                continue

            results.append({
                "id": chunk.id,
                "document_id": chunk.document_id,
                "content": chunk.content,
                "metadata": meta,
            })

            if len(results) >= top_k:
                break

        return results
