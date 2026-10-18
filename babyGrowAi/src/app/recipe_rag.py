"""Recipe recommendation service: fixed pipeline + ReAct Agent entry point.

`RecipeRAGService` is the high-level service used by the HTTP router. It
supports two orchestration strategies:

1. Fixed pipeline (use_agent=False): rule filter → retrieve → prompt → LLM.
2. ReAct Agent (use_agent=True): LLM decides which tools to call and when to
   stop, with a max-iteration safety cap.

The default is the Agent path. The fixed pipeline is kept for A/B comparison
and safe rollback.

Lifespan:
    Evolving. Once the Agent path is proven stable, the fixed pipeline may be
    removed or turned into a debug-only endpoint.
"""

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
)
from app.prompts import recipe as recipe_prompts
from app.services.embedding import get_embedding_service
from app.services.ollama_gateway import get_model_gateway
from app.services.retrieval import RetrievalService
from app.services.rules import RuleEngine, merge_avoid_items

logger = logging.getLogger(__name__)


class RecipeRAGService:
    """High-level recipe recommendation service."""

    def __init__(self, gateway=None, retrieval_service=None, rule_engine=None):
        self.gateway = gateway or get_model_gateway()
        self.retrieval_service = retrieval_service
        self.rule_engine = rule_engine or RuleEngine()
        settings = get_settings()
        self.model = settings.ollama_model

    async def recommend(
        self, request: RecipeRecommendRequest, use_agent: bool = True
    ) -> RecipeRecommendResponse:
        """Return recipe recommendations for the given request.

        Args:
            request: The recipe recommendation request, including baby profile,
                allergens, and the parent's query.
            use_agent: If True, route to the ReAct agent. Otherwise use the fixed
                pipeline.

        Returns:
            A `RecipeRecommendResponse` with status, items, and timing info.
        """
        # ReAct agent path: LLM autonomously orchestrates tools via native
        # function calling. Falls back to the fixed pipeline when use_agent=False,
        # enabling A/B comparison between the two orchestration strategies.
        if use_agent:
            from app.agent.react import get_recipe_agent

            agent = get_recipe_agent()
            return await agent.recommend(request)

        start = time.time()

        try:
            # Step 1: deterministic safety and texture rules.
            # The LLM should never be trusted to enforce hard safety constraints.
            rule_result = self.rule_engine.filter_by_rules(
                baby_age_months=request.baby_age_months,
                allergens=request.allergens,
                texture_level=request.texture_level,
                population=request.population,
            )

            # Step 2-3: 检索知识库。
            #
            # 这一步依赖本机的 embedding 模型——知识库那 3093 个分块的向量是
            # bge-m3 生成的，换模型会导致向量空间不匹配、检索静默失准，
            # 所以它不能跟着 AI_MODEL_SOURCE 一起切到云端。
            #
            # 本机不在线时这里会抛错，但那不该让整个推荐失败：规则引擎
            # （月龄、过敏原、质地）本身就能给出安全可用的建议，检索只是让它
            # 更贴合具体场景。所以检索失败就退化成「没有知识上下文」，
            # 后面照常走提示词和模型。
            retrieved: list[dict] = []
            context = ""
            try:
                if self.retrieval_service is None:
                    # 刻意不传 db：传进来的 session 会随这个进程级单例一直活着、
                    # 被后续每个请求复用，而它当初还是在一个 already-exited 的
                    # `with Session(...)` 块里建的。不传时 RetrievalService 会为
                    # 每次检索自己开一个短生命周期的 session。
                    self.retrieval_service = RetrievalService()

                retrieved = await self.retrieval_service.retrieve(
                    query=request.query,
                    baby_age_months=request.baby_age_months,
                    allergens=request.allergens,
                    texture_level=request.texture_level,
                    top_k=get_settings().rag_top_k,
                )
                context = "\n\n".join([r["content"] for r in retrieved])
            except Exception:
                logger.warning(
                    "知识库检索不可用（多半是本地 embedding 模型不在线），"
                    "本次推荐降级为「纯规则 + 模型」，不含知识上下文",
                    exc_info=True,
                )

            # Step 4: build the prompt and call the model.
            messages = recipe_prompts.build_recipe_prompt(
                baby_age_months=request.baby_age_months,
                query=request.query,
                allergens=request.allergens,
                liked_foods=request.liked_foods,
                disliked_foods=request.disliked_foods,
                texture_level=request.texture_level,
                rule_result=rule_result,
                knowledge_context=context,
                language=request.language,
            )

            # Schema enforces the exact JSON shape returned by the LLM.
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
            except ValueError as exc:
                # JSONDecodeError 是 ValueError 的子类，两者一起收
                logger.warning("Recipe response could not be parsed as JSON: %s", exc)
                raise

            # 模型偶尔会回一个顶层数组或字符串，而后面每个字段都按 dict 取。
            # 不拦住的话会在某个 .get 上炸成 AttributeError，用户看到的是
            # 「推荐失败」，却完全指不到真正的原因（外壳形状不对）。
            if not isinstance(parsed, dict):
                logger.warning(
                    "Recipe response is not a JSON object: %s", type(parsed).__name__
                )
                raise ValueError("模型返回的不是 JSON 对象")

            items: list[RecipeItem] = []
            for raw_item in parsed.get("items") or []:
                if not isinstance(raw_item, dict):
                    continue
                # 菜名缺失就跳过这一条，而不是让 KeyError 把整份推荐废掉——
                # 一个连菜名都取不到的条目本来也没法展示。
                dish_name = raw_item.get("dishName") or raw_item.get("dish_name")
                if not dish_name:
                    logger.warning("Skipping recipe item without a dish name: %s", raw_item)
                    continue
                raw_ingredients = raw_item.get("ingredients")
                items.append(
                    RecipeItem(
                        meal_type=raw_item.get("mealType"),
                        dish_name=dish_name,
                        reason=raw_item.get("reason"),
                        ingredients=raw_ingredients if isinstance(raw_ingredients, list) else [],
                        instructions=raw_item.get("instructions"),
                    )
                )

            elapsed = int((time.time() - start) * 1000)

            # Build source references from retrieved chunks. Similarity is set to 0.0
            # because the vector score is discarded by RetrievalService; see the
            # TODO in the architecture doc for improving this.
            source_refs = [
                SourceRef(
                    document_id=r["document_id"],
                    chunk_id=r["id"],
                    title=str(r["metadata"].get("doc_type", "recipe")),
                    content=r["content"][:200],
                    similarity=r.get("similarity", 0.0),
                )
                for r in retrieved
            ]

            return RecipeRecommendResponse(
                status="ok",
                summary=parsed.get("summary", ""),
                items=items,
                # 与 ReAct Agent 同一条约束：声明的过敏原始终进「避免」，不依赖模型记性
                avoid_items=merge_avoid_items(parsed.get("avoidItems"), request.allergens),
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
        """Return a Server-Sent Events stream of the recommendation text.

        Note:
            This is a simplified implementation: the full response is generated
            first, then streamed character by character. A production version
            should stream directly from the model.
        """
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


# Singleton instance used by production code and tests.
_rag_service: Optional[RecipeRAGService] = None


def get_recipe_rag_service() -> RecipeRAGService:
    """Return the shared recipe recommendation service."""
    global _rag_service
    if _rag_service is None:
        _rag_service = RecipeRAGService()
    return _rag_service
