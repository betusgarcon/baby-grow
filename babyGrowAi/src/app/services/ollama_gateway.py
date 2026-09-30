"""Ollama client gateway (legacy compatibility wrapper).

This module is kept for backward compatibility. It wraps the production
``ModelGatewayRouter`` and translates the old call signature into
``ModelRequest`` objects. New code should import from
``app.services.model_gateway`` directly.
"""

from typing import Any, AsyncIterator, Optional

from app.services.model_gateway import ModelGatewayRouter, ModelRequest, get_model_gateway_router, reset_model_gateway_router
from app.telemetry import get_tracer


# Old abstract base removed; use app.services.model_gateway.base.BaseModelGateway.
# Keep a local alias so imports still work.
class _BaseModelGateway:  # noqa: D101
    pass


tracer = get_tracer("ollama_gateway")


class OllamaGateway:
    """Backward-compatible Ollama gateway wrapper.

    Wraps the unified ``ModelGatewayRouter`` so callers that used the old
    ``chat`` / ``chat_sync`` / ``embed`` APIs continue to work without
    modification.
    """

    def __init__(self, base_url: Optional[str] = None, model: Optional[str] = None):
        self._router = get_model_gateway_router()
        # base_url / model are intentionally ignored in compatibility mode;
        # provider selection is now driven by routing config.

    async def chat(
        self,
        messages: list[dict[str, str]],
        format: Optional[dict[str, Any]] = None,
        options: Optional[dict[str, Any]] = None,
        tools: Optional[list[dict[str, Any]]] = None,
        stream: bool = False,
    ) -> dict[str, Any] | AsyncIterator[dict[str, Any]]:
        """Send a chat request through the unified router."""
        request = ModelRequest(
            messages=messages,
            task="chat",
            format=format,
            tools=tools,
            options=options,
            stream=stream,
        )
        response = await self._router.chat(request)
        # Preserve legacy return shape: a dict with {"message": {...}}
        if stream:
            # Streaming not supported via legacy wrapper; return raw-like empty.
            return {}
        return response.raw_response

    async def chat_sync(
        self,
        messages: list[dict[str, str]],
        format: Optional[dict[str, Any]] = None,
        options: Optional[dict[str, Any]] = None,
        tools: Optional[list[dict[str, Any]]] = None,
    ) -> dict[str, Any]:
        """Convenience wrapper for non-streaming chat via the router."""
        result = await self.chat(
            messages=messages,
            format=format,
            options=options,
            tools=tools,
            stream=False,
        )
        if not isinstance(result, dict):
            raise RuntimeError("Unexpected non-dict response from legacy chat")
        return result

    async def chat_stream(
        self,
        messages: list[dict[str, str]],
        options: Optional[dict[str, Any]] = None,
    ) -> AsyncIterator[str]:
        """Legacy streaming helper. Not implemented via router."""
        raise NotImplementedError("chat_stream is not supported in compatibility wrapper")

    async def embed(self, texts: list[str]) -> list[list[float]]:
        """Compute embeddings via the unified router."""
        return await self._router.embed(texts)

    async def health(self) -> bool:
        """Return True if any configured provider is healthy."""
        return await self._router.health()


# Singleton instance used by production code and tests.
_model_gateway: Optional[OllamaGateway] = None


def get_model_gateway() -> OllamaGateway:
    """Return the shared legacy gateway instance."""
    global _model_gateway
    if _model_gateway is None:
        _model_gateway = OllamaGateway()
    return _model_gateway


def reset_model_gateway() -> None:
    """Reset the singleton instance (mainly for tests)."""
    global _model_gateway
    _model_gateway = None
    reset_model_gateway_router()
