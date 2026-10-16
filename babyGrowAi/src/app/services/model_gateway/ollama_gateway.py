"""Ollama provider for the production model gateway.

Wraps the Ollama async client in the `BaseModelGateway` interface so it can
participate in routing, fallback, and cost tracking alongside external
providers.
"""

import json
import time
from typing import Any

import httpx
import ollama
from pydantic import BaseModel

from app.config import get_settings
from app.services.model_gateway.base import (
    BaseModelGateway,
    ModelOutputTruncatedError,
    ModelRequest,
    ModelResponse,
)
from app.telemetry import get_tracer

tracer = get_tracer("model_gateway.ollama")


def _extract_message_from_ollama_response(response: Any) -> dict[str, Any]:
    """Normalize Ollama chat response to a plain dict."""
    if isinstance(response, dict):
        return response.get("message", {})
    if hasattr(response, "model_dump"):
        response = response.model_dump()
    if isinstance(response, dict):
        return response.get("message", {})
    return {}


class OllamaModelGateway(BaseModelGateway):
    """Production-grade Ollama provider adapter."""

    provider: str = "ollama"

    def __init__(
        self,
        base_url: str | None = None,
        model: str | None = None,
        embedding_model: str | None = None,
        timeout: int | None = None,
        pricing: dict[str, float] | None = None,
    ):
        settings = get_settings()
        self.base_url = base_url or settings.ollama_base_url
        self._default_model = model or settings.ollama_model
        self._embedding_model = embedding_model or settings.embedding_model
        self.timeout = timeout or settings.ai_timeout
        # timeout 必须真的交给 httpx：ollama.AsyncClient 的默认值是 timeout=None，
        # 也就是**同时关掉连接超时和读取超时**。于是「Ollama 收下连接但一直不吐字」
        # （模型加载中、生成卡住）会让请求无限期挂住——路由层的云端回退永远等不到
        # 那个异常，因为它压根没抛。上面算出来的 self.timeout 之前就是这么被丢掉的。
        self.client = ollama.AsyncClient(host=self.base_url, timeout=self.timeout)
        self._pricing = pricing or {"input": 0.0, "output": 0.0}

    @property
    def default_model(self) -> str:
        return self._default_model

    @property
    def embedding_model(self) -> str:
        return self._embedding_model

    @property
    def pricing(self) -> dict[str, float]:
        return dict(self._pricing)

    async def chat(self, request: ModelRequest) -> ModelResponse:
        """Call Ollama chat and return a normalized ModelResponse."""
        settings = get_settings()
        model = request.preferred_model or self._default_model

        opts: dict[str, Any] = {
            "temperature": settings.ai_temperature,
            "top_p": settings.ai_top_p,
            "num_ctx": settings.ai_num_ctx,
        }
        # 输出上限由路由层按 task 解析后传进来（见 router._resolve_max_tokens）。
        # 放在 request.options 之前，让调用方仍能覆盖。
        if request.max_tokens is not None:
            opts["num_predict"] = request.max_tokens
        if request.options:
            opts.update(request.options)

        schema = None
        if request.format is not None:
            if isinstance(request.format, type) and issubclass(request.format, BaseModel):
                schema = request.format.model_json_schema()
            elif isinstance(request.format, dict):
                schema = request.format

        kwargs: dict[str, Any] = {
            "model": model,
            "messages": request.messages,
            "format": schema,
            "options": opts,
            "stream": request.stream,
        }
        if request.tools:
            kwargs["tools"] = request.tools

        with tracer.start_as_current_span("model_gateway.ollama.chat") as span:
            span.set_attribute("provider", self.provider)
            span.set_attribute("model", model)
            span.set_attribute("task", request.task)
            span.set_attribute("tool_count", len(request.tools) if request.tools else 0)
            span.set_attribute("message_count", len(request.messages))

            start = time.time()
            try:
                raw = await self.client.chat(**kwargs)
            except Exception as exc:
                span.set_attribute("error", True)
                span.set_attribute("error.message", str(exc))
                raise

            elapsed_ms = int((time.time() - start) * 1000)
            span.set_attribute("latency_ms", elapsed_ms)

            # Ollama returns a pydantic-like response; stream responses stay as async iterators.
            if request.stream:
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

            response_dict = raw.model_dump() if hasattr(raw, "model_dump") else dict(raw)

            # 截断检测：Ollama 用 done_reason == "length" 表示撞到了 num_predict。
            # 与 OpenAI 侧同理——响应是「成功」的，正文却断在半句上。
            # done_reason 在较老的 Ollama 版本上可能不存在，取不到就不判定。
            if response_dict.get("done_reason") == "length":
                span.set_attribute("error", True)
                span.set_attribute("error.message", "output truncated (done_reason=length)")
                raise ModelOutputTruncatedError(
                    f"输出被 num_predict={request.max_tokens} 截断"
                    f"（model={model}, task={request.task}）"
                )

            msg = _extract_message_from_ollama_response(response_dict)
            content = msg.get("content", "")
            tool_calls = msg.get("tool_calls", [])

            # Ollama reports token counts when available.
            prompt_tokens = response_dict.get("prompt_eval_count", 0) or 0
            output_tokens = response_dict.get("eval_count", 0) or 0

            span.set_attribute("input_tokens", prompt_tokens)
            span.set_attribute("output_tokens", output_tokens)
            span.set_attribute("response_has_tool_calls", bool(tool_calls))
            span.set_attribute("response_content_length", len(content))

            return ModelResponse(
                content=content,
                raw_response=response_dict,
                provider=self.provider,
                model=model,
                latency_ms=elapsed_ms,
                input_tokens=prompt_tokens,
                output_tokens=output_tokens,
                cost_usd=0.0,
                tool_calls=tool_calls,
                stream=False,
            )

    async def embed(self, texts: list[str], model: str | None = None) -> list[list[float]]:
        """Compute embeddings for the given texts."""
        embedding_model = model or self._embedding_model
        results: list[list[float]] = []

        with tracer.start_as_current_span("model_gateway.ollama.embed") as span:
            span.set_attribute("provider", self.provider)
            span.set_attribute("model", embedding_model)
            span.set_attribute("text_count", len(texts))

            start = time.time()
            try:
                for text in texts:
                    response = await self.client.embeddings(model=embedding_model, prompt=text)
                    results.append(response["embedding"])
            except Exception as exc:
                span.set_attribute("error", True)
                span.set_attribute("error.message", str(exc))
                raise

            span.set_attribute("latency_ms", int((time.time() - start) * 1000))
            span.set_attribute("vector_count", len(results))

        return results

    async def health(self) -> bool:
        """Check Ollama reachability via /api/tags."""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(f"{self.base_url}/api/tags")
                return response.status_code == 200
        except Exception:  # noqa: BLE001
            return False
