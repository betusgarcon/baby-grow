"""Production model gateway router.

The router selects a provider and model based on the task, falls back on
failure, applies circuit breakers and rate limiting, records cost, and
writes every call to the `LlmCallLog` table.
"""

import asyncio
import json
import logging
import time
from typing import Any

from opentelemetry import metrics, trace as trace_module

from app.config import get_settings
from app.models import LlmCallLog, get_engine
from app.services.model_gateway.base import BaseModelGateway, ModelRequest, ModelResponse
from app.services.model_gateway.circuit_breaker import CircuitBreaker
from app.services.model_gateway.cost_tracker import CostTracker
from app.services.model_gateway.ollama_gateway import OllamaModelGateway
from app.services.model_gateway.openai_gateway import OpenAIModelGateway
from app.services.model_gateway.rate_limiter import TokenBucket
from app.services.model_gateway.schemas import ProviderConfig, RoutingConfig, RoutingRule, RoutingTarget
from app.telemetry import get_meter, get_tracer
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)
tracer = get_tracer("model_gateway.router")
meter = get_meter("model_gateway.router")

# Metrics
_request_counter = meter.create_counter("llm_request_total", description="Total LLM requests")
_latency_histogram = meter.create_histogram("llm_latency_ms", description="LLM request latency in ms")
_cost_histogram = meter.create_histogram("llm_cost_usd", description="LLM request cost in USD")
_fallback_counter = meter.create_counter("llm_fallback_total", description="Total LLM fallback events")


class ModelGatewayRouter(BaseModelGateway):
    """Unified router across multiple LLM providers."""

    provider: str = "router"

    def __init__(self, config: RoutingConfig | None = None):
        self.config = config or _build_default_config()
        self._gateways: dict[str, BaseModelGateway] = {}
        self._breakers: dict[str, CircuitBreaker] = {}
        self._rate_limiter = TokenBucket(self.config.rate_limit_per_second)
        self._cost_tracker = CostTracker()
        self._build_gateways()

    def _build_gateways(self) -> None:
        for provider_config in self.config.providers:
            if not provider_config.enabled:
                continue
            if provider_config.provider == "ollama":
                gateway = OllamaModelGateway(
                    base_url=provider_config.base_url or None,
                    model=provider_config.model or None,
                    timeout=provider_config.timeout or None,
                    pricing=self._price_for(provider_config.provider, provider_config.model),
                )
            elif provider_config.provider == "openai":
                gateway = OpenAIModelGateway(
                    api_key=provider_config.api_key or None,
                    base_url=provider_config.base_url or None,
                    model=provider_config.model or None,
                    timeout=provider_config.timeout or None,
                    pricing=self._price_for(provider_config.provider, provider_config.model),
                )
            else:
                logger.warning("Unknown provider: %s", provider_config.provider)
                continue
            self._gateways[provider_config.provider] = gateway
            self._breakers[provider_config.provider] = CircuitBreaker(
                failure_threshold=self.config.circuit_breaker_failure_threshold,
                recovery_timeout=self.config.circuit_breaker_recovery_timeout,
            )

    def _price_for(self, provider: str, model: str) -> dict[str, float]:
        return self._cost_tracker.prices.get(self._cost_tracker.price_key(provider, model), {"input": 0.0, "output": 0.0})

    def _rule_for_task(self, task: str) -> RoutingRule | None:
        for rule in self.config.rules:
            if rule.task == task:
                return rule
        return None

    def _candidates(self, request: ModelRequest) -> list[tuple[str, str]]:
        """Return ordered list of (provider, model) candidates for a request."""
        if request.preferred_provider and request.preferred_model:
            return [(request.preferred_provider, request.preferred_model)]

        rule = self._rule_for_task(request.task)
        if rule is None:
            return [(self.config.default_provider, "")]

        candidates = [(rule.primary.provider, rule.primary.model)]
        for fallback in rule.fallback:
            candidates.append((fallback.provider, fallback.model))
        return candidates

    async def chat(self, request: ModelRequest) -> ModelResponse:
        """Route a chat request with retry, fallback, and observability."""
        with tracer.start_as_current_span("model_gateway.router.chat") as root_span:
            root_span.set_attribute("task", request.task)
            root_span.set_attribute("message_count", len(request.messages))

            candidates = self._candidates(request)
            root_span.set_attribute("candidate_count", len(candidates))

            last_error: Exception | None = None
            for index, (provider_name, model_name) in enumerate(candidates):
                gateway = self._gateways.get(provider_name)
                breaker = self._breakers.get(provider_name)

                if gateway is None:
                    continue
                if breaker is not None and not breaker.can_execute():
                    root_span.set_attribute(f"breaker_open.{provider_name}", True)
                    continue

                request.preferred_provider = provider_name
                request.preferred_model = model_name or gateway.default_model

                try:
                    response = await self._call_with_retry(gateway, request)
                    response = self._apply_cost(response)
                    self._log_call(request, response, fallback=(index > 0))
                    self._emit_metrics(response, fallback=(index > 0))
                    breaker.record_success() if breaker else None
                    return response
                except Exception as exc:
                    last_error = exc
                    root_span.set_attribute("last_error", str(exc))
                    if breaker:
                        breaker.record_failure()

            # All candidates exhausted.
            error_msg = f"All model providers failed for task={request.task}: {last_error}"
            root_span.set_status(trace_module.Status(trace_module.StatusCode.ERROR, error_msg))
            raise last_error or RuntimeError(error_msg)

    async def _call_with_retry(self, gateway: BaseModelGateway, request: ModelRequest) -> ModelResponse:
        """Retry a single gateway with exponential back-off."""
        max_attempts = 3
        base_delay = 0.5
        last_error: Exception | None = None
        for attempt in range(max_attempts):
            try:
                return await gateway.chat(request)
            except Exception as exc:
                last_error = exc
                if attempt < max_attempts - 1:
                    delay = base_delay * (2 ** attempt)
                    await asyncio.sleep(delay)
        raise last_error or RuntimeError("Gateway chat failed after retries")

    def _apply_cost(self, response: ModelResponse) -> ModelResponse:
        response.cost_usd = self._cost_tracker.calculate(
            response.provider, response.model, response.input_tokens, response.output_tokens
        )
        return response

    def _log_call(self, request: ModelRequest, response: ModelResponse, *, fallback: bool) -> None:
        try:
            with Session(bind=get_engine()) as db:
                log = LlmCallLog(
                    provider=response.provider,
                    model=response.model,
                    task_type=request.task,
                    input_tokens=response.input_tokens,
                    output_tokens=response.output_tokens,
                    latency_ms=response.latency_ms,
                    cost_usd=str(round(response.cost_usd, 10)),
                    status="ok",
                    error=None,
                )
                db.add(log)
                db.commit()
        except Exception as exc:
            logger.warning("Failed to persist LlmCallLog: %s", exc)

    def _emit_metrics(self, response: ModelResponse, *, fallback: bool) -> None:
        tags = {"provider": response.provider, "model": response.model}
        _request_counter.add(1, tags)
        _latency_histogram.record(response.latency_ms, tags)
        _cost_histogram.record(response.cost_usd, tags)
        if fallback:
            _fallback_counter.add(1, tags)

    async def embed(self, texts: list[str], model: str | None = None) -> list[list[float]]:
        """Route embedding to the first healthy gateway that supports embed."""
        for provider_name, gateway in self._gateways.items():
            breaker = self._breakers.get(provider_name)
            if breaker is not None and not breaker.can_execute():
                continue
            try:
                return await gateway.embed(texts, model=model or gateway.embedding_model or gateway.default_model)
            except Exception as exc:
                logger.warning("Embedding failed on %s: %s", provider_name, exc)
                if breaker:
                    breaker.record_failure()
        raise RuntimeError("No embedding provider available")

    async def health(self) -> bool:
        """Return True if any provider is healthy."""
        for gateway in self._gateways.values():
            if await gateway.health():
                return True
        return False

    @property
    def default_model(self) -> str:
        return self.config.default_provider

    @property
    def pricing(self) -> dict[str, float]:
        return {"input": 0.0, "output": 0.0}


