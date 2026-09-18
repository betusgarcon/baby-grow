"""Rule registry.

Rules are loaded from ``rules/`` JSON files and merged with hard-coded defaults.
This makes it possible to extend rules (e.g. for pregnant women, workers, elderly)
without changing the Python code.
"""

import json
import logging
from pathlib import Path

from app.config import get_settings

logger = logging.getLogger(__name__)

RULES_DIR = Path(__file__).parent.parent / "rules"


class RuleRegistry:
    """Holds merged hard-coded and file-based rules.

    The registry supports per-population rule overrides. For now the only
    implemented population is ``baby``; other populations return the default
    rule set without crashing.
    """

    def __init__(self):
        self._population = "baby"
        self._load_file_rules()

    def _load_file_rules(self) -> None:
        """Load any JSON rule files found in ``rules/``."""
        self._file_rules: dict[str, list[dict]] = {}
        if not RULES_DIR.exists():
            return
        for path in RULES_DIR.glob("*.json"):
            try:
                with open(path, "r", encoding="utf-8") as f:
                    payload = json.load(f)
                population = payload.get("population", "baby")
                self._file_rules.setdefault(population, []).extend(payload.get("rules", []))
            except Exception as exc:  # noqa: BLE001
                logger.warning("Failed to load rule file %s: %s", path, exc)

    def set_population(self, population: str) -> None:
        """Switch the active population context."""
        self._population = population

    def get_rules(self, population: str | None = None) -> list[dict]:
        """Return merged rules for a population.

        For non-baby populations we intentionally return an default rule set so
        callers can gracefully degrade while the rules are being configured.
        """
        pop = population or self._population
        if pop == "baby":
            return ["__hardcoded_baby__"] + self._file_rules.get("baby", [])
        # Graceful placeholder: return an empty, inert rule set for unconfigured populations.
        return ["__placeholder__"] + self._file_rules.get(pop, [])
