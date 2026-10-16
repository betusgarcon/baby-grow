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
    """Uniform request passed to any model gateway provider.

    Messages follow the Ollama/OpenAI shape. Individual messages may carry extra
    keys beyond role/content — notably ``images`` (a list of base64 strings) for
    multimodal models — so the value type is deliberately loose.
    """

    messages: list[dict[str, Any]]
    task: str  # e.g. "extraction", "vision", "recipe_fixed", "recipe_agent", "embedding"
    format: dict[str, Any] | None = None
    tools: list[dict[str, Any]] | None = None
    options: dict[str, Any] | None = None
    stream: bool = False
    preferred_provider: str | None = None
    preferred_model: str | None = None
    max_latency_ms: int | None = None
    # 输出上限（token）。None 表示由路由层按 task 解析；调用方一般不要设它——
    # 它存在的意义是让路由层在**输出被截断时能加倍重试**，见 ModelOutputTruncatedError。
    max_tokens: int | None = None


class ModelOutputTruncatedError(RuntimeError):
    """模型输出撞到了 max_tokens 上限，正文被截断。

    为什么值得单独一个异常类型：被截断的响应**看起来是成功的**——HTTP 200、
    finish_reason 是 "length" 而不是 "stop"，正文是一个断在半句上的 JSON。
    交给下游就是一次莫名其妙的 JSON 解析失败；而对 JSON schema 约束的输出，
    截断几乎必然导致解析失败。

    有了这个类型，路由层可以把它和「网络抖动」区分开：网络问题用退避重试，
    而截断**重试同样的请求只会再截断一次**——必须加大预算才有意义。
    """


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
