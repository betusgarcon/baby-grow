from functools import lru_cache
from typing import Optional

from app.services.ollama_gateway import get_model_gateway


class EmbeddingService:
    def __init__(self, gateway=None):
        self.gateway = gateway or get_model_gateway()

    async def embed(self, text: str) -> list[float]:
        results = await self.gateway.embed([text])
        return results[0]

    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        return await self.gateway.embed(texts)


@lru_cache(maxsize=1)
def get_embedding_service() -> EmbeddingService:
    return EmbeddingService()


def reset_embedding_service() -> None:
    get_embedding_service.cache_clear()
