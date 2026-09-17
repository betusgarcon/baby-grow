"""HTTP router for recipe recommendation.

Exposes `POST /api/baby/recipes/recommend`, which uses `RecipeRAGService`.
The response includes an audit log entry and observability fields
(`iterations`, `tool_trace`) when the ReAct agent path is used.

Lifespan:
    Stable. New parameters should be added to `RecipeRecommendRequest` and
    forwarded to the service unchanged.
"""

import logging

from fastapi import APIRouter, HTTPException, status
from sqlalchemy.orm import Session

from app.models import (
    AiDecisionLog,
    RecipeRecommendRequest,
    RecipeRecommendResponse,
    get_engine,
)
from app.recipe_rag import get_recipe_rag_service

router = APIRouter(prefix="/api/baby/recipes", tags=["recipes"])
logger = logging.getLogger(__name__)


@router.post("/recommend", response_model=RecipeRecommendResponse)
async def recommend_recipes(data: RecipeRecommendRequest):
    """Recommend recipes for a baby based on the request profile."""
    service = get_recipe_rag_service()
    # use_agent defaults True (ReAct path). Pass use_agent=False for the fixed
    # pipeline — exposed for A/B comparison between orchestration strategies.
    result = await service.recommend(data, use_agent=data.use_agent)

    try:
        with Session(bind=get_engine()) as db:
            log = AiDecisionLog(
                biz_type="recipe_recommend",
                biz_id=data.baby_id,
                model_name=result.model_name,
                input_summary=f"{data.baby_age_months}个月; {data.query}"[:500],
                output_summary=(result.summary[:200] if result.summary else None),
                confidence=str(result.confidence),
                decision_type="agent_recommend" if result.iterations is not None else "recommend",
                raw_response_json=result.model_dump(),
                elapsed_ms=result.elapsed_ms,
            )
            db.add(log)
            db.commit()
    except Exception as exc:
        logger.warning("Failed to persist AI decision log: %s", exc)

    if result.status != "ok":
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=result.error,
        )
    return result
