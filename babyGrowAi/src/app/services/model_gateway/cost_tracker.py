"""Cost tracking utilities for the model gateway.

`CostTracker` keeps a price map for provider/model combinations and
calculates per-call and aggregate spend. Unknown models default to
$0.00 so local Ollama deployments don't pollute cost metrics.
"""

from app.config import get_settings


class CostTracker:
    """Compute per-call and aggregate cost from token usage."""

    # Prices are per 1M tokens in USD.
    DEFAULT_PRICES: dict[str, dict[str, float]] = {
        "ollama/qwen2.5:7b-instruct-q5_K_M": {"input": 0.0, "output": 0.0},
        "ollama/bge-m3:latest": {"input": 0.0, "output": 0.0},
        "openai/gpt-4o": {"input": 5.0, "output": 15.0},
        "openai/gpt-4o-mini": {"input": 0.15, "output": 0.6},
        "openai/gpt-3.5-turbo": {"input": 0.5, "output": 1.5},
    }

    def __init__(self, prices: dict[str, dict[str, float]] | None = None):
        self.prices = prices or dict(self.DEFAULT_PRICES)

    def price_key(self, provider: str, model: str) -> str:
        return f"{provider}/{model}".lower()

    def calculate(self, provider: str, model: str, input_tokens: int, output_tokens: int) -> float:
        """Return estimated cost in USD."""
        price = self.prices.get(self.price_key(provider, model), {"input": 0.0, "output": 0.0})
        input_cost = (input_tokens / 1_000_000) * price["input"]
        output_cost = (output_tokens / 1_000_000) * price["output"]
        return round(input_cost + output_cost, 10)
