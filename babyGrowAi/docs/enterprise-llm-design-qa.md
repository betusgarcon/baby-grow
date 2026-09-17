# 企业级 AI 进阶设计问答

> 本文回答以下 5 个问题：
> 1. schema 解析失败率通常由什么原因导致？
> 2. 如何设计一个可灵活定制的大模型网关，支持本地/外部模型、重试、成本、稳定性、安全级别？
> 3. 推荐来源引用（Citation）如何设计？
> 4. 如何对 LLM 进行幻觉检测？
> 5. Agent 的 iterations / tool_trace 可视化如何展开？

---

## 1. Schema 解析失败率通常由什么原因导致

### 1.1 模型本身的问题

| 原因 | 说明 | 示例 |
|------|------|------|
| **JSON mode 不支持或质量差** | 部分模型没有真正的 JSON mode，只是 prompt 诱导 | 输出前后带说明文字 |
| **Schema 过于复杂** | 嵌套太深、字段太多、约束太多 | `items[*].nutrition.facts[*].amount` 这种深嵌套 |
| **Token 不足** | 输出还没完成就被截断 | `{"summary": "...", "items": [` 然后结束 |
| **Temperature 太高** | 模型太有创造力，不遵守约束 | 输出 Markdown 而不是 JSON |
| **Instruction 遵循能力差** | 小模型对 "只输出 JSON" 理解不够 | 输出 `\`\`\`json\n{...}\n\`\`\`` |

### 1.2 Prompt / 上下文的问题

| 原因 | 说明 | 解法 |
|------|------|------|
| **Prompt 没强调格式** | 模型不知道是按 schema 输出 | system prompt 明确 `"只输出 JSON，不要解释"` |
| **上下文太长** | 长上下文让小模型丢失约束 | 压缩上下文、换大模型 |
| **Few-shot 示例不够** | 模型没见过正确格式 | 加 1-2 个 JSON 示例 |
| **知识片段干扰** | 检索片段里有代码块、特殊符号 | 清洗文本、转义 |

### 1.3 代码/工程的问题

| 原因 | 说明 | 解法 |
|------|------|------|
| **schema 写错** | `required` 字段缺失、类型不匹配 | 用 Pydantic 自动生成 schema |
| **解析器太严格** | 不允许任何多余空格或换行 | 用 `json.loads` 前先 strip |
| **没有容错** | 一旦解析失败就抛异常 | 做 output repair 和 fallback |
| **没有日志** | 不知道模型到底返回了什么 | 记录原始响应 |

### 1.4 当前项目的典型风险

当前 `recipe_rag.py` 里手写的 schema 已经比较规范，但仍需关注：

- Ollama `format` 参数是否真的强制 JSON mode？建议改成 Pydantic model 的 `model_json_schema()`。
- Agent 路径最终输出没有 schema 约束，只是 prompt 里要求 JSON，失败率会高于固定链路。
- 模型 `qwen2.5:7b-instruct-q5_K_M` 对中文 JSON 的支持整体较好，但仍需 repair 机制兜底。

### 1.5 降低失败率的组合拳

```python
from pydantic import ValidationError
import json

async def safe_generate(schema_class, messages, gateway, max_repair=2):
    schema = schema_class.model_json_schema()

    for attempt in range(max_repair + 1):
        response = await gateway.chat_sync(messages, format=schema)
        content = response["message"].get("content", "")

        try:
            return schema_class.model_validate_json(content)
        except (json.JSONDecodeError, ValidationError):
            # 1. 尝试从 Markdown 代码块中提取
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            try:
                return schema_class.model_validate_json(content)
            except (json.JSONDecodeError, ValidationError):
                # 2. 做 repair
                messages.append({"role": "assistant", "content": content})
                messages.append({
                    "role": "user",
                    "content": f"请修复上面的 JSON，使其严格符合 schema：{schema}。只输出修复后的 JSON。"
                })

    raise RuntimeError("Failed to generate valid JSON after repair")
```

---

## 2. 设计一个可灵活定制的大模型网关

### 2.1 需求拆解

一个生产级网关需要同时满足：

| 需求 | 说明 |
|------|------|
| **多后端支持** | Ollama、OpenAI、Claude、Gemini、自研模型 |
| **模型路由** | 按任务、成本、可用性路由到不同模型 |
| **重试与降级** | 失败后重试、切模型、返回兜底 |
| **成本控制** | 统计 token、按模型计费、预算告警 |
| **稳定性** | 熔断、限流、超时、连接池 |
| **安全** | API key 管理、内容审核、审计日志 |
| **可观测** | trace、metrics、日志 |

