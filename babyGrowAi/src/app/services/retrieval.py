"""RAG retrieval over the knowledge base.

`RetrievalService` turns the user query into an embedding, runs a cosine-
similarity search over `KnowledgeChunk`, then post-filters by age range,
texture level, and known allergens. It also supports hybrid full-text search
(BM25-like via PostgreSQL tsvector) fused with vector search using RRF.

Lifespan:
    Evolving. Future improvements may include re-ranking, query expansion, and
    tenant-aware filtering.
"""

import logging
from typing import Any

from sqlalchemy import func, text

from app.config import get_settings
from app.models import KnowledgeChunk
from app.services.embedding import get_embedding_service
from app.services.retrieval_rrf import reciprocal_rank_fusion

logger = logging.getLogger(__name__)


def _cosine_similarity_from_distance(distance: float) -> float:
    """Convert pgvector cosine_distance to cosine similarity.

    pgvector returns cosine_distance = 1 - cosine_similarity.
    """
    return max(0.0, 1.0 - distance)


def _tokenize_for_tsvector(content: str) -> str:
    """Return a space-separated token string suitable for to_tsvector('simple', ...).

    PostgreSQL's built-in Chinese full-text parser is not always available, so
    we tokenize manually. Each CJK character is treated as a token, and English
    words are kept as-is. This is enough for keyword-level full-text matching.
    """
    import re

    tokens = re.findall(r"[一-鿿]+", content)
    words = [w for w in re.findall(r"[a-zA-Z]+", content) if len(w) > 1]
    tokens.extend(words)
    return " ".join(tokens)


class RetrievalService:
    """Retrieve relevant knowledge chunks for a given baby profile and query."""

    def __init__(self, db=None, embedding_service=None):
        # `db` may be None when the service is created without an active session.
        self.db = db
        self.embedding_service = embedding_service or get_embedding_service()

    def _filter_chunk(
        self,
        chunk: KnowledgeChunk,
        baby_age_months: int,
        allergens: list[str] | None,
        texture_level: str | None,
    ) -> bool:
        """Return True if the chunk passes age, texture, and allergen filters."""
        meta = chunk.chunk_metadata or {}
        age_min = int(meta.get("age_min_month", 0) or 0)
        age_max = int(meta.get("age_max_month", 60) or 60)

        if not (age_min <= baby_age_months <= age_max):
            return False

        if texture_level and meta.get("texture_level") and meta.get("texture_level") != texture_level:
            return False

        for allergen in allergens or []:
            if allergen.lower() in chunk.content.lower():
                return False

        return True

    async def retrieve(
        self,
        query: str,
        baby_age_months: int,
        allergens: list[str] | None = None,
        texture_level: str | None = None,
        top_k: int | None = None,
    ) -> list[dict[str, Any]]:
        """Return the top-k knowledge chunks matching the query and baby profile.

        Uses a hybrid approach:
        1. Vector search (cosine similarity) over embeddings.
        2. Full-text search (BM25-like) over tsvector.
        3. RRF fusion of the two ranked lists.
        4. Post-filter by age, texture, and allergens, then return top_k.

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

        # Cannot retrieve without an active DB session.
        if self.db is None:
            return []

        query_vector = await self.embedding_service.embed(query)

        # 1. Vector search: top candidates by cosine distance.
        vector_candidates = (
            self.db.query(KnowledgeChunk)
            .order_by(KnowledgeChunk.embedding.cosine_distance(query_vector))  # type: ignore[attr-defined]
            .limit(top_k * 4)
            .all()
        )

        # 2. Full-text search: keyword-level matches over tsvector.
        ts_query = " | ".join(_tokenize_for_tsvector(query).split())
        if not ts_query:
            text_candidates: list[KnowledgeChunk] = []
        else:
            text_candidates = (
                self.db.query(KnowledgeChunk)
                .filter(text("search_vector @@ to_tsquery('simple', :q)").bindparams(q=ts_query))
                .order_by(func.ts_rank_cd(KnowledgeChunk.search_vector, text("to_tsquery('simple', :q)").bindparams(q=ts_query)).desc())
                .limit(top_k * 4)
                .all()
            )

        # 3. Build score maps and fuse with RRF.
        vector_scores: dict[int, float] = {}
        for chunk in vector_candidates:
            if chunk.embedding is None:
                continue
            if hasattr(chunk.embedding, "cosine_distance"):
                distance = float(chunk.embedding.cosine_distance(query_vector))
            else:
                # Ollama provider returns plain list vectors; compute cosine manually.
                import math

                a = chunk.embedding
                b = query_vector
                dot = sum(x * y for x, y in zip(a, b))
                norm_a = math.sqrt(sum(x * x for x in a))
                norm_b = math.sqrt(sum(x * x for x in b))
                distance = 1.0 - dot / (norm_a * norm_b) if norm_a and norm_b else 1.0
            vector_scores[chunk.id] = _cosine_similarity_from_distance(distance)

        text_scores: dict[int, float] = {}
        for chunk in text_candidates:
            text_scores[chunk.id] = 1.0

        fused = reciprocal_rank_fusion([vector_scores, text_scores], k=60)

        # 4. Fetch full records in fused order, filter, and return top_k.
        chunk_map = {c.id: c for c in vector_candidates}
        chunk_map.update({c.id: c for c in text_candidates})

        results: list[dict[str, Any]] = []
        for chunk_id, rrf_score in fused:
            chunk = chunk_map.get(chunk_id)
            if chunk is None:
                continue

            if not self._filter_chunk(chunk, baby_age_months, allergens, texture_level):
                continue

            meta = chunk.chunk_metadata or {}

            # For items that came from the text path, compute similarity from RRF.
            vector_similarity = vector_scores.get(chunk_id, 0.0)
            similarity = vector_similarity if vector_similarity > 0.0 else rrf_score

            results.append({
                "id": chunk.id,
                "document_id": chunk.document_id,
                "content": chunk.content,
                "metadata": meta,
                "similarity": similarity,
                "rrf_score": rrf_score,
            })

            if len(results) >= top_k:
                break

        return results
