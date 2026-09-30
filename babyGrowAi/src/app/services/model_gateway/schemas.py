"""Configuration schemas for the production model gateway.

These Pydantic models describe provider configs, routing rules, and
runtime routing policy. They are intentionally plain so that routing
can be loaded from JSON env vars without importing provider-specific
client libraries.
"""

from pydantic import BaseModel, Field


class ProviderConfig(BaseModel):
    """Configuration for a single model provider."""

    provider: str
    api_key: str = ""
    base_url: str = ""
    model: str = ""
    timeout: int = 60
    enabled: bool = True
    # Extra provider-specific options (e.g. organization for OpenAI).
    extra: dict = Field(default_factory=dict)


class RoutingTarget(BaseModel):
    """A single provider/model target in a routing rule."""

    provider: str
    model: str


class RoutingRule(BaseModel):
    """Routing rule for a task."""

    task: str
    primary: RoutingTarget
    fallback: list[RoutingTarget] = []
    timeout_ms: int = 60_000


class RoutingConfig(BaseModel):
    """Full gateway routing configuration."""

    providers: list[ProviderConfig] = []
    rules: list[RoutingRule] = []
    default_provider: str = "ollama"
    budget_alert_threshold_usd: float = 100.0
    # Rate limit: requests per second across the gateway.
    rate_limit_per_second: int = 100
    # Circuit breaker settings.
    circuit_breaker_failure_threshold: int = 5
    circuit_breaker_recovery_timeout: int = 30
