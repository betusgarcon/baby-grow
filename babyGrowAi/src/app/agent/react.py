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
from app.services.rules import RuleEngine

logger = logging.getLogger(__name__)

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

    async def recommend(self, request: RecipeRecommendRequest) -> RecipeRecommendResponse:
        """Run the ReAct loop and return a recipe recommendation.

        Args:
            request: The recipe recommendation request.

        Returns:
            A `RecipeRecommendResponse` with `iterations` and `tool_trace` filled.
        """
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
        )

        messages = build_agent_messages(
            baby_age_months=request.baby_age_months,
            query=request.query,
            allergens=request.allergens,
            liked_foods=request.liked_foods,
            disliked_foods=request.disliked_foods,
            texture_level=request.texture_level,
            baby_id=request.baby_id,
        )

        try:
            # ReAct loop: each iteration the LLM either calls tools or returns
            # a final JSON answer. We cap iterations to prevent runaway loops.
            for iteration in range(1, self.max_iterations + 1):
                # Ask the model to either call tools or provide a final answer.
                # `tools=TOOL_SCHEMAS` signals Ollama to emit native tool_calls.
                response = await self.gateway.chat_sync(
                    messages=messages,
                    tools=TOOL_SCHEMAS,
                    options={"temperature": 0.1},
                )
                message = response.get("message", {})
                tool_calls = message.get("tool_calls") or []

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
                    raw_args = func.get("arguments", "{}")
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

                    # Run the deterministic Python tool and append its JSON
                    # result as a `role: "tool"` message.
                    result = await executor.execute(name, args)
                    messages.append(
                        {
                            "role": "tool",
                            "name": name,
                            "content": result,
                        }
                    )

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
            )
            for item in parsed.get("items", [])
        ]

        return RecipeRecommendResponse(
            status="ok",
            summary=parsed.get("summary", ""),
            items=items,
            avoid_items=parsed.get("avoidItems", []),
            reason=parsed.get("reason"),
            confidence=parsed.get("confidence", 0.0),
            source_refs=[],  # TODO: Agent path doesn't carry chunk-level refs; see architecture doc.
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
