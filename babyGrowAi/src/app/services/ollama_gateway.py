"""Ollama client gateway.

Centralizes all calls to the Ollama server (chat completions, embeddings, and
health checks). Supports both streaming and non-streaming chat, JSON schema
formatting, and native tool calling.

Lifespan:
    Stable. Will be extended in the future with an external-model fallback when
    config.external_model_enabled is True.
"""

import json
import time
from abc import ABC, abstractmethod
from typing import Any, AsyncIterator, Iterator, Optional

import httpx
import ollama
from pydantic import BaseModel

from app.config import get_settings


class BaseModelGateway(ABC):
    """Abstract base for model gateways.

    Reserved for future external model fallback (OpenAI-compatible APIs).
    """

    @abstractmethod
    async def chat(
        self,
        messages: list[dict[str, str]],
        format: Optional[dict[str, Any]] = None,
        options: Optional[dict[str, Any]] = None,
        tools: Optional[list[dict[str, Any]]] = None,
        stream: bool = False,
    ) -> dict[str, Any] | AsyncIterator[dict[str, Any]]:
        """Send a chat request to the model and return the response."""
        raise NotImplementedError

    @abstractmethod
    async def embed(self, texts: list[str]) -> list[list[float]]:
        """Return embedding vectors for the given texts."""
        raise NotImplementedError


class OllamaGateway(BaseModelGateway):
    """Concrete gateway for the Ollama local model server."""

    def __init__(self, base_url: Optional[str] = None, model: Optional[str] = None):
        settings = get_settings()
        self.base_url = base_url or settings.ollama_base_url
        self.model = model or settings.ollama_model
        self.timeout = settings.ai_timeout
        self.client = ollama.AsyncClient(host=self.base_url)

    async def chat(
        self,
        messages: list[dict[str, str]],
        format: Optional[dict[str, Any]] | type[BaseModel] = None,
        options: Optional[dict[str, Any]] = None,
        tools: Optional[list[dict[str, Any]]] = None,
        stream: bool = False,
    ) -> dict[str, Any] | AsyncIterator[dict[str, Any]]:
        """Call the Ollama chat endpoint.

        Args:
            messages: The conversation history (OpenAI-style role/content dicts).
            format: Optional JSON schema or Pydantic model to constrain output.
            options: Extra generation options (temperature, top_p, etc.).
            tools: Tool schemas for native function calling.
            stream: Whether to stream the response.
        """
        settings = get_settings()
        opts = {
            "temperature": settings.ai_temperature,
            "top_p": settings.ai_top_p,
            "num_ctx": settings.ai_num_ctx,
        }
        if options:
            opts.update(options)

        # Convert a Pydantic model to its JSON schema for Ollama's format param.
        schema = None
        if format is not None:
            if isinstance(format, type) and issubclass(format, BaseModel):
                schema = format.model_json_schema()
            elif isinstance(format, dict):
                schema = format

        kwargs: dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "format": schema,
            "options": opts,
            "stream": stream,
        }
        # Ollama native tool calling: only pass tools when provided so that
        # non-agent callers (extraction, fixed-pipeline recipe) are unaffected.
        if tools:
            kwargs["tools"] = tools

        return await self.client.chat(**kwargs)

    async def chat_sync(
        self,
        messages: list[dict[str, str]],
        format: Optional[dict[str, Any] | type[BaseModel]] = None,
        options: Optional[dict[str, Any]] = None,
        tools: Optional[list[dict[str, Any]]] = None,
    ) -> dict[str, Any]:
        """Convenience wrapper for non-streaming chat with one retry."""
        # Retry once with exponential back-off to tolerate transient Ollama
        # connection hiccups without failing the whole request.
        last_error = None
        for attempt in range(2):
            try:
                response = await self.chat(
                    messages, format=format, options=options, tools=tools, stream=False
                )
                return response  # type: ignore[return-value]
            except Exception as exc:  # noqa: BLE001
                last_error = exc
                time.sleep(0.5 * (attempt + 1))
        raise last_error or RuntimeError("Ollama chat failed")

    async def chat_stream(
        self,
        messages: list[dict[str, str]],
        options: Optional[dict[str, Any]] = None,
    ) -> AsyncIterator[str]:
        """Yields content tokens from a streaming chat."""
        response = await self.chat(messages, options=options, stream=True)
        async for chunk in response:  # type: ignore[attr-defined]
            if chunk and "message" in chunk and chunk["message"].get("content"):
                yield chunk["message"]["content"]

    async def embed(self, texts: list[str]) -> list[list[float]]:
        """Return embedding vectors for each text using the configured embedding model."""
        settings = get_settings()
        model = settings.embedding_model
        results = []
        for text in texts:
            response = await self.client.embeddings(model=model, prompt=text)
            results.append(response["embedding"])
        return results

    async def health(self) -> bool:
        """Check if the Ollama server is reachable by hitting /api/tags."""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(f"{self.base_url}/api/tags")
                return response.status_code == 200
        except Exception:  # noqa: BLE001
            return False


# Singleton instance used by production code and tests.
_model_gateway: Optional[OllamaGateway] = None


def get_model_gateway() -> OllamaGateway:
    """Return the shared Ollama gateway instance."""
    global _model_gateway
    if _model_gateway is None:
        _model_gateway = OllamaGateway()
    return _model_gateway


def reset_model_gateway() -> None:
    """Reset the singleton instance (mainly for tests)."""
    global _model_gateway
    _model_gateway = None