### 2.2 架构设计

```
                    ┌─────────────────────────────────────────┐
                    │           Application Code              │
                    │   BabyRecordExtractor / RecipeAgent   │
                    └───────────────────┬─────────────────────┘
                                        │
                                        
                    ┌─────────────────────────────────────────┐
                    │         ModelGatewayRouter              │
                    │  1. 根据任务类型和策略选择 provider        │
                    │  2. 调用具体 gateway                     │
                    │  3. 失败时重试/降级                      │
                    └───────────────────┬─────────────────────┘
                                        │
            ┌───────────────────────────┼───────────────────────────┐
            │                           │                           │
            ▼                           ▼                           ▼
    ┌───────────────┐         ┌───────────────┐         ┌───────────────
    │ OllamaGateway │         │ OpenAIGateway │         │ ClaudeGateway │
    │  (local)      │         │  (external)   │         │  (external)   │
    └───────┬───────┘         └───────┬───────┘         └───────┬───────┘
            │                           │                       │
            └───────────────────────────┴───────────────────────┘
                                        │
                                        ▼
                    ┌─────────────────────────────────────────┐
                    │        Observability & Metrics          │
                    │   trace / metrics / cost / audit        │
                    └─────────────────────────────────────────┘
```

### 2.3 核心抽象

```python
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, AsyncIterator, Optional


@dataclass
class ModelRequest:
    """统一的模型请求对象。"""
    messages: list[dict[str, str]]
    task: str  # "extraction" / "recipe_fixed" / "recipe_agent" / "embedding"
    format: Optional[dict[str, Any]] = None
    tools: Optional[list[dict[str, Any]]] = None
    options: Optional[dict[str, Any]] = None
    stream: bool = False
    preferred_provider: Optional[str] = None
    max_latency_ms: Optional[int] = None
    min_safety_level: str = "normal"  # "strict" / "normal" / "best-effort"


@dataclass
class ModelResponse:
    """统一的模型响应对象。"""
    content: str
    model: str
    provider: str
    latency_ms: int
    input_tokens: int = 0
    output_tokens: int = 0
    cost_usd: float = 0.0
    tool_calls: Optional[list[dict]] = None
    raw_response: Optional[dict] = None


class BaseModelGateway(ABC):
    """模型网关抽象基类。"""

    provider: str = ""

    @abstractmethod
    async def chat(self, request: ModelRequest) -> ModelResponse:
        raise NotImplementedError

    @abstractmethod
    async def embed(self, texts: list[str]) -> list[list[float]]:
        raise NotImplementedError

    @abstractmethod
    async def health(self) -> bool:
        raise NotImplementedError

    @property
    @abstractmethod
    def model_pricing(self) -> dict[str, float]:
        """Return {input_per_1k, output_per_1k}."""
        raise NotImplementedError
```

### 2.4 路由策略

```python
ROUTING_RULES = [
    {
        "task": "extraction",
        "primary": {"provider": "ollama", "model": "qwen2.5:7b"},
        "fallback": [{"provider": "openai", "model": "gpt-4o-mini"}],
    },
    {
        "task": "recipe_agent",
        "primary": {"provider": "ollama", "model": "qwen2.5:14b"},
        "fallback": [
            {"provider": "openai", "model": "gpt-4o"},
            {"provider": "ollama", "model": "qwen2.5:7b"},
        ],
    },
    {
        "task": "embedding",
        "primary": {"provider": "ollama", "model": "bge-m3"},
    },
]
```

### 2.5 路由器实现

