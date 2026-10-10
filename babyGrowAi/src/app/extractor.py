"""Baby record extraction: turn free-form parent notes into structured data.

`BabyRecordExtractor` calls the LLM with a JSON schema constraining the output,
then validates the result into an `ExtractionResult`. Two input shapes share the
same validation and error handling:

- text notes, served by the configured text model;
- photos, served by the vision-language model (task `vision`).

Lifespan:
    Stable. Future work may add a real confidence score.
"""

import logging
import time
from typing import Any, Optional

from app.config import get_settings
from app.models import ExtractionResult, ExtractResponse
from app.prompts import extraction as extraction_prompts
from app.services.ollama_gateway import get_model_gateway
from app.telemetry import get_tracer

logger = logging.getLogger(__name__)
tracer = get_tracer("baby_record_extractor")


class BabyRecordExtractor:
    """Extract structured baby records from natural language text or a photo."""

    def __init__(self, gateway=None, model: Optional[str] = None):
        # Allow injection for tests; otherwise use the shared gateway singleton.
        self.gateway = gateway or get_model_gateway()
        settings = get_settings()
        self.model = model or settings.ollama_model
        self.vision_model = settings.vision_model

    async def extract(self, text: str, baby_age_months: int, population: str | None = None) -> ExtractResponse:
        """Extract records from `text` for a baby of the given age.

        Args:
            text: Parent's free-form note (e.g. "今天第一次翻身，吃了苹果泥").
            baby_age_months: Current age in months, passed to the prompt context.
            population: Population context for extraction (default baby).

        Returns:
            ExtractResponse with status ok/error, structured data, and timing info.
        """
        messages = extraction_prompts.build_messages(text, baby_age_months, population=population)
        return await self._run(
            messages=messages,
            task="extraction",
            model=self.model,
            raw_text=text,
            span_name="extractor.extract",
        )

    async def extract_from_media(
        self,
        image_base64: str,
        baby_age_months: int,
        note: str = "",
        population: str | None = None,
    ) -> ExtractResponse:
        """Extract records from a photo via the vision-language model.

        Args:
            image_base64: Raw base64 image content (no data-URI prefix).
            baby_age_months: Current age in months, passed to the prompt context.
            note: Optional caption supplied by the parent.
            population: Population context for extraction (default baby).
        """
        messages = extraction_prompts.build_vision_messages(
            image_base64=image_base64,
            baby_age_months=baby_age_months,
            note=note,
            population=population,
        )
        return await self._run(
            messages=messages,
            task="vision",
            model=self.vision_model,
            raw_text=note,
            span_name="extractor.extract_from_media",
        )

    async def _run(
        self,
        messages: list[dict[str, Any]],
        task: str,
        model: str,
        raw_text: str,
        span_name: str,
    ) -> ExtractResponse:
        """Shared path for both input shapes: call, validate, and report.

        Keeping this in one place is what guarantees a photo failure surfaces with
        the same shape as a text failure — the caller never has to branch.
        """
        with tracer.start_as_current_span(span_name) as span:
            span.set_attribute("task", task)
            span.set_attribute("model", model)
            span.set_attribute("message_count", len(messages))

            start = time.time()
            schema = extraction_prompts.get_extraction_schema()

            if task != "vision":
                span.set_attribute("text_length", len(raw_text))

            try:
                response = await self._call_with_retry(messages, schema, task=task)
                content = self._extract_content(response)
                if not content:
                    return self._error_response("Empty model response", start, model, raw_text)

                try:
                    result = ExtractionResult.model_validate_json(content)
                except Exception as exc:
                    # JSON validation can fail when the model misses fields or
                    # outputs extra keys. Retry once with temperature=0.0 to make
                    # the model more deterministic.
                    logger.warning("JSON validation failed, retrying: %s", exc)
                    response = await self._call_with_retry(messages, schema, task=task, temperature=0.0)
                    content = self._extract_content(response)
                    result = ExtractionResult.model_validate_json(content)

                elapsed = int((time.time() - start) * 1000)
                return ExtractResponse(
                    status="ok",
                    data=result,
                    raw_text=raw_text,
                    confidence=1.0,  # TODO: compute a real confidence score
                    model_name=model,
                    elapsed_ms=elapsed,
                )
            except Exception as exc:
                logger.exception("Extraction failed (task=%s)", task)
                return self._error_response(str(exc), start, model, raw_text)

    async def _call_with_retry(
        self,
        messages: list[dict[str, Any]],
        schema: dict[str, Any],
        task: str,
        temperature: Optional[float] = None,
    ) -> dict[str, Any]:
        """Call the model with the given messages and JSON schema, retrying once."""
        options = {"temperature": temperature if temperature is not None else get_settings().ai_temperature}
        last_error: Exception | None = None
        for attempt in range(2):
            try:
                return await self.gateway.chat_sync(
                    messages=messages,
                    format=schema,
                    options=options,
                    task=task,
                )
            except Exception as exc:  # noqa: BLE001
                last_error = exc
                logger.warning("Model call failed (task=%s, attempt %s): %s", task, attempt + 1, exc)
                time.sleep(0.5 * (attempt + 1))
        raise last_error or RuntimeError("Model extraction failed")

    def _extract_content(self, response: dict[str, Any]) -> str:
        """Pull the assistant content out of a chat response."""
        message = response.get("message", {})
        return message.get("content", "")

    def _error_response(
        self,
        error: str,
        start: float,
        model: str,
        raw_text: Optional[str] = None,
    ) -> ExtractResponse:
        """Build a consistent error response, preserving timing and raw text."""
        elapsed = int((time.time() - start) * 1000)
        return ExtractResponse(
            status="error",
            data=None,
            raw_text=raw_text,
            confidence=0.0,
            model_name=model,
            elapsed_ms=elapsed,
            error=error,
        )


# Singleton instance used by production code and tests.
_extractor: Optional[BabyRecordExtractor] = None


def get_extractor() -> BabyRecordExtractor:
    """Return the shared extractor instance."""
    global _extractor
    if _extractor is None:
        _extractor = BabyRecordExtractor()
    return _extractor


def reset_extractor() -> None:
    """Reset the singleton instance (mainly for tests)."""
    global _extractor
    _extractor = None
