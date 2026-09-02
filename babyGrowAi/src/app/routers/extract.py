import logging

from fastapi import APIRouter, HTTPException, status
from sqlalchemy.orm import Session

from app.config import get_settings
from app.extractor import get_extractor
from app.models import AiDecisionLog, ExtractRequest, ExtractResponse, get_engine

router = APIRouter(prefix="/api/baby/records", tags=["records"])
logger = logging.getLogger(__name__)


def _persist_log(data: ExtractRequest, result: ExtractResponse) -> None:
    try:
        with Session(bind=get_engine()) as db:
            log = AiDecisionLog(
                biz_type="record_extract",
                biz_id=data.baby_id,
                model_name=result.model_name,
                input_summary=data.text[:500],
                output_summary=(result.data.model_dump_json() if result.data else None),
                confidence=str(result.confidence),
                decision_type="extract",
                raw_response_json={"raw_text": data.text, "response": result.model_dump()},
                elapsed_ms=result.elapsed_ms,
            )
            db.add(log)
            db.commit()
    except Exception as exc:
        logger.warning("Failed to persist AI decision log: %s", exc)


@router.post("/extract", response_model=ExtractResponse)
async def extract_text(data: ExtractRequest):
    extractor = get_extractor()
    result = await extractor.extract(data.text, data.baby_age_months)

    # Persist decision log synchronously; this is acceptable for low concurrency.
    _persist_log(data, result)

    if result.status != "ok":
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=result.error,
        )
    return result
