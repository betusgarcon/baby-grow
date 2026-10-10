"""Tool definitions and executor for the recipe ReAct agent.

Three tools are exposed to the LLM via Ollama native function calling:
  - check_rules: deterministic safety rules (age / allergen / texture)
  - retrieve_knowledge: hybrid RAG retrieval over the knowledge base
  - get_recent_diet: recent meals for a baby, supplied by the caller

The LLM decides which tool to call, in what order, and when to stop. Tool
bodies are deterministic Python — the model only controls the orchestration.

Lifespan:
    Evolving. The tool set and prompt are expected to change as the Agent matures.
"""

import json
import logging
from typing import Any, Optional

from app.services.retrieval import RetrievalService
from app.services.rules import RuleEngine

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Tool JSON schemas (OpenAI function format, Ollama-compatible)
# ---------------------------------------------------------------------------

TOOL_SCHEMAS: list[dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": "check_rules",
            "description": (
                "检查宝宝月龄、过敏原、质地相关的硬性安全规则。"
                "高风险判断（过敏原、月龄是否适配辅食）必须先调用本工具，"
                "不要凭模型自己判断。返回需要避免的食物列表和推荐质地。"
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "baby_age_months": {
                        "type": "integer",
                        "description": "宝宝月龄",
                    },
                    "allergens": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "已知过敏原列表",
                    },
                    "texture_level": {
                        "type": "string",
                        "description": "质地偏好: 泥糊/碎末/软块/颗粒/家常",
                    },
                },
                "required": ["baby_age_months"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "retrieve_knowledge",
            "description": (
                "从辅食知识库检索与查询相关的食谱和指南片段。"
                "推荐必须基于本工具返回的内容，不要编造知识库中没有的食谱。"
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "检索查询，如'便秘'、'补铁'、'第一次吃鱼'。必须根据家长的问题填写，不能为空。",
                    },
                    "baby_age_months": {
                        "type": "integer",
                        "description": "宝宝月龄，用于过滤不适配的知识",
                    },
                    "allergens": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "已知过敏原，检索时排除含过敏原的内容",
                    },
                    "texture_level": {
                        "type": "string",
                        "description": "质地偏好",
                    },
                },
                "required": ["query", "baby_age_months"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_recent_diet",
            "description": (
                "查询宝宝近几天的饮食记录，用于避免推荐近期重复食材。"
                "推荐前应调用本工具了解近期已吃过的食物。"
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "baby_id": {
                        "type": "string",
                        "description": "宝宝ID",
                    },
                    "days": {
                        "type": "integer",
                        "description": "查询最近几天的记录，默认3",
                    },
                },
                "required": ["baby_id"],
            },
        },
    },
]


# ---------------------------------------------------------------------------
# Recent diet
# ---------------------------------------------------------------------------


def get_recent_diet(days: int = 3, recent_diet: Optional[list[dict[str, Any]]] = None) -> list[dict[str, Any]]:
    """Return the caller-supplied recent diet, trimmed to `days`.

    The AI service deliberately has no access to the business database, so the
    caller (the Java backend) passes recent intake in with the request. When it
    is absent we return nothing rather than inventing meals — a fabricated diet
    would make the recommendation silently wrong in a way nobody could see.
    """
    if not recent_diet:
        return []
    return list(recent_diet)[:days]


# ---------------------------------------------------------------------------
# Tool executor
# ---------------------------------------------------------------------------


class ToolExecutor:
    """Executes tool calls requested by the LLM. Each tool returns a JSON string."""

    def __init__(
        self,
        rule_engine: Optional[RuleEngine] = None,
        retrieval_service: Optional[RetrievalService] = None,
        recent_diet: Optional[list[dict[str, Any]]] = None,
    ):
        self.rule_engine = rule_engine or RuleEngine()
        self.retrieval_service = retrieval_service
        self.recent_diet = recent_diet

    async def execute(self, name: str, arguments: dict[str, Any]) -> str:
        """Execute a tool by name with the given arguments. Returns JSON string."""
        try:
            if name == "check_rules":
                return self._check_rules(arguments)
            elif name == "retrieve_knowledge":
                return await self._retrieve_knowledge(arguments)
            elif name == "get_recent_diet":
                return self._get_recent_diet(arguments)
            else:
                return json.dumps({"error": f"unknown tool: {name}"}, ensure_ascii=False)
        except Exception as exc:  # noqa: BLE001
            logger.warning("Tool %s failed: %s", name, exc)
            # Return the error as a tool result so the LLM can decide how to degrade.
            # This keeps the agent loop alive instead of crashing the whole request.
            return json.dumps({"error": str(exc)}, ensure_ascii=False)

    def _check_rules(self, args: dict[str, Any]) -> str:
        """Run deterministic safety rules and return the result as JSON."""
        result = self.rule_engine.filter_by_rules(
            baby_age_months=args["baby_age_months"],
            allergens=args.get("allergens", []),
            texture_level=args.get("texture_level"),
        )
        return json.dumps(result, ensure_ascii=False)

    async def _retrieve_knowledge(self, args: dict[str, Any]) -> str:
        """Retrieve knowledge snippets from the vector database."""
        if self.retrieval_service is None:
            return json.dumps({"error": "retrieval service not available"}, ensure_ascii=False)

        # Fallback to the user's original query if the LLM omitted it.
        # Some models pass an literal empty string; treating that as empty
        # would trigger the zero-dimension guard in RetrievalService, so we
        # also check a few common alias keys here.
        query = args.get("query") or args.get("original_query") or ""

        retrieved = await self.retrieval_service.retrieve(
            query=query,
            baby_age_months=args["baby_age_months"],
            allergens=args.get("allergens", []),
            texture_level=args.get("texture_level"),
        )
        # Trim content for the LLM context; keep identifiers and score so the
        # agent can cite sources in its final answer.
        snippets = [
            {
                "chunk_id": r["id"],
                "document_id": r["document_id"],
                "content": r["content"][:300],
                "metadata": r.get("metadata", {}),
                "similarity": r.get("similarity", 0.0),
                "rrf_score": r.get("rrf_score", 0.0),
            }
            for r in retrieved
        ]
        return json.dumps({"snippets": snippets}, ensure_ascii=False)

    def _get_recent_diet(self, args: dict[str, Any]) -> str:
        """Return recent diet records supplied by the caller."""
        records = get_recent_diet(days=args.get("days", 3), recent_diet=self.recent_diet)

        if not records:
            # 明确告知「没有」，而不是返回空数组。空数组会让模型以为「这几天什么都没吃」，
            # 进而推荐重复食材。
            return json.dumps(
                {"recent_diet": [], "note": "调用方未提供近期饮食记录，无法据此去重。请按口味与营养均衡推荐。"},
                ensure_ascii=False,
            )
        return json.dumps({"recent_diet": records}, ensure_ascii=False)