```python
import time
from typing import Optional

from opentelemetry import trace


tracer = trace.get_tracer("model_gateway_router")


class ModelGatewayRouter:
    def __init__(self, gateways: dict[str, BaseModelGateway], routing_rules: list[dict]):
        self.gateways = gateways
        self.rules = {rule["task"]: rule for rule in routing_rules}
        # 可以接入 metrics
        self.failure_counts = {}

    async def chat(self, request: ModelRequest) -> ModelResponse:
        rule = self.rules.get(request.task, {})
        candidates = [rule.get("primary", {})] + rule.get("fallback", [])

        last_error = None
        for candidate in candidates:
            if not candidate:
                continue
            provider = candidate["provider"]
            model = candidate["model"]

            with tracer.start_as_current_span("gateway.chat") as span:
                span.set_attribute("task", request.task)
                span.set_attribute("provider", provider)
                span.set_attribute("model", model)

                gateway = self.gateways.get(provider)
                if not gateway:
                    span.set_attribute("error", "gateway not found")
                    continue

                if not await gateway.health():
                    span.set_attribute("error", "unhealthy")
                    continue

                try:
                    start = time.time()
                    response = await gateway.chat(request)
                    response.latency_ms = int((time.time() - start) * 1000)
                    span.set_attribute("latency_ms", response.latency_ms)
                    span.set_attribute("cost_usd", response.cost_usd)
                    return response
                except Exception as exc:
                    last_error = exc
                    span.set_attribute("error", str(exc))
                    span.set_status(trace.Status(trace.StatusCode.ERROR))

        raise last_error or RuntimeError("All model providers failed")

    async def route_by_policy(
        self,
        request: ModelRequest,
        policy: str = "cost",  # "cost" / "quality" / "latency"
    ) -> ModelResponse:
        # 实际项目中可以结合实时 metrics 选择 provider
        if policy == "cost":
            # 选 cheapest healthy provider
            pass
        elif policy == "quality":
            # 选能力最强的
            pass
        elif policy == "latency":
            # 选最近响应快的
            pass
        return await self.chat(request)
```

### 2.6 成本统计

```python
class CostTracker:
    def __init__(self):
        self.pricing = {
            "ollama/qwen2.5:7b": {"input": 0.0, "output": 0.0},
            "openai/gpt-4o": {"input": 5.0 / 1_000_000, "output": 15.0 / 1_000_000},
            "openai/gpt-4o-mini": {"input": 0.15 / 1_000_000, "output": 0.6 / 1_000_000},
        }

    def calculate(self, provider: str, model: str, input_tokens: int, output_tokens: int) -> float:
        key = f"{provider}/{model}"
        price = self.pricing.get(key, {"input": 0.0, "output": 0.0})
        return (input_tokens * price["input"]) + (output_tokens * price["output"])
```

### 2.7 熔断与限流

```python
class CircuitBreaker:
    """简易熔断器。"""

    def __init__(self, failure_threshold: int = 5, recovery_timeout: int = 30):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.failures = 0
        self.last_failure_time = None
        self.state = "closed"  # closed / open / half-open

    def record_success(self):
        self.failures = 0
        self.state = "closed"

    def record_failure(self):
        self.failures += 1
        self.last_failure_time = time.time()
        if self.failures >= self.failure_threshold:
            self.state = "open"

    def can_execute(self):
        if self.state == "closed":
            return True
        if self.state == "open" and time.time() - self.last_failure_time > self.recovery_timeout:
            self.state = "half-open"
            return True
        return False
```

### 2.8 安全级别

```python
class SafetyGate:
    def check_input(self, messages: list[dict]) -> bool:
        # 1. 敏感词检测
        # 2. prompt injection 简单检测
        # 3. 长度限制
        return True

    def check_output(self, content: str) -> bool:
        # 1. 非法内容检测
        # 2. 个人信息泄露检测
        return True
```

---

## 3. 推荐来源引用（Citation）设计

### 3.1 目标

让用户/运营看到：

> “这道菜来自《鸡肉南瓜粥》食谱，对应知识库 chunk #123，相似度 0.87。”

### 3.2 设计

当前固定流水线已经有 `SourceRef`，但 `similarity=0.0`。需要：

1. 在 retrieval 时保留 similarity score。
2. 在 LLM prompt 里要求返回每个菜品的来源 chunk id。
3. 返回时把 chunk 和菜品关联。

#### 修改 RetrievalService

```python
class RetrievalService:
    async def retrieve(self, query, baby_age_months, ..., top_k=5):
        # ... 检索逻辑
        results = []
        for chunk, distance in zip(chunks, distances):
            results.append({
                "id": chunk.id,
                "document_id": chunk.document_id,
                "content": chunk.content,
                "metadata": chunk.chunk_metadata,
                "similarity": 1.0 - distance,  # pgvector cosine_distance -> similarity
            })
        return results
```

#### 修改 RecipeItem 模型

```python
class RecipeItem(BaseModel):
    meal_type: Optional[str]
    dish_name: str
    reason: Optional[str]
    ingredients: list[str]
    instructions: Optional[str]
    source_chunk_ids: list[int] = Field(default_factory=list)
```

#### 修改 Prompt

```
每道推荐菜品必须标注来源知识库 chunk 的 id 列表。
```

#### 修改响应构建

