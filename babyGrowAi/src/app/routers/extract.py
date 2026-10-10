"""HTTP router for record extraction.

Exposes `POST /api/baby/records/extract`, which parses free-form parent notes
into structured baby records and persists an audit log.

Lifespan:
    Stable. Future changes will likely be limited to adding new record types or
    async log persistence.
"""

import logging

from fastapi import APIRouter, HTTPException, status
from sqlalchemy.orm import Session

from app.config import get_settings
from app.extractor import get_extractor
from app.models import AiDecisionLog, ExtractRequest, ExtractResponse, get_engine
from app.services.population_router import PopulationRouter

router = APIRouter(prefix="/api/baby/records", tags=["records"])
logger = logging.getLogger(__name__)


def _persist_log(data: ExtractRequest, result: ExtractResponse) -> None:
    """Persist an audit log for the extraction request.

    Failures are logged but not raised, so extraction can still succeed even
    if logging is temporarily unavailable.
    """
    try:
        # Never store the image itself — only note what kind of input it was.
        input_summary = data.text[:500] if data.text else f"[{data.source_type}]"
        with Session(bind=get_engine()) as db:
            log = AiDecisionLog(
                biz_type="record_extract",
                biz_id=data.baby_id,
                model_name=result.model_name,
                input_summary=input_summary,
                output_summary=(result.data.model_dump_json() if result.data else None),
                confidence=str(result.confidence),
                decision_type="extract",
                raw_response_json={"source_type": data.source_type, "response": result.model_dump()},
                elapsed_ms=result.elapsed_ms,
            )
            db.add(log)
            db.commit()
    except Exception as exc:
        logger.warning("Failed to persist AI decision log: %s", exc)


@router.post("/extract", response_model=ExtractResponse)
async def extract_records(data: ExtractRequest):
    """Extract structured records from parent text, or from a photo.

    One endpoint serves both shapes so callers do not need to know which model
    will serve the request — the presence of `media_base64` decides that.
    """
    router = PopulationRouter(data.population)
    if router.is_supported() and router.population != "baby":
        return ExtractResponse(
            status="ok",
            data=None,
            raw_text=data.text,
            confidence=1.0,
            model_name="placeholder",
            elapsed_ms=0,
        )

    extractor = get_extractor()

    if data.media_base64:
        result = await extractor.extract_from_media(
            image_base64=data.media_base64,
            baby_age_months=data.baby_age_months,
            note=data.text,
            population=data.population,
        )
    else:
        result = await extractor.extract(data.text, data.baby_age_months, population=data.population)

    # Persist decision log synchronously; acceptable for low concurrency.
    _persist_log(data, result)

    if result.status != "ok":
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=result.error,
        )
    return result