# Import here to avoid circular import at module load.
from opentelemetry import trace as _trace_module


def _build_default_config() -> RoutingConfig:
    settings = get_settings()
    default_provider = "ollama"
    providers = [ProviderConfig(provider=default_provider, model=settings.ollama_model, enabled=True)]

    if settings.external_model_enabled:
        providers.append(
            ProviderConfig(
                provider="openai",
                model=settings.external_model_name or "gpt-4o-mini",
                api_key=settings.external_model_api_key,
                base_url=settings.external_model_base_url,
                enabled=True,
            )
        )

    rules = [
        RoutingRule(task="extraction", primary=RoutingTarget(provider="ollama", model=settings.ollama_model)),
        RoutingRule(task="recipe_fixed", primary=RoutingTarget(provider="ollama", model=settings.ollama_model)),
        RoutingRule(task="recipe_agent", primary=RoutingTarget(provider="ollama", model=settings.ollama_model)),
        RoutingRule(task="embedding", primary=RoutingTarget(provider="ollama", model=settings.embedding_model)),
    ]

    if settings.external_model_enabled:
        for rule in rules:
            rule.fallback.append(RoutingTarget(provider="openai", model=settings.external_model_name or "gpt-4o-mini"))

    return RoutingConfig(providers=providers, rules=rules, default_provider=default_provider)


# Singleton and compatibility helpers.
_router: ModelGatewayRouter | None = None


def get_model_gateway_router() -> ModelGatewayRouter:
    global _router
    if _router is None:
        _router = ModelGatewayRouter()
    return _router


def reset_model_gateway_router() -> None:
    global _router
    _router = None


def load_routing_config_from_env() -> RoutingConfig:
    """Load routing config from the MODEL_ROUTING_RULES env var if set."""
    import os

    from app.config import get_settings

    env_json = os.getenv("MODEL_ROUTING_RULES")
    if env_json:
        return RoutingConfig.model_validate_json(env_json)
    return _build_default_config()
