"""Regression tests for the OpenAI-compatible provider path.

Every case here was found by the **first real end-to-end call** against DeepSeek
(2026-10-15). The cloud provider had never actually been exercised before that:
it is only registered when all three `EXTERNAL_MODEL_*` values are set, and none
of them were configured until this deployment. A mock-only suite could not have
caught any of these — they are all contract mismatches with a live provider.

Kept as its own file so the reason each assertion exists stays readable.
"""

import pytest

from app.services.model_gateway.base import ModelResponse
from app.services.model_gateway.openai_gateway import (
    OpenAIModelGateway,
    _tool_calls_of,
    _usage_tokens,
)
from app.services.ollama_gateway import _legacy_message_shape


def _model_response(content: str = "{}", tool_calls: list | None = None) -> ModelResponse:
    return ModelResponse(
        content=content,
        raw_response={},
        provider="openai",
        model="test-model",
        latency_ms=1,
        tool_calls=tool_calls or [],
    )


class _FakeFunction:
    def __init__(self, name: str, arguments: str):
        self.name = name
        self.arguments = arguments


class _FakeToolCall:
    def __init__(self, call_id: str, name: str, arguments: str):
        self.id = call_id
        self.function = _FakeFunction(name, arguments)


class _FakeMessage:
    def __init__(self, tool_calls):
        self.tool_calls = tool_calls


class _FakeUsage:
    """Stand-in for openai's CompletionUsage: attributes, not a mapping."""

    def __init__(self, prompt_tokens: int, completion_tokens: int):
        self.prompt_tokens = prompt_tokens
        self.completion_tokens = completion_tokens


class _FakeRaw:
    def __init__(self, usage):
        self.usage = usage


# ---------------------------------------------------------------------------
# response_format：DeepSeek 拒绝 json_schema
# ---------------------------------------------------------------------------


def test_the_default_response_format_is_json_object():
    """实测：带 json_schema 的请求被 DeepSeek 拒绝——
    「This response_format type is unavailable now」。默认必须是 json_object。"""
    gateway = OpenAIModelGateway(api_key="k", disable_thinking=False)

    assert gateway._response_format({"type": "object"}) == {"type": "json_object"}


def test_json_schema_is_available_when_a_provider_supports_it():
    gateway = OpenAIModelGateway(api_key="k", disable_thinking=False)
    gateway.supports_json_schema = True

    fmt = gateway._response_format({"type": "object"})

    assert fmt["type"] == "json_schema"
    assert fmt["json_schema"]["schema"] == {"type": "object"}


# ---------------------------------------------------------------------------
# usage：SDK 返回的是对象，不是 dict
# ---------------------------------------------------------------------------


def test_usage_is_read_from_the_sdk_object():
    """原先写的是 usage.get(...)，SDK 返回对象时抛
    AttributeError: 'CompletionUsage' object has no attribute 'get'。"""
    assert _usage_tokens(_FakeRaw(_FakeUsage(12, 34))) == (12, 34)


def test_usage_is_also_read_from_a_mapping():
    """内层 usage 也可能是 dict——部分兼容实现这么回。"""
    assert _usage_tokens(_FakeRaw({"prompt_tokens": 5, "completion_tokens": 6})) == (5, 6)


def test_usage_falls_back_to_zero_when_absent():
    assert _usage_tokens(_FakeRaw(None)) == (0, 0)


def test_usage_tolerates_junk_values():
    """字段在但值不是数字时不该炸，退化成估算。"""
    assert _usage_tokens(_FakeRaw({"prompt_tokens": None, "completion_tokens": "x"})) == (0, 0)


# ---------------------------------------------------------------------------
# tool_calls：回传时缺 type 会让第二轮 422
# ---------------------------------------------------------------------------


def test_tool_calls_carry_the_type_field():
    """Agent 会把 assistant 这条消息连同 tool_calls 原样回传；DeepSeek 严格校验，
    缺 type 时整轮 422「missing field `type`」——第一轮正常，第二轮才炸。"""
    calls = _tool_calls_of(_FakeMessage([_FakeToolCall("c1", "check_rules", '{"a":1}')]))

    assert calls == [
        {
            "id": "c1",
            "type": "function",
            "function": {"name": "check_rules", "arguments": '{"a":1}'},
        }
    ]


def test_no_tool_calls_yields_an_empty_list():
    assert _tool_calls_of(_FakeMessage(None)) == []
    assert _tool_calls_of(_FakeMessage([])) == []


# ---------------------------------------------------------------------------
# 兼容层的返回形状：这个 bug 曾让云端路径的 content 永远为空
# ---------------------------------------------------------------------------


def test_the_legacy_wrapper_normalises_to_the_ollama_message_shape():
    """原先直接 `return response.raw_response`：对 Ollama 恰好成立（它的原始响应
    本就是 {"message": {...}}），但 OpenAI 的 raw_response 是
    {"choices": [{"message": {...}}]}，于是下面这种取法必然拿到空串。"""
    shape = _legacy_message_shape(_model_response(content='{"a":1}', tool_calls=[{"id": "c1"}]))

    assert shape.get("message", {}).get("content", "") == '{"a":1}'
    assert shape["message"]["tool_calls"] == [{"id": "c1"}]


def test_the_legacy_shape_is_what_every_caller_reads():
    """extractor / recipe_rag / agent.react 的两处，全都这么取内容。"""
    shape = _legacy_message_shape(_model_response(content="hello"))

    assert shape.get("message", {}).get("content", "") == "hello"


@pytest.mark.parametrize("content", ["{}", "纯文本", ""])
def test_the_legacy_shape_never_loses_content(content):
    assert _legacy_message_shape(_model_response(content=content))["message"]["content"] == content
