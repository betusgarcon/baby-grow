from typing import Any

from app.config import get_settings
from app.models import KnowledgeChunk
from app.services.embedding import get_embedding_service


class RetrievalService:
    def __init__(self, db=None, embedding_service=None):
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
        top_k = top_k or get_settings().rag_top_k
        query_vector = await self.embedding_service.embed(query)

        # Vector similarity search against all active chunks
        if self.db is None:
            return []

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

            # Structured filter
            if not (age_min <= baby_age_months <= age_max):
                continue

            if texture_level and meta.get("texture_level") and meta.get("texture_level") != texture_level:
                continue

            # Allergen exclusion
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
