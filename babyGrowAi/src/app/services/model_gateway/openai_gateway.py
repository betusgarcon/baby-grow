"""OpenAI-compatible provider for the production model gateway.

Supports OpenAI, Azure OpenAI, and any self-hosted / reverse proxy that
exposes a compatible `/v1/chat/completions` endpoint.
"""

import json
import time
from typing import Any

import httpx
from openai import AsyncOpenAI
from pydantic import BaseModel

from app.config import get_settings
from app.services.model_gateway.base import BaseModelGateway, ModelRequest, ModelResponse
from app.telemetry import get_tracer

tracer = get_tracer("model_gateway.openai")


def _count_tokens_approx(messages: list[dict[str, str]]) -> int:
    """Rough token count for the input messages when usage is missing."""
    total = 0
    for m in messages:
        total += len(m.get("content", "")) // 4
        total += 4
    return total


class OpenAIModelGateway(BaseModelGateway):
    """OpenAI-compatible provider adapter."""

    provider: str = "openai"

    def __init__(
        self,
        api_key: str | None = None,
        base_url: str | None = None,
        model: str | None = None,
        timeout: int | None = None,
        pricing: dict[str, float] | None = None,
    ):
        settings = get_settings()
        self._default_model = model or settings.external_model_name or "gpt-4o-mini"
        self.timeout = timeout or settings.ai_timeout
        self._pricing = pricing or {"input": 0.0, "output": 0.0}

        # Use provided key or fall back to the legacy external config.
        key = api_key or settings.external_model_api_key
        url = base_url or settings.external_model_base_url

        kwargs: dict[str, Any] = {"timeout": self.timeout}
        if key:
            kwargs["api_key"] = key
        if url:
            kwargs["base_url"] = url
        self.client = AsyncOpenAI(**kwargs)

    @property
    def default_model(self) -> str:
        return self._default_model

    @property
    def embedding_model(self) -> str:
        return "text-embedding-3-small"

    @property
    def pricing(self) -> dict[str, float]:
        return dict(self._pricing)

    def _normalize_format(self, fmt: Any) -> dict[str, Any] | None:
        if fmt is None:
            return None
        if isinstance(fmt, type) and issubclass(fmt, BaseModel):
            return fmt.model_json_schema()
        return fmt if isinstance(fmt, dict) else None

    async def chat(self, request: ModelRequest) -> ModelResponse:
        """Call OpenAI-compatible chat completions endpoint."""
        model = request.preferred_model or self._default_model
        schema = self._normalize_format(request.format)

        kwargs: dict[str, Any] = {
            "model": model,
            "messages": request.messages,
            "temperature": (request.options or {}).get("temperature", 0.1),
            "stream": request.stream,
        }
        if schema:
            kwargs["response_format"] = {"type": "json_schema", "json_schema": {"name": "result", "schema": schema}}
        if request.tools:
            kwargs["tools"] = request.tools
            kwargs["tool_choice"] = "auto"

        with tracer.start_as_current_span("model_gateway.openai.chat") as span:
            span.set_attribute("provider", self.provider)
            span.set_attribute("model", model)
            span.set_attribute("task", request.task)

            start = time.time()
            try:
                raw = await self.client.chat.completions.create(**kwargs)
            except Exception as exc:
                span.set_attribute("error", True)
                span.set_attribute("error.message", str(exc))
                raise

            elapsed_ms = int((time.time() - start) * 1000)
            span.set_attribute("latency_ms", elapsed_ms)

            # For non-streaming, extract usage and content.
            if not request.stream:
                choice = raw.choices[0] if raw.choices else None
                content = choice.message.content if choice and choice.message else ""
                tool_calls: list[dict[str, Any]] = []
                if choice and choice.message and choice.message.tool_calls:
                    for tc in choice.message.tool_calls:
                        tool_calls.append({
                            "id": tc.id,
                            "function": {
                                "name": tc.function.name,
                                "arguments": tc.function.arguments,
                            },
                        })
                usage = raw.usage or {}
                input_tokens = usage.get("prompt_tokens") or _count_token_approx(request.messages)
                output_tokens = usage.get("completion_tokens") or len(content) // 4
                span.set_attribute("input_tokens", input_tokens)
                span.set_attribute("output_tokens", output_tokens)
                return ModelResponse(
                    content=content,
                    raw_response=raw.model_dump(),
                    provider=self.provider,
                    model=model,
                    latency_ms=elapsed_ms,
                    input_tokens=input_tokens,
                    output_tokens=output_tokens,
                    cost_usd=0.0,
                    tool_calls=tool_calls,
                    stream=False,
                )

            # Streaming not fully supported in ModelResponse yet.
            return ModelResponse(
                content="",
                raw_response={},
                provider=self.provider,
                model=model,
                latency_ms=elapsed_ms,
                input_tokens=0,
                output_tokens=0,
                cost_usd=0.0,
                stream=True,
            )

    async def embed(self, texts: list[str], model: str | None = None) -> list[list[float]]:
        embedding_model = model or "text-embedding-3-small"
        with tracer.start_as_current_span("model_gateway.openai.embed") as span:
            span.set_attribute("provider", self.provider)
            span.set_attribute("model", embedding_model)
            response = await self.client.embeddings.create(input=texts, model=embedding_model)
            return [item.embedding for item in response.data]

    async def health(self) -> bool:
        """Check OpenAI API health by listing models (lightweight)."""
        try:
            await self.client.models.list()
            return True
        except Exception:  # noqa: BLE001
            return False
