"""Prompt registry.

Loads versioned prompt templates from ``prompts/templates`` and exposes a
single ``get_prompt(name, version)`` helper. Templates are plain JSON files so
they can be edited without touching Python code.
"""

import json
import logging
from functools import lru_cache
from pathlib import Path

from app.config import get_settings

logger = logging.getLogger(__name__)

TEMPLATES_DIR = Path(__file__).parent / "templates"

DEFAULT_VERSIONS: dict[str, str] = {
    "recipe_fixed": "v1",
    "recipe_agent": "v1",
    "extraction": "v1",
}

_VERSION_OVERRIDES: dict[str, str] = {}


def _template_path(name: str, version: str) -> Path:
    """Return the filesystem path for a prompt template."""
    return TEMPLATES_DIR / f"{name}_{version}.json"


def load_prompt_template(name: str, version: str | None = None) -> dict:
    """Load a prompt template by name and version.

    Args:
        name: Prompt template name (e.g. ``recipe_fixed``).
        version: Optional explicit version. If omitted, the default version is
            used, or any active override from ``set_prompt_version``.

    Returns:
        The loaded template as a dict with ``system`` and ``user_template`` keys.
    """
    version = version or _VERSION_OVERRIDES.get(name) or DEFAULT_VERSIONS.get(name, "v1")
    path = _template_path(name, version)
    if not path.exists():
        raise FileNotFoundError(f"Prompt template not found: {path}")
    with open(path, "r", encoding="utf-8") as f:
        template = json.load(f)
    template["_version"] = version
    return template


def set_prompt_version(name: str, version: str) -> None:
    """Override the default version for a prompt at runtime.

    Useful for A/B testing or gradual rollouts.
    """
    _VERSION_OVERRIDES[name] = version


def get_prompt_version(name: str) -> str:
    """Return the currently active version for a prompt."""
    return _VERSION_OVERRIDES.get(name) or DEFAULT_VERSIONS.get(name, "v1")


@lru_cache(maxsize=8)
def _cached_template(name: str, version: str) -> dict:
    return load_prompt_template(name, version)


def get_rendered_prompt(
    name: str,
    variables: dict,
    version: str | None = None,
) -> tuple[str, str]:
    """Return the rendered (system, user) prompt for the given template.

    Args:
        name: Prompt template name.
        variables: Variables substituted into ``user_template``.
        version: Optional explicit version.

    Returns:
        A tuple of ``(system_prompt, user_prompt)``.
    """
    version = version or _VERSION_OVERRIDES.get(name) or DEFAULT_VERSIONS.get(name, "v1")
    template = _cached_template(name, version)
    system = template["system"]
    user = template["user_template"].format(**variables)
    return system, user
