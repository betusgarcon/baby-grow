"""ReAct agent for recipe recommendation via Ollama native tool calling.

The LLM autonomously decides which tools to call (check_rules / retrieve_knowledge
/ get_recent_diet), observes results, and loops until it produces a final answer
or hits the iteration cap. Tool bodies are deterministic Python; the model only
controls orchestration — this is the core "Agent" capability vs the fixed pipeline.

Lifespan:
    Evolving. The tool set, prompt, iteration cap, and source_refs handling
    are all expected to change as the Agent matures.
"""

import json
import logging
import time
from typing import Any, Optional

from app.agent.prompts import FORCE_ANSWER_PROMPT, build_agent_messages
from app.agent.tools import TOOL_SCHEMAS, ToolExecutor
from app.config import get_settings
from app.models import RecipeItem, RecipeRecommendRequest, RecipeRecommendResponse, SourceRef
from app.services.ollama_gateway import get_model_gateway
from app.services.retrieval import RetrievalService
from app.services.rules import RuleEngine, merge_avoid_items
from app.telemetry import get_tracer

logger = logging.getLogger(__name__)
tracer = get_tracer("recipe_agent")

# Engineering safety cap: prevents infinite tool-call loops and caps cost/latency.
MAX_ITERATIONS = 5


class RecipeAgent:
    """ReAct agent that recommends recipes by orchestrating tools via tool calling."""

    def __init__(
        self,
        gateway=None,
        rule_engine: Optional[RuleEngine] = None,
        retrieval_service: Optional[RetrievalService] = None,
        max_iterations: int = MAX_ITERATIONS,
    ):
        self.gateway = gateway or get_model_gateway()
        self.rule_engine = rule_engine or RuleEngine()
        self.retrieval_service = retrieval_service
        self.max_iterations = max_iterations
        settings = get_settings()
        self.model = settings.ollama_model
        # Cache retrieved chunk details so the final answer can bind source refs.
        self._retrieved_chunks: dict[int, dict[str, Any]] = {}

    async def recommend(self, request: RecipeRecommendRequest) -> RecipeRecommendResponse:
        """Run the ReAct loop and return a recipe recommendation.

        Args:
            request: The recipe recommendation request.

        Returns:
            A `RecipeRecommendResponse` with `iterations` and `tool_trace` filled.
        """
        with tracer.start_as_current_span("agent.recommend") as root_span:
            root_span.set_attribute("baby.age_months", request.baby_age_months)
            root_span.set_attribute("baby.allergens", ",".join(request.allergens))
            root_span.set_attribute("query", request.query)

            start = time.time()
            tool_trace: list[str] = []
            retrieved_chunks: list[dict[str, Any]] = []

            # Lazily init retrieval service (mirrors RecipeRAGService pattern).
            if self.retrieval_service is None:
                from app.models import get_engine
                from sqlalchemy.orm import Session

                with Session(bind=get_engine()) as db:
                    self.retrieval_service = RetrievalService(db=db)

            executor = ToolExecutor(
                rule_engine=self.rule_engine,
                retrieval_service=self.retrieval_service,
                recent_diet=[day.model_dump() for day in request.recent_diet],
            )

            messages = build_agent_messages(
                baby_age_months=request.baby_age_months,
                query=request.query,
                allergens=request.allergens,
                liked_foods=request.liked_foods,
                disliked_foods=request.disliked_foods,
                texture_level=request.texture_level,
                baby_id=request.baby_id,
                population=request.population,
            )

            try:
                # ReAct loop: each iteration the LLM either calls tools or returns
                # a final JSON answer. We cap iterations to prevent runaway loops.
                for iteration in range(1, self.max_iterations + 1):
                    with tracer.start_as_current_span("agent.llm_step") as step_span:
                        step_span.set_attribute("iteration", iteration)

                        response = await self.gateway.chat_sync(
                            messages=messages,
                            tools=TOOL_SCHEMAS,
                            options={"temperature": 0.1},
                        )
                        message = response.get("message", {})
                        tool_calls = message.get("tool_calls") or []

                        step_span.set_attribute("tool_call_count", len(tool_calls))

                        # No tool calls → the model produced a final answer.
                        if not tool_calls:
                            content = message.get("content", "")
                            elapsed = int((time.time() - start) * 1000)
                            # If the model answered in plain text (no JSON), nudge once more.
                            if content and "{" not in content:
                                messages.append(
                                    {
                                        "role": "user",
                                        "content": "请把上面的推荐整理成最终 JSON 格式。",
                                    }
                                )
                                response = await self.gateway.chat_sync(
                                    messages=messages,
                                    options={"temperature": 0.0},
                                )
                                content = response.get("message", {}).get("content", "")
                            return self._parse_final_answer(
                                content, request, tool_trace, retrieved_chunks, iteration, elapsed
                            )

                        # Append the assistant message (with tool_calls) to history so the
                        # model sees its own request when it gets the tool results back.
                        messages.append(
                            {
                                "role": "assistant",
                                "content": message.get("content", "") or "",
                                "tool_calls": tool_calls,
                            }
                        )

                        # Execute each tool call and feed results back as tool messages.
                        # The assistant message must precede the tool messages so the
                        # model understands which tool produced which result.
                        for call in tool_calls:
                            func = call.get("function", {})
                            name = func.get("name", "")
                            raw_args = func.get("arguments", "{")
                            args = self._parse_args(raw_args)
                            # Ollama sometimes omits required arguments or invents
                            # aliases (e.g., empty query, missing baby_age_months).
                            # Enrich the arguments from the original request before
                            # executing so deterministic tools never fail on missing
                            # required fields.
                            args = self._enrich_tool_args(name, args, request)

                            # Track retrieval chunks for source_refs in the final response.
                            if name == "retrieve_knowledge":
                                self._track_retrieved(args, retrieved_chunks)

                            tool_trace.append(name)
                            logger.info("Agent iter=%d tool=%s args=%s", iteration, name, args)

                            with tracer.start_as_current_span(f"agent.tool.{name}") as tool_span:
                                tool_span.set_attribute("tool.name", name)
                                tool_span.set_attribute("tool.args", json.dumps(args, ensure_ascii=False))

                                result = await executor.execute(name, args)
                                messages.append(
                                    {
                                        "role": "tool",
                                        "name": name,
                                        "content": result,
                                    }
                                )
                                # Register chunk metadata for citation building.
                                if name == "retrieve_knowledge":
                                    self._register_retrieved_chunks([{"content": result}])

                # Hit the iteration cap: force a final answer with what we have.
                logger.warning("Agent hit max_iterations=%d, forcing final answer", self.max_iterations)
                messages.append({"role": "user", "content": FORCE_ANSWER_PROMPT})
                response = await self.gateway.chat_sync(
                    messages=messages,
                    options={"temperature": 0.0},
                )
                content = response.get("message", {}).get("content", "")
                elapsed = int((time.time() - start) * 1000)
                return self._parse_final_answer(
                    content, request, tool_trace, retrieved_chunks, self.max_iterations, elapsed
                )

            except Exception as exc:
                logger.exception("RecipeAgent failed")
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
                    iterations=len(tool_trace),
                    tool_trace=tool_trace,
                    error=str(exc),
                )

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _parse_args(raw: Any) -> dict[str, Any]:
        """Tool arguments may arrive as a JSON string or a dict (Ollama SDK variance)."""
        if isinstance(raw, str):
            try:
                return json.loads(raw)
            except json.JSONDecodeError:
                return {}
        if isinstance(raw, dict):
            return raw
        return {}

    @staticmethod
    def _enrich_tool_args(name: str, args: dict[str, Any], request: RecipeRecommendRequest) -> dict[str, Any]:
        """Backfill required tool arguments from the request if the LLM omitted them.

        Ollama/qwen occasionally emits tool_calls with missing required fields
        (e.g., `baby_age_months` or `baby_id`) or an empty `query`. This keeps
        deterministic tool execution safe without changing the model.
        """
        enriched = dict(args)
        if name in ("check_rules", "retrieve_knowledge"):
            enriched.setdefault("baby_age_months", request.baby_age_months)
            enriched.setdefault("allergens", request.allergens)
            if not enriched.get("texture_level"):
                enriched["texture_level"] = request.texture_level
        if name == "retrieve_knowledge" and not enriched.get("query"):
            enriched["query"] = request.query or "辅食推荐"
        if name == "get_recent_diet" and not enriched.get("baby_id"):
            enriched["baby_id"] = request.baby_id or "baby_001"
        return enriched

    @staticmethod
    def _track_retrieved(args: dict[str, Any], retrieved: list[dict[str, Any]]) -> None:
        """Stash the query so source_refs can be built from the retrieval result.

        The actual chunks come back inside the tool result JSON; we parse them
        from there in _parse_final_answer if needed. Here we only note the call.
        """
        retrieved.append({"query": args.get("query", ""), "called": True})

    def _register_retrieved_chunks(self, tool_results: list[dict[str, Any]]) -> None:
        """Parse chunk identifiers and scores from tool results.

        The `retrieve_knowledge` tool returns JSON with a `snippets` list that
        includes `chunk_id`, `document_id`, `content`, `metadata`, and `similarity`.
        We store them keyed by chunk_id so the final answer can bind source refs.
        """
        for result in tool_results:
            content = result.get("content") if isinstance(result, dict) else None
            if not content:
                continue
            try:
                payload = json.loads(content)
            except json.JSONDecodeError:
                continue
            for snippet in payload.get("snippets", []):
                chunk_id = snippet.get("chunk_id")
                if chunk_id is None or chunk_id in self._retrieved_chunks:
                    continue
                self._retrieved_chunks[chunk_id] = {
                    "document_id": snippet.get("document_id", 0),
                    "content": snippet.get("content", ""),
                    "metadata": snippet.get("metadata", {}),
                    "similarity": snippet.get("similarity", 0.0),
                }

    @staticmethod
    def _bind_item_to_chunks(
        item: dict[str, Any],
        chunks: dict[int, dict[str, Any]],
        max_refs: int = 2,
    ) -> list[int]:
        """Return the most relevant chunk ids for a single recommended item.

        If the model provided valid `source_chunk_ids`, use them. Otherwise fall
        back to keyword overlap between the item text and each retrieved chunk.
        """
        provided = [cid for cid in item.get("source_chunk_ids", []) if cid in chunks]
        if provided:
            return provided[:max_refs]

        if not chunks:
            return []

        text = " ".join(
            [
                item.get("dishName", ""),
                item.get("reason", ""),
                " ".join(item.get("ingredients", [])),
            ]
        ).lower()
        words = set(text.split())
        scored: list[tuple[int, float]] = []
        for chunk_id, chunk in chunks.items():
            chunk_text = chunk.get("content", "").lower()
            overlap = len(words & set(chunk_text.split()))
            if overlap:
                scored.append((chunk_id, overlap + chunk.get("similarity", 0.0)))
        # If no keyword overlap, fall back to the highest-similarity chunks.
        if not scored:
            scored = [
                (chunk_id, chunk.get("similarity", 0.0))
                for chunk_id, chunk in chunks.items()
            ]
            scored.sort(key=lambda x: x[1], reverse=True)
        else:
            scored.sort(key=lambda x: x[1], reverse=True)
        return [cid for cid, _ in scored[:max_refs]]

    def _parse_final_answer(
        self,
        content: str,
        request: RecipeRecommendRequest,
        tool_trace: list[str],
        retrieved: list[dict[str, Any]],
        iterations: int,
        elapsed_ms: int,
    ) -> RecipeRecommendResponse:
        """Parse the LLM's final JSON content into a RecipeRecommendResponse."""
        if not content:
            return self._error_response(request, tool_trace, iterations, elapsed_ms, "Empty model response")

        try:
            parsed = json.loads(content)
        except json.JSONDecodeError:
            # Try to extract a JSON object from surrounding text.
            parsed = self._extract_json(content)
            if parsed is None:
                return self._error_response(
                    request, tool_trace, iterations, elapsed_ms, "Failed to parse JSON"
                )

        items = [
            RecipeItem(
                meal_type=item.get("mealType"),
                dish_name=item.get("dishName", ""),
                reason=item.get("reason"),
                ingredients=item.get("ingredients", []),
                source_chunk_ids=item.get("source_chunk_ids", []),
            )
            for item in parsed.get("items", [])
        ]

        # Normalize item -> chunk bindings. If the model omitted source_chunk_ids
        # or referenced chunks not in our retrieval cache, fall back to overlap.
        for item in items:
            bound = self._bind_item_to_chunks(
                {
                    "dishName": item.dish_name,
                    "reason": item.reason or "",
                    "ingredients": item.ingredients,
                    "source_chunk_ids": item.source_chunk_ids,
                },
                self._retrieved_chunks,
            )
            item.source_chunk_ids = bound

        # Build source_refs from chunk ids referenced by the model.
        source_refs: list[SourceRef] = []
        seen_chunk_ids = set()
        for item in items:
            for chunk_id in item.source_chunk_ids:
                if chunk_id in seen_chunk_ids:
                    continue
                seen_chunk_ids.add(chunk_id)
                chunk = self._retrieved_chunks.get(chunk_id)
                if chunk is None:
                    continue
                source_refs.append(
                    SourceRef(
                        document_id=chunk["document_id"],
                        chunk_id=chunk_id,
                        title=chunk.get("metadata", {}).get("doc_type", "recipe"),
                        content=chunk["content"][:200],
                        similarity=chunk.get("similarity", 0.0),
                    )
                )

        return RecipeRecommendResponse(
            status="ok",
            summary=parsed.get("summary", ""),
            items=items,
            # 模型漏写 avoidItems 时，声明的过敏原仍必须出现在「避免」里
            avoid_items=merge_avoid_items(parsed.get("avoidItems"), request.allergens),
            reason=parsed.get("reason"),
            confidence=parsed.get("confidence", 0.0),
            source_refs=source_refs,
            model_name=self.model,
            elapsed_ms=elapsed_ms,
            iterations=iterations,
            tool_trace=tool_trace,
        )

    @staticmethod
    def _extract_json(text: str) -> Optional[dict[str, Any]]:
        """Best-effort: pull the first {...} block out of text."""
        start = text.find("{")
        end = text.rfind("}")
        if start == -1 or end == -1 or end <= start:
            return None
        try:
            return json.loads(text[start : end + 1])
        except json.JSONDecodeError:
            return None

    def _error_response(
        self,
        request: RecipeRecommendRequest,
        tool_trace: list[str],
        iterations: int,
        elapsed_ms: int,
        error: str,
    ) -> RecipeRecommendResponse:
        """Build a consistent error response, preserving tool_trace for debugging."""
        return RecipeRecommendResponse(
            status="error",
            summary="",
            items=[],
            avoid_items=list(request.allergens),
            reason=None,
            confidence=0.0,
            source_refs=[],
            model_name=self.model,
            elapsed_ms=elapsed_ms,
            iterations=iterations,
            tool_trace=tool_trace,
            error=error,
        )


# Singleton instance used by production code and tests.
_agent: Optional[RecipeAgent] = None


def get_recipe_agent() -> RecipeAgent:
    """Return the shared recipe agent."""
    global _agent
    if _agent is None:
        _agent = RecipeAgent()
    return _agent