```python
source_refs = [
    SourceRef(
        document_id=r["document_id"],
        chunk_id=r["id"],
        title=str(r["metadata"].get("doc_type", "recipe")),
        content=r["content"][:200],
        similarity=r["similarity"],
    )
    for r in retrieved
]
```

### 3.3 Agent 路径的 citation

Agent 路径更复杂，因为 LLM 调用 tool 后，工具结果里没有直接返回 chunk id。需要：

1. `retrieve_knowledge` 工具返回时带上 `chunk_ids` 和 `similarities`。
2. Agent 的 system prompt 要求最终 JSON 里的每个菜品标注来源 chunk id。
3. `_parse_final_answer` 解析 `sourceChunkIds`，再反查 `retrieved_chunks`。

工具结果示例：

```json
{
  "snippets": [
    {
      "chunk_id": 123,
      "content": "...",
      "similarity": 0.87
    }
  ]
}
```

---

## 4. 如何对 LLM 进行幻觉检测

### 4.1 幻觉的类型

| 类型 | 说明 | 示例 |
|------|------|------|
| **事实性幻觉** | 推荐的知识库里没有 | 推荐一道不存在的菜 |
| **矛盾性幻觉** | 与规则/事实矛盾 | 给 6 个月宝宝推荐蜂蜜 |
| **编造引用** | source_ref 指向不存在的内容 | chunk_id 不存在 |
| **过度泛化** | 把特殊案例当普遍建议 | 所有便秘都推荐泻药 |

### 4.2 检测方法

#### ① 基于检索结果的事实核查

```python
def check_factual_hallucination(recommended_items: list[RecipeItem], retrieved: list[dict]) -> list[str]:
    """检查推荐菜品是否能在检索结果中找到依据。"""
    retrieved_text = "\n".join([r["content"] for r in retrieved]).lower()
    alerts = []
    for item in recommended_items:
        if item.dish_name.lower() not in retrieved_text:
            alerts.append(f"菜品 '{item.dish_name}' 未在检索结果中出现")
    return alerts
```

#### ② 基于规则的冲突检测

```python
def check_rule_conflicts(response: RecipeRecommendResponse, request: RecipeRecommendRequest, rule_result: dict):
    alerts = []
    avoid_set = set(rule_result.get("avoid_items", []))
    for item in response.items:
        for ingredient in item.ingredients:
            if ingredient in avoid_set:
                alerts.append(f"食材 '{ingredient}' 在避免列表中")
    for allergen in request.allergens:
        for item in response.items:
            if allergen in item.ingredients or allergen in item.dish_name:
                alerts.append(f"包含过敏原 '{allergen}'")
    return alerts
```

#### ③ 基于 LLM 的自评（Self-Consistency / LLM-as-Judge）

```python
HALLUCINATION_CHECK_PROMPT = """你是一名严格的审核员。

检索到的知识库内容：
{context}

模型推荐结果：
{recommendation}

请判断推荐结果是否存在以下问题：
1. 推荐了知识库中没有的菜品
2. 包含过敏原或月龄不适配的食材
3. 推荐理由与知识库不符

只输出 JSON：{{"is_valid": true/false, "issues": ["..."]}}"""

async def llm_hallucination_check(recommendation: str, context: str, gateway) -> dict:
    messages = [
        {"role": "system", "content": HALLUCINATION_CHECK_PROMPT.format(context=context, recommendation=recommendation)}
    ]
    response = await gateway.chat_sync(messages, format={"type": "object", "properties": {"is_valid": {"type": "boolean"}, "issues": {"type": "array", "items": {"type": "string"}}}, "required": ["is_valid", "issues"]})
    return json.loads(response["message"]["content"])
```

#### ④ 引用校验

```python
def validate_citations(response: RecipeRecommendResponse, valid_chunk_ids: set[int]) -> list[str]:
    alerts = []
    for ref in response.source_refs:
        if ref.chunk_id not in valid_chunk_ids:
            alerts.append(f"无效引用 chunk_id={ref.chunk_id}")
    return alerts
```

### 4.3 幻觉检测后的处理

```python
async def safe_recommend(request):
    response = await service.recommend(request)

    if response.status != "ok":
        return response

    alerts = []
    alerts += check_rule_conflicts(response, request, rule_result)
    alerts += check_factual_hallucination(response.items, retrieved)
    alerts += validate_citations(response, valid_chunk_ids)

    if alerts:
        # 降级：只返回知识库里有明确依据的菜品，或返回兜底提示
        return downgrade_response(response, alerts)

    return response
```

---

## 5. iterations / tool_trace 可视化展开

