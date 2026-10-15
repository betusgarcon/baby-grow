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


# A query names the population it is answering for, using the caller's coarse
# vocabulary ("baby", "postpartum"), while a source declares who it was written
# for in more precise terms ("infant", "toddler", "lactating"). Both sides are
# mapped onto these slots so 婴幼儿辅食添加营养指南 still answers a "baby" query
# without a 产褥期 source leaking into one.
POPULATION_SLOTS: dict[str, set[str]] = {
    "baby": {"baby", "infant", "toddler", "preschool", "child"},
    "postpartum": {"postpartum", "lactating"},
}


def _population_slot(name: str) -> set[str]:
    """Return every declared population that a query for `name` should match."""
    return POPULATION_SLOTS.get(name, {name})


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
        population: str | None = None,
    ) -> bool:
        """Return True if the chunk passes age, population, texture, and allergen filters."""
        meta = chunk.chunk_metadata or {}
        age_min = int(meta.get("age_min_month", 0) or 0)
        age_max = int(meta.get("age_max_month", 60) or 60)

        if not (age_min <= baby_age_months <= age_max):
            return False

        # A guideline chunk declares who it was written for. Recipe and guide
        # chunks predate this field and stay unfiltered.
        populations = meta.get("population")
        if population and populations:
            if isinstance(populations, str):
                populations = [populations]
            if not _population_slot(population).intersection(populations):
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
        population: str | None = "baby",
    ) -> list[dict[str, Any]]:
        """Return the top-k knowledge chunks matching the query and baby profile.

        Uses a hybrid approach:
        1. Vector search (cosine similarity) over embeddings.
        2. Full-text search (BM25-like) over tsvector.
        3. RRF fusion of the two ranked lists.
        4. Post-filter by age, population, texture, and allergens, then return top_k.

        Args:
            query: Free-text query from the parent (e.g. "便秘").
            baby_age_months: Used to filter chunks by age range.
            allergens: Any chunk mentioning these strings is excluded.
            texture_level: Optional texture preference filter.
            top_k: Number of results to return (default from settings).
            population: Who the answer is for (e.g. "baby", "postpartum").
                Chunks declaring a population exclude queries for anyone else;
                chunks that declare none are unaffected.
        """
        # `self.db` 只在调用方自带 session 时才有值（测试，或某个请求的作用域内）。
        #
        # 单例场景下**不能**把 session 存到 self 上。原来的写法是
        # `with Session(...) as db: self.retrieval_service = RetrievalService(db=db)`——
        # 块一退出 session 就被关了，可这个 service 是进程级单例、之后每个请求都在用它；
        # 更麻烦的是它会被并发请求同时使用，而 SQLAlchemy 的 Session 不是并发安全的。
        # 所以改成：有现成的就用，没有就为这一次调用开一个短生命周期的。
        if self.db is not None:
            return await self._retrieve_with(
                self.db, query, baby_age_months, allergens, texture_level, top_k, population
            )

        from sqlalchemy.orm import Session

        from app.models import get_engine

        with Session(bind=get_engine()) as db:
            return await self._retrieve_with(
                db, query, baby_age_months, allergens, texture_level, top_k, population
            )

    async def _retrieve_with(
        self,
        db: Any,
        query: str,
        baby_age_months: int,
        allergens: list[str] | None,
        texture_level: str | None,
        top_k: int | None,
        population: str | None,
    ) -> list[dict[str, Any]]:
        """真正的检索实现。session 由调用方提供，生命周期也由调用方负责。"""
        top_k = top_k or get_settings().rag_top_k

        # Guard against empty queries that produce zero-dimension vectors.
        if not query or not query.strip():
            logger.warning("Empty query passed to retrieval; returning no results.")
            return []

        query_vector = await self.embedding_service.embed(query)

        # 1. Vector search: top candidates by cosine distance.
        vector_candidates = (
            db.query(KnowledgeChunk)
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
                db.query(KnowledgeChunk)
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

            if not self._filter_chunk(chunk, baby_age_months, allergens, texture_level, population):
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
