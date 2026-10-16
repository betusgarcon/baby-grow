"""输出截断（max_tokens）的检测与恢复。

为什么值得单独一组：被截断的响应**看起来是成功的**——HTTP 200、`finish_reason`
是 `"length"` 而不是 `"stop"`，正文断在半句上。对 JSON schema 约束的输出，
截断几乎必然解析失败，而下游只会看到一次莫名其妙的 JSON 错误。

这组测试锁住两件事：
1. 截断必须被识别成一个**特定的**失败，而不是一般的异常；
2. 识别之后的对策是**加倍预算**重试，而不是原样再试一次——预算没变的话，
   重试只会得到同样的截断。

推理模型尤其容易触发：思考过程会先把预算吃光，正文一个 token 都没轮到。
"""

import pytest

from app.config import get_settings
from app.services.model_gateway.base import (
    ModelOutputTruncatedError,
    ModelRequest,
    ModelResponse,
)
from app.services.model_gateway.openai_gateway import OpenAIModelGateway
from app.services.model_gateway.router import ModelGatewayRouter


# ---------------------------------------------------------------------------
# 路由层：按 task 解析上限
# ---------------------------------------------------------------------------


def _request(task: str, max_tokens: int | None = None) -> ModelRequest:
    return ModelRequest(messages=[{"role": "user", "content": "hi"}], task=task, max_tokens=max_tokens)


def test_every_text_task_has_its_own_ceiling():
    """抽取与食谱的输出量差一个数量级，一个全局上限按不住：
    定小了截断食谱，定大了管不住抽取。"""
    router = ModelGatewayRouter()

    extraction = router._resolve_max_tokens(_request("extraction"))
    recipe = router._resolve_max_tokens(_request("recipe_agent"))

    assert extraction < recipe


def test_an_explicit_value_wins_over_the_task_rule():
    """调用方显式给值时以它为准——截断重试就是靠这个把上限加倍。"""
    router = ModelGatewayRouter()

    assert router._resolve_max_tokens(_request("recipe_agent", max_tokens=42)) == 42


def test_a_task_without_a_rule_falls_back_to_the_global_default():
    router = ModelGatewayRouter()

    assert router._resolve_max_tokens(_request("some_new_task")) == get_settings().ai_max_tokens


# ---------------------------------------------------------------------------
# 路由层：截断后的自适应重试
# ---------------------------------------------------------------------------


class _FakeGateway:
    """按预定顺序抛异常，记下每次看到的 max_tokens。"""

    provider = "fake"
    default_model = "fake-model"

    def __init__(self, failures: list[Exception]):
        self._failures = list(failures)
        self.seen_max_tokens: list[int | None] = []

    async def chat(self, request: ModelRequest) -> ModelResponse:
        self.seen_max_tokens.append(request.max_tokens)

        if self._failures:
            raise self._failures.pop(0)

        return ModelResponse(
            content="{}",
            raw_response={},
            provider=self.provider,
            model=self.default_model,
            latency_ms=1,
        )


async def test_truncation_doubles_the_budget_instead_of_retrying_identically():
    router = ModelGatewayRouter()
    gateway = _FakeGateway([ModelOutputTruncatedError("截断")])
    request = _request("recipe_agent", max_tokens=100)

    response = await router._call_with_retry(gateway, request)

    assert response.content == "{}"
    # 关键断言：第二次不是原样重试，而是带着加倍的预算
    assert gateway.seen_max_tokens == [100, 200]


async def test_truncation_retries_are_bounded():
    """预算不能无限翻倍：1× → 2× → 4× 之后放弃，否则一次坏输入能烧掉任意多钱。"""
    router = ModelGatewayRouter()
    gateway = _FakeGateway([ModelOutputTruncatedError("截断")] * 5)
    request = _request("recipe_agent", max_tokens=100)

    with pytest.raises(ModelOutputTruncatedError):
        await router._call_with_retry(gateway, request)

    assert gateway.seen_max_tokens == [100, 200, 400]


# ---------------------------------------------------------------------------
# OpenAI 兼容端点：finish_reason == "length"
# ---------------------------------------------------------------------------


class _FakeMessage:
    def __init__(self, content: str):
        self.content = content
        self.tool_calls = None


class _FakeChoice:
    def __init__(self, content: str, finish_reason: str):
        self.message = _FakeMessage(content)
        self.finish_reason = finish_reason


class _FakeCompletion:
    def __init__(self, content: str, finish_reason: str):
        self.choices = [_FakeChoice(content, finish_reason)]
        self.usage = None

    def model_dump(self) -> dict:
        return {"choices": [{"finish_reason": self.choices[0].finish_reason}]}


class _FakeCompletions:
    def __init__(self, content: str, finish_reason: str):
        self._content = content
        self._finish_reason = finish_reason
        self.kwargs: dict | None = None

    async def create(self, **kwargs):
        self.kwargs = kwargs
        return _FakeCompletion(self._content, self._finish_reason)


class _FakeClient:
    def __init__(self, completions: _FakeCompletions):
        self.chat = type("_Chat", (), {"completions": completions})()


def _gateway(finish_reason: str, content: str = "{}"):
    gateway = OpenAIModelGateway(api_key="k", disable_thinking=False)
    completions = _FakeCompletions(content, finish_reason)
    gateway.client = _FakeClient(completions)
    return gateway, completions


async def test_a_length_finish_reason_is_reported_as_truncation():
    """断在半句上的 JSON 不该交给下游去解析。"""
    gateway, completions = _gateway("length", content='{"items": [{"dishName": "南')

    with pytest.raises(ModelOutputTruncatedError):
        await gateway.chat(_request("extraction", max_tokens=64))

    assert completions.kwargs is not None
    assert completions.kwargs["max_tokens"] == 64


async def test_a_normal_finish_reason_passes_through():
    gateway, completions = _gateway("stop", content='{"ok": true}')

    response = await gateway.chat(_request("extraction", max_tokens=64))

    assert response.content == '{"ok": true}'
    assert completions.kwargs is not None
    assert completions.kwargs["max_tokens"] == 64
