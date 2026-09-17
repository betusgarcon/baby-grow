"""FastAPI entry point for the baby-grow-ai service.

This module wires all routers, initializes the database on startup, and exposes
a health endpoint that checks connectivity to the Ollama server.

Lifespan:
    Stable. New routers should be added via `app.include_router(...)`.
"""

import logging

from fastapi import FastAPI

from app.config import get_settings
from app.models import init_db
from app.routers import extract, recipe
from app.services.ollama_gateway import get_model_gateway

logger = logging.getLogger(__name__)

# FastAPI application instance. Routers are registered below.
app = FastAPI(title="baby-grow-ai", version="0.1.0")

app.include_router(extract.router)
app.include_router(recipe.router)


@app.get("/health")
async def health():
    """Return service health and Ollama reachability status."""
    gateway = get_model_gateway()
    ollama_ok = await gateway.health()
    return {
        "status": "ok" if ollama_ok else "degraded",
        "service": "baby-grow-ai",
        "ollama": "ok" if ollama_ok else "unreachable",
    }


@app.on_event("startup")
async def startup_event():
    """Initialize logging, database and report Ollama status on startup."""
    settings = get_settings()
    logging.basicConfig(level=settings.log_level.upper())
    logger.info("Starting baby-grow-ai service")
    try:
        init_db()
        logger.info("Database initialized")
    except Exception as exc:
        # Database init failure is logged but not fatal: some endpoints may still
        # work (e.g. health check), but RAG/Agent paths will fail later.
        logger.warning("Database init failed: %s", exc)

    gateway = get_model_gateway()
    if await gateway.health():
        logger.info("Ollama is reachable at %s", settings.ollama_base_url)
    else:
        logger.warning("Ollama is not reachable at %s", settings.ollama_base_url)
