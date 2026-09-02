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
    service = get_recipe_rag_service()
    result = await service.recommend(data)

    try:
        with Session(bind=get_engine()) as db:
            log = AiDecisionLog(
                biz_type="recipe_recommend",
                biz_id=data.baby_id,
                model_name=result.model_name,
                input_summary=f"{data.baby_age_months}个月; {data.query}"[:500],
                output_summary=(result.summary[:200] if result.summary else None),
                confidence=str(result.confidence),
                decision_type="recommend",
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
