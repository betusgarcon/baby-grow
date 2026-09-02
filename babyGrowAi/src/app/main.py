import logging

from fastapi import FastAPI

from app.config import get_settings
from app.models import init_db
from app.routers import extract, recipe
from app.services.ollama_gateway import get_model_gateway

logger = logging.getLogger(__name__)

app = FastAPI(title="baby-grow-ai", version="0.1.0")

app.include_router(extract.router)
app.include_router(recipe.router)


@app.get("/health")
async def health():
    gateway = get_model_gateway()
    ollama_ok = await gateway.health()
    return {
        "status": "ok" if ollama_ok else "degraded",
        "service": "baby-grow-ai",
        "ollama": "ok" if ollama_ok else "unreachable",
    }


@app.on_event("startup")
async def startup_event():
    settings = get_settings()
    logging.basicConfig(level=settings.log_level.upper())
    logger.info("Starting baby-grow-ai service")
    try:
        init_db()
        logger.info("Database initialized")
    except Exception as exc:
        logger.warning("Database init failed: %s", exc)

    gateway = get_model_gateway()
    if await gateway.health():
        logger.info("Ollama is reachable at %s", settings.ollama_base_url)
    else:
        logger.warning("Ollama is not reachable at %s", settings.ollama_base_url)
