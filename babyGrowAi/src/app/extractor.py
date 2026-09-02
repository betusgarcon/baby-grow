import json
import logging
import time
from typing import Any, Optional

from app.config import get_settings
from app.models import ExtractionResult, ExtractResponse
from app.prompts import extraction as extraction_prompts
from app.services.ollama_gateway import get_model_gateway

logger = logging.getLogger(__name__)


class BabyRecordExtractor:
    def __init__(self, gateway=None, model: Optional[str] = None):
        self.gateway = gateway or get_model_gateway()
        settings = get_settings()
        self.model = model or settings.ollama_model

    async def extract(self, text: str, baby_age_months: int) -> ExtractResponse:
        start = time.time()
        messages = extraction_prompts.build_messages(text, baby_age_months)
        schema = extraction_prompts.get_extraction_schema()

        try:
            response = await self._call_with_retry(messages, schema)
            content = self._extract_content(response)
            if not content:
                return self._error_response("Empty model response", start)

            try:
                result = ExtractionResult.model_validate_json(content)
            except Exception as exc:
                logger.warning("JSON validation failed, retrying: %s", exc)
                response = await self._call_with_retry(messages, schema, temperature=0.0)
                content = self._extract_content(response)
                result = ExtractionResult.model_validate_json(content)

            elapsed = int((time.time() - start) * 1000)
            return ExtractResponse(
                status="ok",
                data=result,
                raw_text=text,
                confidence=1.0,
                model_name=self.model,
                elapsed_ms=elapsed,
            )
        except Exception as exc:
            logger.exception("Extraction failed")
            return self._error_response(str(exc), start, raw_text=text)

    async def _call_with_retry(
        self,
        messages: list[dict[str, Any]],
        schema: dict[str, Any],
        temperature: Optional[float] = None,
    ) -> dict[str, Any]:
        options = {"temperature": temperature if temperature is not None else get_settings().ai_temperature}
        last_error = None
        for attempt in range(2):
            try:
                return await self.gateway.chat_sync(
                    messages=messages,
                    format=schema,
                    options=options,
                )
            except Exception as exc:  # noqa: BLE001
                last_error = exc
                logger.warning("Ollama call failed (attempt %s): %s", attempt + 1, exc)
                time.sleep(0.5 * (attempt + 1))
        raise last_error or RuntimeError("Ollama extraction failed")

    def _extract_content(self, response: dict[str, Any]) -> str:
        message = response.get("message", {})
        return message.get("content", "")

    def _error_response(self, error: str, start: float, raw_text: Optional[str] = None) -> ExtractResponse:
        elapsed = int((time.time() - start) * 1000)
        return ExtractResponse(
            status="error",
            data=None,
            raw_text=raw_text,
            confidence=0.0,
            model_name=self.model,
            elapsed_ms=elapsed,
            error=error,
        )


_extractor: Optional[BabyRecordExtractor] = None


def get_extractor() -> BabyRecordExtractor:
    global _extractor
    if _extractor is None:
        _extractor = BabyRecordExtractor()
    return _extractor
