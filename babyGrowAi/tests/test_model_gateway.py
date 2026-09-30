"""Tests for the production model gateway."""

import asyncio

import pytest

from app.services.model_gateway import get_model_gateway_router, reset_model_gateway_router
from app.services.model_gateway.base import BaseModelGateway, ModelRequest, ModelResponse
from app.services.model_gateway.circuit_breaker import CircuitBreaker
from app.services.model_gateway.cost_tracker import CostTracker
from app.services.model_gateway.rate_limiter import TokenBucket
from app.services.model_gateway.router import ModelGatewayRouter
from app.services.model_gateway.schemas import ProviderConfig, RoutingConfig, RoutingRule, RoutingTarget


class FakeGateway(BaseModelGateway):
    """Fake LLM gateway for testing routing and fallback."""

    provider = "fake"

    def __init__(self, model: str = "fake-model", fail: bool = False):
        self._model = model
        self._fail = fail
        self.calls = []

    @property
    def default_model(self):
        return self._model

    @property
    def pricing(self):
        return {"input": 0.0, "output": 0.0}

    async def chat(self, request: ModelRequest) -> ModelResponse:
        self.calls.append((request.task, request.preferred_model))
        if self._fail:
            raise RuntimeError("boom")
        return ModelResponse(
            content="hello",
            raw_response={"message": {"content": "hello"}},
            provider=self.provider,
            model=self._model,
            latency_ms=10,
            input_tokens=5,
            output_tokens=3,
            cost_usd=0.0,
            tool_calls=[],
            stream=False,
        )

    async def embed(self, texts: list[str], model: str | None = None) -> list[list[float]]:
        return [[1.0, 2.0] for _ in texts]

    async def health(self) -> bool:
        return True


def test_cost_tracker():
    tracker = CostTracker()
    cost = tracker.calculate("openai", "gpt-4o-mini", 1_000_000, 1_000_000)
    assert cost == pytest.approx(0.75, rel=1e-3)

    ollama_cost = tracker.calculate("ollama", "qwen2.5:7b-instruct-q5_K_M", 1_000_000, 1_000_000)
    assert ollama_cost == 0.0


def test_circuit_breaker():
    breaker = CircuitBreaker(failure_threshold=2, recovery_timeout=0.1)
    assert breaker.can_execute()
    breaker.record_failure()
    assert breaker.can_execute()
    breaker.record_failure()
    assert not breaker.can_execute()
    # After recovery timeout, should become half-open.
    import time

    time.sleep(0.15)
    assert breaker.can_execute()
    breaker.record_success()
    assert breaker.state == "closed"


def test_token_bucket():
    bucket = TokenBucket(rate=2)
    assert bucket.acquire()
    assert bucket.acquire()
    # Rate is 2/sec, so after a tiny wait token should be available.
    import time

    time.sleep(0.6)
    assert bucket.acquire()


def test_router_primary_success(monkeypatch):
    reset_model_gateway_router()
    router = ModelGatewayRouter(
        config=RoutingConfig(
            providers=[ProviderConfig(provider="fake", model="m1")],
            rules=[RoutingRule(task="chat", primary=RoutingTarget(provider="fake", model="m1"))],
        )
    )
    fake = FakeGateway(model="m1")
    router._gateways = {"fake": fake}
    router._breakers = {"fake": CircuitBreaker()}

    response = asyncio.run(router.chat(ModelRequest(messages=[{"role": "user", "content": "hi"}], task="chat")))
    assert response.content == "hello"
    assert fake.calls == [("chat", "m1")]


def test_router_fallback(monkeypatch):
    reset_model_gateway_router()
    router = ModelGatewayRouter(
        config=RoutingConfig(
            providers=[
                ProviderConfig(provider="bad", model="m1"),
                ProviderConfig(provider="good", model="m2"),
            ],
            rules=[
                RoutingRule(
                    task="chat",
                    primary=RoutingTarget(provider="bad", model="m1"),
                    fallback=[RoutingTarget(provider="good", model="m2")],
                )
            ],
        )
    )
    bad = FakeGateway(model="m1", fail=True)
    good = FakeGateway(model="m2")
    router._gateways = {"bad": bad, "good": good}
    router._breakers = {"bad": CircuitBreaker(), "good": CircuitBreaker()}

    response = asyncio.run(router.chat(ModelRequest(messages=[{"role": "user", "content": "hi"}], task="chat")))
    assert response.provider == "fake"
    assert bad.calls == [("chat", "m1"), ("chat", "m1"), ("chat", "m1")]
    assert good.calls == [("chat", "m2")]
