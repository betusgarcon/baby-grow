# 生产级模型网关设计

## 1. 背景与问题

宝宝成长 AI 服务最初只有本地 Ollama 一个推理后端。随着功能扩展，单一后端面临以下问题：

- **可用性风险**：Ollama 进程崩溃或模型未加载时，整个推荐链路不可用。
- **性能瓶颈**：本地 7B 模型推理慢，高并发时延迟抖动大。
- **成本不可控**：无法按任务选择性价比更高的模型，也缺乏 token/cost 核算。
- **扩展困难**：新增 OpenAI/Claude/Gemini/自研模型需要重写调用逻辑。

## 2. 设计目标

1. **统一入口**：业务代码只调用 `ModelGatewayRouter`，无需关心底层 provider。
2. **任务路由**：按任务类型（`extraction`、`recipe_fixed`、`recipe_agent`、`embedding`）选择最合适的 provider/model。
3. **高可用**：重试 + 降级 + 熔断 + 限流。
4. **可观测**：每次调用写入 `LlmCallLog`，并输出 OpenTelemetry span/metrics。
5. **向后兼容**：保留旧的 `OllamaGateway` API，业务代码无需改动。

## 3. 架构图

```
                    ┌─────────────────────────────┐
                    │     ModelGatewayRouter      │
                    │  (路由 / 重试 / 熔断 / 限流) │
                    └──────────────┬──────────────┘
                                   │
           ┌───────────────────────┼───────────────────────┐
           │                       │                       │
    ┌──────▼──────┐       ┌───────▼────────┐      ┌───────▼───────┐
    │    Ollama   │       │ OpenAI-compatible│      │  未来：Claude  │
    │  (本地模型)  │       │  (远程模型)     │      │  / Gemini     │
    └─────────────┘       └────────────────┘      └───────────────┘
```

## 4. 核心模块

### 4.1 抽象层 `BaseModelGateway`

所有 provider 实现统一接口：

- `chat(request: ModelRequest) -> ModelResponse`
- `embed(texts, model) -> list[list[float]]`
- `health() -> bool`
- `default_model / embedding_model / pricing`

`ModelRequest` / `ModelResponse` 是跨 provider 的标准数据结构，业务层不再依赖任何特定 SDK 的数据结构。

### 4.2 路由层 `ModelGatewayRouter`

路由逻辑：

1. 根据 `request.task` 匹配 `RoutingRule`。
2. 按 `primary -> fallback` 顺序尝试 provider。
3. 每个 provider 内部先做 **熔断检查**，再执行 **限流检查**。
4. 对单个 provider 进行 **最多 3 次指数退避重试**。
5. 成功后记录 `LlmCallLog` 和 OpenTelemetry metrics。
6. 全部失败则抛出原始异常，由上层转换为安全兜底响应。

### 4.3 稳定性机制

| 机制 | 配置 | 行为 |
|------|------|------|
| 重试 | max_attempts=3, base_delay=0.5s | 指数退避，0.5s / 1s / 2s |
| 降级 | fallback 链 | primary 失败后切 fallback provider/model |
| 熔断 | failure_threshold=5, recovery_timeout=30s | 连续失败 5 次后开启，30s 后半开 |
| 限流 | rate_limit_per_second | 令牌桶，控制每秒请求数 |

### 4.4 成本核算 `CostTracker`

维护 `provider/model -> input_price/output_price` 映射。

```
cost = input_tokens * input_price / 1_000_000 + output_tokens * output_price / 1_000_000
```

Ollama 本地模型成本记为 0；OpenAI 按官方价目表计费。

### 4.5 可观测

- **OpenTelemetry**：`model_gateway.router.chat` span，包含 task/provider/model/latency/cost/error。
- **Metrics**：`llm_request_total`、`llm_latency_ms`、`llm_cost_usd`、`llm_fallback_total`。
- **持久化**：每次调用写入 `LlmCallLog` 表，字段包括 provider、model、task_type、input_tokens、output_tokens、latency_ms、cost_usd、status、error。

## 5. 配置示例

```python
RoutingConfig(
    providers=[
        ProviderConfig(provider="ollama", model="qwen2.5:7b-instruct-q5_K_M", enabled=True),
        ProviderConfig(provider="openai", model="gpt-4o-mini", api_key="<your_api_key>", enabled=True),
    ],
    rules=[
        RoutingRule(
            task="recipe_agent",
            primary=RoutingTarget(provider="ollama", model="qwen2.5:7b-instruct-q5_K_M"),
            fallback=[RoutingTarget(provider="openai", model="gpt-4o-mini")],
        ),
        RoutingRule(
            task="embedding",
            primary=RoutingTarget(provider="ollama", model="bge-m3:latest"),
        ),
    ],
)
```

## 6. 降级与兜底

失败分级：

- **轻度**：指数退避重试 1-2 次。
- **中度**：切换 fallback provider。
- **重度**：上层返回安全兜底响应（固定链路返回空推荐 + 提示，Agent 返回空 items + error）。

## 7. 向后兼容

旧的 `OllamaGateway`（`app/services/ollama_gateway.py`）保留，但内部转发到 `ModelGatewayRouter`：

```python
class OllamaGateway:
    def __init__(self, ...):
        self._router = get_model_gateway_router()

    async def chat(self, messages, ...):
        request = ModelRequest(messages=messages, task="chat", ...)
        response = await self._router.chat(request)
        return response.raw_response
```

业务代码 `recipe_rag.py`、`agent/react.py`、`extractor.py` 无需改动。

## 8. 面试话术

> 在生产环境里，模型网关是最容易被忽视但影响最大的基础设施之一。我设计的网关核心解决三个问题：可用性、成本、可观测。
>
> 可用性方面，我实现了任务级路由 + 降级 + 熔断 + 限流。比如 `recipe_agent` 任务默认走本地 Ollama，本地模型挂掉或推理超时时会自动降级到 OpenAI；同时每个 provider 有独立的熔断器和令牌桶限流。
>
> 成本方面，我统一了 `ModelRequest/ModelResponse`，并在 `CostTracker` 里维护不同 provider/model 的 input/output 单价，每次调用自动计算 cost，写入 `LlmCallLog`。
>
> 可观测方面，我接入了 OpenTelemetry，输出 span 和 metrics，包括 latency、token 数、cost、fallback 次数，方便后续做成本告警和容量规划。
>
> 最后我对旧 API 做了兼容，业务代码无感知，测试也全部通过。
