import json
import logging
import time
from typing import Any, Optional

from fastapi.responses import StreamingResponse

from app.config import get_settings
from app.models import (
    AiDecisionLog,
    RecipeRecommendRequest,
    RecipeRecommendResponse,
    RecipeItem,
    SourceRef,
    get_engine,
)
from app.prompts import recipe as recipe_prompts
from app.services.embedding import get_embedding_service
from app.services.ollama_gateway import get_model_gateway
from app.services.retrieval import RetrievalService
from app.services.rules import RuleEngine

logger = logging.getLogger(__name__)


class RecipeRAGService:
    def __init__(self, gateway=None, retrieval_service=None, rule_engine=None):
        self.gateway = gateway or get_model_gateway()
        self.retrieval_service = retrieval_service
        self.rule_engine = rule_engine or RuleEngine()
        settings = get_settings()
        self.model = settings.ollama_model

    async def recommend(self, request: RecipeRecommendRequest) -> RecipeRecommendResponse:
        start = time.time()

        try:
            rule_result = self.rule_engine.filter_by_rules(
                baby_age_months=request.baby_age_months,
                allergens=request.allergens,
                texture_level=request.texture_level,
            )

            if self.retrieval_service is None:
                from sqlalchemy.orm import Session

                with Session(bind=get_engine()) as db:
                    self.retrieval_service = RetrievalService(db=db)

            retrieved = await self.retrieval_service.retrieve(
                query=request.query,
                baby_age_months=request.baby_age_months,
                allergens=request.allergens,
                texture_level=request.texture_level,
                top_k=get_settings().rag_top_k,
            )

            context = "\n\n".join([r["content"] for r in retrieved])

            messages = recipe_prompts.build_recipe_prompt(
                baby_age_months=request.baby_age_months,
                query=request.query,
                allergens=request.allergens,
                liked_foods=request.liked_foods,
                disliked_foods=request.disliked_foods,
                texture_level=request.texture_level,
                rule_result=rule_result,
                knowledge_context=context,
            )

            schema = {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "summary": {"type": "string"},
                    "items": {
                        "type": "array",
                        "minItems": 1,
                        "maxItems": 3,
                        "items": {
                            "type": "object",
                            "additionalProperties": False,
                            "properties": {
                                "mealType": {"type": "string"},
                                "dishName": {"type": "string"},
                                "reason": {"type": "string"},
                                "ingredients": {
                                    "type": "array",
                                    "items": {"type": "string"},
                                },
                            },
                            "required": ["mealType", "dishName", "reason", "ingredients"],
                        },
                    },
                    "avoidItems": {
                        "type": "array",
                        "items": {"type": "string"},
                    },
                    "reason": {"type": "string"},
                    "confidence": {"type": "number"},
                },
                "required": ["summary", "items", "avoidItems", "reason", "confidence"],
            }

            response = await self.gateway.chat_sync(messages, format=schema)
            content = response.get("message", {}).get("content", "")

            try:
                parsed = json.loads(content)
            except json.JSONDecodeError as exc:
                logger.warning("Recipe response JSON decode failed: %s", exc)
                raise

            items = [
                RecipeItem(
                    meal_type=item.get("mealType"),
                    dish_name=item["dishName"],
                    reason=item.get("reason"),
                    ingredients=item.get("ingredients", []),
                    instructions=item.get("instructions"),
                )
                for item in parsed.get("items", [])
            ]

            elapsed = int((time.time() - start) * 1000)

            source_refs = [
                SourceRef(
                    document_id=r["document_id"],
                    chunk_id=r["id"],
                    title=str(r["metadata"].get("doc_type", "recipe")),
                    content=r["content"][:200],
                    similarity=0.0,
                )
                for r in retrieved
            ]

            return RecipeRecommendResponse(
                status="ok",
                summary=parsed.get("summary", ""),
                items=items,
                avoid_items=parsed.get("avoidItems", []),
                reason=parsed.get("reason"),
                confidence=parsed.get("confidence", 0.0),
                source_refs=source_refs,
                model_name=self.model,
                elapsed_ms=elapsed,
            )

        except Exception as exc:
            logger.exception("Recipe recommendation failed")
            elapsed = int((time.time() - start) * 1000)
            return RecipeRecommendResponse(
                status="error",
                summary="",
                items=[],
                avoid_items=[],
                reason=None,
                confidence=0.0,
                source_refs=[],
                model_name=self.model,
                elapsed_ms=elapsed,
                error=str(exc),
            )

    async def recommend_stream(self, request: RecipeRecommendRequest) -> StreamingResponse:
        # Simplified streaming: generate first, then stream content
        # A more advanced version would stream directly from Ollama.
        result = await self.recommend(request)
        text = result.summary
        if result.items:
            text += "\n\n推荐菜品：\n"
            for item in result.items:
                text += f"- {item.dish_name}\n"
        if result.error:
            text = f"抱歉，推荐失败：{result.error}"

        async def stream():
            for char in text:
                yield f"data: {char}\n\n"
            yield "data: [DONE]\n\n"

        return StreamingResponse(stream(), media_type="text/event-stream")


_rag_service: Optional[RecipeRAGService] = None


def get_recipe_rag_service() -> RecipeRAGService:
    global _rag_service
    if _rag_service is None:
        _rag_service = RecipeRAGService()
    return _rag_service
