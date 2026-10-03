"""Shared path helpers for the RAG ingestion tooling.

The knowledge sources (PDFs) live in the *main* checkout under `docs/rag_docs`,
while generated artifacts must stay inside the *current* checkout (which may be
a git worktree). Resolving those two roots differently is what this module is
for.

Lifespan:
    Stable tooling helper. Used by `scripts/*` only, never by the service.
"""

from __future__ import annotations

import os
import subprocess
from functools import lru_cache
from pathlib import Path


@lru_cache(maxsize=1)
def app_root() -> Path:
    """Return the `babyGrowAi/` directory this script lives in."""
    return Path(__file__).resolve().parents[1]


@lru_cache(maxsize=1)
def repo_root() -> Path:
    """Return the main repository root, resolving through git worktrees.

    `--git-common-dir` always points at the primary checkout's `.git`, so this
    returns the main checkout even when the caller runs inside a worktree.
    """
    out = subprocess.run(
        ["git", "rev-parse", "--path-format=absolute", "--git-common-dir"],
        capture_output=True,
        text=True,
        check=True,
    ).stdout.strip()
    return Path(out).parent


def rag_docs_dir() -> Path:
    """Directory holding the source PDFs. Overridable via `RAG_DOCS_DIR`."""
    override = os.environ.get("RAG_DOCS_DIR")
    return Path(override).expanduser() if override else repo_root() / "docs" / "rag_docs"


def work_dir() -> Path:
    """Scratch directory for intermediate extraction artifacts (git-ignored)."""
    return app_root() / "data" / "_work"


def guidelines_dir() -> Path:
    """Destination for converted guideline Markdown (git-ignored)."""
    return app_root() / "data" / "guidelines"
