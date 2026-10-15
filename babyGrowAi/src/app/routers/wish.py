"""HTTP router for wish cover images.

Exposes `POST /api/baby/wishes/cover`, which turns a wish's title plus the
parent's description into a picture-book style illustration.

The prompt is built here, not by the caller: the frontend and the Java backend
should not be doing prompt engineering, so the wording only lives in one place.

Lifespan:
    New. Depends on `services/image_gateway.py`.
"""

import base64
import logging

from fastapi import APIRouter, HTTPException, status
from sqlalchemy.orm import Session

from app.models import AiDecisionLog, WishCoverRequest, WishCoverResponse, get_engine
from app.services.image_gateway import ImageGenerationError, build_prompt, get_image_gateway

router = APIRouter(prefix="/api/baby/wishes", tags=["wishes"])
logger = logging.getLogger(__name__)


def _persist_log(
    wish_id: str,
    prompt: str,
    model_name: str,
    output_summary: str | None,
    elapsed_ms: int,
    error: str | None,
) -> None:
    """Audit one generation.

    The image itself is never stored -- it is hundreds of kilobytes and has no
    place in a JSON column. Only the prompt and the outcome are kept.

    Failures are logged but not raised, so a broken audit log never fails the
    generation itself.
    """
    try:
        with Session(bind=get_engine()) as db:
            db.add(
                AiDecisionLog(
                    biz_type="wish_cover",
                    biz_id=wish_id,
                    model_name=model_name,
                    prompt_version="wish_cover_v1",
                    input_summary=prompt[:500],
                    output_summary=output_summary,
                    decision_type="generate_image",
                    raw_response_json={"error": error} if error else None,
                    elapsed_ms=elapsed_ms,
                )
            )
            db.commit()
    except Exception as exc:
        logger.warning("Failed to persist wish cover log: %s", exc)


@router.post("/cover", response_model=WishCoverResponse)
async def generate_cover(data: WishCoverRequest):
    """Generate one cover image and return it inline as base64."""
    gateway = get_image_gateway()

    if not gateway.enabled:
        # 明确地说「没配」，而不是发一个必然失败的请求出去
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="文生图未配置（缺少 IMAGE_MODEL_API_KEY）",
        )

    prompt = build_prompt(data.title, data.description, data.baby_age_months)

    try:
        result = await gateway.generate(prompt)
    except ImageGenerationError as exc:
        # detail 会被 Java 侧的 AiClient 原样透给调用方，所以措辞是给人看的
        logger.warning("心愿 %s 出图失败：%s", data.wish_id, exc)
        _persist_log(data.wish_id, prompt, gateway.model, None, 0, str(exc))
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc

    _persist_log(
        data.wish_id,
        prompt,
        result.model,
        f"{len(result.content)} bytes, {result.mime}",
        result.elapsed_ms,
        None,
    )

    return WishCoverResponse(
        status="ok",
        image_base64=base64.b64encode(result.content).decode("ascii"),
        mime=result.mime,
        model_name=result.model,
        elapsed_ms=result.elapsed_ms,
    )
