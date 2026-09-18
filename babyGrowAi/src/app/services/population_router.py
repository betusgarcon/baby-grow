"""Population router.

Routes incoming requests to the appropriate population-specific logic. Currently
only ``baby`` is fully implemented; other populations return a placeholder
response so the API contract stays stable.
"""

from app.models import PopulationContext


class PopulationRouter:
    """Route requests by population (baby/pregnant/worker/elderly)."""

    SUPPORTED_POPULATIONS = {"baby", "pregnant", "worker", "elderly"}

    def __init__(self, population: str | None = None):
        self.population = (population or "baby").lower()

    def is_supported(self) -> bool:
        return self.population in self.SUPPORTED_POPULATIONS

    def get_context(self) -> PopulationContext:
        """Return a context describing what the router knows about this population."""
        return PopulationContext(
            population=self.population,
            placeholder=self.population != "baby",
            message=f"{self.population} 人群推荐功能开发中，当前返回占位提示。",
        )
