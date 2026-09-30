"""Base abstractions for the production model gateway.

`BaseModelGateway` defines the uniform interface that every provider
(Ollama, OpenAI, Claude, Gemini, self-hosted) must implement. The router
operates on this abstraction so callers never need to know which provider
is serving a request.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, AsyncIterator


@dataclass
class ModelRequest:
    """Uniform request passed to any model gateway provider."""

    messages: list[dict[str, str]]
    task: str  # e.g. "extraction", "recipe_fixed", "recipe_agent", "embedding"
    format: dict[str, Any] | None = None
    tools: list[dict[str, Any]] | None = None
    options: dict[str, Any] | None = None
    stream: bool = False
    preferred_provider: str | None = None
    preferred_model: str | None = None
    max_latency_ms: int | None = None


@dataclass
class ModelResponse:
    """Uniform response returned by any model gateway provider."""

    content: str
    raw_response: dict[str, Any]
    provider: str
    model: str
    latency_ms: int
    input_tokens: int = 0
    output_tokens: int = 0
    cost_usd: float = 0.0
    tool_calls: list[dict[str, Any]] = field(default_factory=list)
    stream: bool = False


class BaseModelGateway(ABC):
    """Abstract base for all model gateway providers."""

    provider: str = ""

    @abstractmethod
    async def chat(self, request: ModelRequest) -> ModelResponse:
        """Send a chat request and return a uniform response."""
        raise NotImplementedError

    @abstractmethod
    async def embed(self, texts: list[str], model: str | None = None) -> list[list[float]]:
        """Return embedding vectors for the given texts."""
        raise NotImplementedError

    @abstractmethod
    async def health(self) -> bool:
        """Return True if the provider is healthy and reachable."""
        raise NotImplementedError

    @property
    @abstractmethod
    def default_model(self) -> str:
        """Return the default model identifier for this provider."""
        raise NotImplementedError

    @property
    def embedding_model(self) -> str:
        """Return the default embedding model identifier for this provider."""
        return self.default_model

    @property
    @abstractmethod
    def pricing(self) -> dict[str, float]:
        """Return pricing as {input_per_1m, output_per_1m}."""
        raise NotImplementedError
