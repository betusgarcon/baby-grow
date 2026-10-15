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
        # `or ""`：带 tool_calls 的助手消息 content 就是 None，而
        # m.get("content", "") 在「键存在、值为 None」时返回 None，不是默认值——
        # len(None) 会直接抛 TypeError，把一次正常的调用判成失败。
        total += len(m.get("content") or "") // 4
        total += 4
    return total


def _tool_calls_of(message: Any) -> list[dict[str, Any]]:
    """把 SDK 的 tool_calls 转成可回传的普通 dict 列表。

    `type` **不能省**：ReAct agent 会把 assistant 这条消息连同 tool_calls 原样回传，
    DeepSeek 严格校验请求体，缺了它整轮报 422「missing field `type`」——
    第一轮调用看着完全正常，第二轮才炸，很难定位。
    """
    calls = getattr(message, "tool_calls", None) or []
    return [
        {
            "id": tc.id,
            "type": "function",
            "function": {"name": tc.function.name, "arguments": tc.function.arguments},
        }
        for tc in calls
    ]


def _usage_tokens(raw: Any) -> tuple[int, int]:
    """从响应里取出 (input_tokens, output_tokens)。

    OpenAI SDK 的 `usage` 是 **CompletionUsage 对象**，不是 dict——直接
    `.get("prompt_tokens")` 会抛 AttributeError: 'CompletionUsage' object has no
    attribute 'get'。这条路以前从没被真实调用过（云端 provider 只在三个外部参数
    齐全时才注册），所以一直到 2026-10-15 第一次真打 DeepSeek 才暴露。

    两种形态都兼容：dict（部分兼容实现）与对象（官方 SDK）。取不到就返回 0，
    由调用方决定要不要退化成估算。
    """
    usage = getattr(raw, "usage", None)
    if usage is None:
        return 0, 0

    def pick(name: str) -> int:
        value = usage.get(name) if isinstance(usage, dict) else getattr(usage, name, None)
        return int(value) if isinstance(value, (int, float)) else 0

    return pick("prompt_tokens"), pick("completion_tokens")


class OpenAIModelGateway(BaseModelGateway):
    """OpenAI-compatible provider adapter."""

    provider: str = "openai"

    # 是否支持 OpenAI 的 json_schema 严格模式。默认否——见 _response_format 的说明。
    supports_json_schema: bool = False

    def __init__(
        self,
        api_key: str | None = None,
        base_url: str | None = None,
        model: str | None = None,
        timeout: int | None = None,
        pricing: dict[str, float] | None = None,
        disable_thinking: bool | None = None,
    ):
        settings = get_settings()
        self._default_model = model or settings.external_model_name or "gpt-4o-mini"
        self.timeout = timeout or settings.ai_timeout
        self._pricing = pricing or {"input": 0.0, "output": 0.0}
        # 见 config.py 里 external_model_disable_thinking 的说明：
        # 接推理模型时不开这个开关，抽取会因推理 token 吃光额度而返回空内容。
        self.disable_thinking = (
            settings.external_model_disable_thinking
            if disable_thinking is None
            else disable_thinking
        )

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

    def _response_format(self, schema: dict[str, Any]) -> dict[str, Any]:
        """构造约束模型输出的 response_format。

        **默认用 json_object，不用 OpenAI 的 json_schema 严格模式。**
        实测（2026-10-15，DeepSeek / deepseek-flash）：带 json_schema 的请求被直接拒绝，

            This response_format type is unavailable now

        而 json_object 返回 200。json_schema 是较新的可选特性，很多「OpenAI 兼容」的
        实现都没有它——把兼容性押在它身上会让整条抽取链路 400。

        JSON 的结构约束本来就不是靠它：抽取的 few-shot 示例已经逐条给出了确切的
        字段形状，食谱那边也是靠提示词。response_format 在这里只负责保证输出是
        **合法 JSON**，json_object 足够，且各家都支持。

        真遇到支持严格模式的提供商，把 supports_json_schema 置 True 即可。
        """
        if self.supports_json_schema:
            return {
                "type": "json_schema",
                "json_schema": {"name": "result", "schema": schema},
            }
        return {"type": "json_object"}

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
            kwargs["response_format"] = self._response_format(schema)
        if request.tools:
            kwargs["tools"] = request.tools
            kwargs["tool_choice"] = "auto"
        if self.disable_thinking:
            # DeepSeek 的私有参数，官方 SDK 会把它并进请求体顶层。
            kwargs["extra_body"] = {"thinking": {"type": "disabled"}}

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
                # `or ""`：工具调用型的响应里 message.content 是 None（内容都在
                # tool_calls 上），后面 `len(content) // 4` 会直接抛 TypeError。
                # 同时 ModelResponse.content 声明为 str，None 会在下游各处漏出去。
                content = (choice.message.content if choice and choice.message else "") or ""
                tool_calls = _tool_calls_of(choice.message) if choice and choice.message else []
                input_tokens, output_tokens = _usage_tokens(raw)
                input_tokens = input_tokens or _count_tokens_approx(request.messages)
                output_tokens = output_tokens or len(content) // 4
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
