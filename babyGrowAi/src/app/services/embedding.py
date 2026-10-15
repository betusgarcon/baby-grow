"""Thin wrapper around the model gateway for embeddings.

Hides the gateway-specific details from the rest of the application. Callers
simply ask for a single embedding or a batch.

Lifespan:
    Stable. May be extended to support caching or batch-size limits.
"""

from functools import lru_cache
from typing import Optional

from app.services.ollama_gateway import get_model_gateway


class EmbeddingService:
    """Compute text embeddings via the configured embedding model."""

    def __init__(self, gateway=None):
        self.gateway = gateway or get_model_gateway()

    async def embed(self, text: str) -> list[float]:
        """Return the embedding vector for a single text."""
        results = await self.gateway.embed([text])
        # 供应商理论上回一条就是一条，但真回空了的话这里会是一个 IndexError——
        # 报错信息完全指不到「向量服务异常」这件事上。显式判一下。
        if not results:
            raise RuntimeError("向量服务没有返回任何 embedding（输入 1 条，返回 0 条）")
        return results[0]

    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        """Return embedding vectors for a list of texts."""
        return await self.gateway.embed(texts)


@lru_cache(maxsize=1)
def get_embedding_service() -> EmbeddingService:
    """Return the shared embedding service."""
    return EmbeddingService()


def reset_embedding_service() -> None:
    """Reset the singleton instance (mainly for tests)."""
    get_embedding_service.cache_clear()