### 5.1 当前状态

当前 `RecipeRecommendResponse` 已有：

```python
iterations: Optional[int]
tool_trace: list[str]
```

但这只是“结果快照”，缺少过程细节。

### 5.2 需要记录的过程数据

每个 iteration 应该记录：

```python
class AgentStep(BaseModel):
    iteration: int
    role: str  # assistant / tool / user
    content: Optional[str]
    tool_calls: list[dict] = []
    tool_name: Optional[str]
    tool_args: Optional[dict]
    tool_result_summary: Optional[str]
    latency_ms: int
    timestamp: datetime
```

### 5.3 修改 Agent 保存 steps

```python
class RecipeRecommendResponse(BaseModel):
    # ... 原有字段
    iterations: Optional[int]
    tool_trace: list[str]
    agent_steps: list[AgentStep] = []
```

在 `react.py` 中：

```python
self.agent_steps.append(AgentStep(
    iteration=iteration,
    role="assistant",
    content=message.get("content"),
    tool_calls=tool_calls,
    latency_ms=llm_latency_ms,
    timestamp=datetime.utcnow(),
))

for call in tool_calls:
    # ... execute
    self.agent_steps.append(AgentStep(
        iteration=iteration,
        role="tool",
        tool_name=name,
        tool_args=args,
        tool_result_summary=result[:200],
        latency_ms=tool_latency_ms,
        timestamp=datetime.utcnow(),
    ))
```

### 5.4 可视化界面设计

一个典型的 Agent trace 可视化页面：

```
推荐请求：9个月宝宝，便秘
├── Step 1: assistant 调用工具
│   ├── tool: check_rules
│   ├── args: {baby_age_months: 9, allergens: [], texture_level: null}
│   └── result: {avoid_items: ["蜂蜜","盐","糖"], recommended_texture: "碎末"}
├── Step 2: assistant 调用工具
│   ├── tool: retrieve_knowledge
│   ├── args: {query: "便秘", baby_age_months: 9}
│   └── result: 3 个知识片段（南瓜红薯燕麦）
├── Step 3: assistant 调用工具
│   ├── tool: get_recent_diet
│   ├── args: {baby_id: "baby_001", days: 3}
│   └── result: 最近吃过胡萝卜泥、米粉
├── Step 4: assistant 生成最终推荐
│   ├── content: {summary, items, avoidItems, ...}
│   └── confidence: 0.88
└── 总计：4 次迭代，耗时 3200ms
```

### 5.5 后端接口

新增一个只读接口，用于查看某个推荐请求的 Agent 执行过程：

```python
@router.get("/recommend/{decision_log_id}/trace")
async def get_recommend_trace(decision_log_id: int):
    # 从 AiDecisionLog 中读取 raw_response_json，里面包含 agent_steps
    # 或者直接查询专门的 agent_trace 表
    return {
        "decision_log_id": decision_log_id,
        "iterations": trace.iterations,
        "total_latency_ms": trace.elapsed_ms,
        "steps": trace.agent_steps,
    }
```

### 5.6 前端展示

建议用折叠时间线组件：

- 绿色：成功调用的 tool
- 黄色：有 warning 的 step
- 红色：失败的 tool
- 点击每个 step 展开详情（args、result、latency）

### 5.7 面试话术

> “我把 Agent 的每次迭代和 tool 调用都记录成结构化的 `agent_steps`，并通过一个 `/recommend/{id}/trace` 接口暴露出来。前端用时间线展示 Agent 的思考过程：先调了 check_rules，再调 retrieve_knowledge，最后生成推荐。这样运营同学可以一眼看出推荐慢在哪、哪个 tool 失败、LLM 有没有绕过安全规则。”

---

## 6. 总结

| 问题 | 核心思路 |
|------|---------|
| schema 失败 | 原因在模型能力、schema 复杂度、prompt、解析器；解法：Pydantic schema + output repair + 结构化输出 |
| 模型网关 | 抽象 BaseModelGateway + Router + 重试/降级/成本/熔断/安全 |
| 来源引用 | retrieval 保留 similarity + response 中每个菜品绑定 chunk id |
| 幻觉检测 | 检索事实核查 + 规则冲突 + 引用校验 + LLM-as-Judge |
| 可视化 | 记录每个 Agent step，用时间线 + trace 接口展示 |

下一步建议：先从 **schema 约束、Agent steps 记录、来源引用 similarity** 这三件事落地，因为它们改动小、收益高，能直接提升可靠性、可观测性和可解释性。
