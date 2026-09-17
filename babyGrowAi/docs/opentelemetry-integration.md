# OpenTelemetry 接入方案

> 本文介绍 OpenTelemetry 是什么、为什么要在 AI 服务中接入它，以及当前项目的具体接入步骤和最佳实践。

---

## 1. OpenTelemetry 是什么

**OpenTelemetry（OTel）** 是一个开源的可观测性框架，由 CNCF 维护。它统一了三种信号的采集：

| 信号 | 说明 | 当前项目用途 |
|------|------|-------------|
| **Traces（链路）** | 记录一次请求在多个组件中的调用路径 | FastAPI 请求 → Ollama 调用 → DB 检索 → Agent 工具链 |
| **Metrics（指标）** | 聚合的数值，例如 QPS、延迟、错误率 | 推荐接口的 P99 延迟、Ollama 调用次数 |
| **Logs（日志）** | 结构化的事件日志 | 与 trace 关联的 AI 决策日志 |

OTel 的核心优势：

- **vendor-neutral**：数据格式统一，后端可接 Jaeger、Grafana Tempo、Datadog、Langfuse、自研平台等。
- **context propagation**：跨服务传递 trace_id，方便前端 → Java 后端 → Python AI 服务一起定位问题。
- **auto + manual instrumentation**：既有自动埋点，也能在关键代码处手动增加 span。

---

## 2. 为什么当前项目需要 OTel

当前项目只有 `AiDecisionLog` 表和普通日志，存在以下缺口：

| 缺口 | OTel 解法 |
|------|----------|
| 不知道一次推荐请求卡在哪一步 | Trace 展示完整链路，精确到每个 tool 调用 |
| 失败时无法还原完整输入输出 | Span 属性记录 prompt、schema、模型输出 |
| 难以统计 Agent 平均迭代次数、工具调用分布 | Metrics 直接上报 |
| 前后端问题定位困难 | 通过 HTTP header 传递 trace context |

接入 OTel 后，面试时可以说：

> “我在 AI 服务里接入了 OpenTelemetry，把整个推荐链路拆成多个 span，包括 Ollama 调用、向量检索、规则检查、Agent tool 调用。通过 OTLP exporter 把数据发到 Jaeger/Langfuse，能精确定位一次推荐慢在哪、哪个 tool 失败、LLM 输出是否符合预期。”

---

## 3. 依赖安装

在 `babyGrowAi/pyproject.toml` 的 `[project.optional-dependencies]` 或 `dependencies` 中加入：

```toml
"opentelemetry-api>=1.24.0",
"opentelemetry-sdk>=1.24.0",
"opentelemetry-distro>=0.45b0",
"opentelemetry-exporter-otlp>=1.24.0",
"opentelemetry-instrumentation-fastapi>=0.45b0",
"opentelemetry-instrumentation-sqlalchemy>=0.45b0",
"opentelemetry-instrumentation-httpx>=0.45b0",
"opentelemetry-instrumentation-logging>=0.45b0",
```

安装命令：

```bash
cd babyGrowAi
source .venv/bin/activate
pip install -e ".[dev]"
```

---

## 4. 接入架构

```
┌──────────────┐     HTTP + traceparent header     ┌─────────────┐
│  Java 后端   │ ────────────────────────────────► │ FastAPI AI  │
└──────────────┘                                   │   服务       │
                                                   └──────┬──────┘
                                                          │
                            ┌─────────────────────────────┼─────────────────────────────┐
                            │                             │                             │
                            ▼                             ▼                             ▼
                   ┌─────────────┐             ┌─────────────┐               ┌─────────────┐
                   │ Ollama 网关  │             │   PostgreSQL │               │   Redis     │
                   │ (chat/embed)│             │  (pgvector)  │               │  (cache)    │
                   └─────────────┘             └─────────────┘               └─────────────┘
                            │                             │                             │
                            └─────────────────────────────┴─────────────────────────────┘
                                                          │
                                                          ▼
                                              ┌─────────────────────┐
                                              │   OpenTelemetry SDK  │
                                              │   OTLP/gRPC/HTTP    │
                                              └──────────┬──────────┘
                                                         │
                                                         ▼
                                              ┌─────────────────────┐
                                              │  OTel Collector /    │
                                              │  Jaeger / Grafana    │
                                              │  Tempo / Langfuse    │
                                              └─────────────────────┘
```

---

## 5. 核心代码接入

### 5.1 初始化 OTel（`src/app/telemetry.py` 新建）

```python
"""OpenTelemetry initialization for the AI service."""

import logging

from opentelemetry import metrics, trace
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter

logger = logging.getLogger(__name__)


def init_telemetry(service_name: str = "baby-grow-ai", otlp_endpoint: str | None = None):
    """Initialize tracer and meter. Must be called once at startup."""
    resource = Resource.create({
        "service.name": service_name,
        "service.version": "0.1.0",
        "deployment.environment": "local",  # override via env var
    })

    # Traces
    tracer_provider = TracerProvider(resource=resource)
    if otlp_endpoint:
        span_exporter = OTLPSpanExporter(endpoint=otlp_endpoint)
        tracer_provider.add_span_processor(BatchSpanProcessor(span_exporter))
    else:
        # 默认控制台输出，方便本地调试
        from opentelemetry.sdk.trace.export import ConsoleSpanExporter
        tracer_provider.add_span_processor(BatchSpanProcessor(ConsoleSpanExporter()))
    trace.set_tracer_provider(tracer_provider)

    # Metrics
    metric_reader = PeriodicExportingMetricReader(
        OTLPMetricExporter(endpoint=otlp_endpoint) if otlp_endpoint else None
    )
    metrics.set_meter_provider(MeterProvider(resource=resource, metric_readers=[metric_reader]))

    logger.info("Telemetry initialized: endpoint=%s", otlp_endpoint or "console")


def get_tracer(name: str = "app"):
    return trace.get_tracer(name)


def get_meter(name: str = "app"):
    return metrics.get_meter(name)
```

在 `src/app/main.py` 的 `startup_event` 中调用：

```python
from app.telemetry import init_telemetry

@app.on_event("startup")
async def startup_event():
    settings = get_settings()
    init_telemetry(otlp_endpoint=settings.get("OTEL_EXPORTER_OTLP_ENDPOINT"))
    # ... rest of startup
```

### 5.2 FastAPI 自动埋点（`src/app/main.py`）

```python
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor

app = FastAPI(title="baby-grow-ai", version="0.1.0")
FastAPIInstrumentor.instrument_app(app)
```

这样每个 HTTP 请求会自动生成 root span，并支持从 header 读取 `traceparent`。

### 5.3 SQLAlchemy 自动埋点（`src/app/models.py`）

在 `get_engine()` 之后，或在 `init_db()` 中：

```python
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor

# after engine is created
SQLAlchemyInstrumentor().instrument(engine=engine.engine)
```

> 注意：`SQLAlchemyInstrumentor` 需要在 `create_engine` 之后调用。如果 engine 是 lazy cached，可以在 `get_engine()` 内部 instrument。

### 5.4 HTTPX 自动埋点（Ollama 健康检查）

```python
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor

HTTPXClientInstrumentor().instrument()
```

### 5.5 Ollama 调用手动埋点（`src/app/services/ollama_gateway.py`）

Ollama SDK 没有官方 OTel 自动埋点，建议手动加 span：

```python
from app.telemetry import get_tracer

tracer = get_tracer("ollama_gateway")

class OllamaGateway(BaseModelGateway):
    async def chat(self, messages, format=None, options=None, tools=None, stream=False):
        with tracer.start_as_current_span("ollama.chat") as span:
            span.set_attribute("ollama.model", self.model)
            span.set_attribute("ollama.tool_count", len(tools) if tools else 0)
            span.set_attribute("ollama.message_count", len(messages))
            span.set_attribute("ollama.stream", stream)

            try:
                start = time.time()
                response = await self.client.chat(**kwargs)
                span.set_attribute("ollama.latency_ms", int((time.time() - start) * 1000))

                # 记录模型输出摘要（注意：不要记录敏感信息）
                msg = response.get("message", {})
                span.set_attribute("ollama.response_has_tool_calls", bool(msg.get("tool_calls")))
                span.set_attribute("ollama.response_content_length", len(msg.get("content", "")))
                return response
            except Exception as exc:
                span.set_attribute("error", True)
                span.set_attribute("error.message", str(exc))
                raise
```

### 5.6 Agent 工具链手动埋点（`src/app/agent/react.py`）

在每个 Agent 循环和 tool 调用处加 span：

```python
from app.telemetry import get_tracer

tracer = get_tracer("recipe_agent")

class RecipeAgent:
    async def recommend(self, request):
        with tracer.start_as_current_span("agent.recommend") as root_span:
            root_span.set_attribute("baby.age_months", request.baby_age_months)
            root_span.set_attribute("baby.allergens", ",".join(request.allergens))
            root_span.set_attribute("query", request.query)

            for iteration in range(1, self.max_iterations + 1):
                with tracer.start_as_current_span("agent.llm_step") as step_span:
                    step_span.set_attribute("iteration", iteration)
                    # ... call LLM

                    for call in tool_calls:
                        with tracer.start_as_current_span(f"agent.tool.{call_name}") as tool_span:
                            tool_span.set_attribute("tool.name", call_name)
                            tool_span.set_attribute("tool.args", json.dumps(args, ensure_ascii=False))
                            # ... execute tool
```

### 5.7 业务 Metrics 定义（`src/app/routers/recipe.py`）

```python
from app.telemetry import get_meter

meter = get_meter("routers")

recommend_counter = meter.create_counter(
    "recommend.requests.total",
    description="Total recipe recommendation requests",
)

recommend_latency = meter.create_histogram(
    "recommend.latency_ms",
    unit="ms",
    description="Recipe recommendation latency",
)

agent_iterations = meter.create_histogram(
    "agent.iterations",
    description="Number of ReAct iterations per recommendation",
)
```

在 `recommend_recipes` 中记录：

```python
recommend_counter.add(1, {"status": result.status})
recommend_latency.record(result.elapsed_ms, {"status": result.status})
if result.iterations is not None:
    agent_iterations.record(result.iterations, {"status": result.status})
```

---

## 6. Trace Context 跨服务传递

当前架构是：

```
小程序 → Java 后端 → Python AI 服务
```

要让 Java 后端传入的 trace_id 在 AI 服务里保持一致，需要 Java 后端在调用 AI 服务时带上 `traceparent` header：

```http
POST /api/baby/recipes/recommend HTTP/1.1
traceparent: 00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01
```

FastAPI 的 `FastAPIInstrumentor` 会自动读取这个 header 并复用 trace context。

---

## 7. 最佳实践

### 7.1 不要记录敏感信息

- ❌ 不要记录完整 prompt、用户输入原文、宝宝姓名
- ✅ 可以记录 prompt 长度、schema 类型、输出长度、工具名

### 7.2 Span 命名规范

```
<component>.<operation>
```

例如：

- `ollama.chat`
- `agent.tool.retrieve_knowledge`
- `retrieval.search`
- `rule_engine.filter`

### 7.3 采样策略

生产环境不建议 100% 采样，使用 **head-based sampling** 或 **tail-based sampling**：

```python
from opentelemetry.sdk.trace.sampling import TraceIdRatioBased

# 采样 10%
tracer_provider = TracerProvider(
    sampler=TraceIdRatioBased(0.1),
    resource=resource,
)
```

### 7.4 本地调试 vs 生产

| 环境 | Exporter | 建议 |
|------|----------|------|
| 本地 | Console | 直接看 span JSON |
| 测试 | OTLP → Jaeger / Tempo | 可视化链路 |
| 生产 | OTLP → OTel Collector → 后端 | 解耦、批量、重试 |

### 7.5 与现有 `AiDecisionLog` 的关系

OTel 是 **实时可观测性**，`AiDecisionLog` 是 **持久化业务审计**。两者不冲突：

- 把 `trace_id` 写入 `AiDecisionLog`
- 需要深查某个决策时，用 `trace_id` 去 trace 后端定位

```python
log = AiDecisionLog(
    # ...
    raw_response_json={
        **result.model_dump(),
        "trace_id": trace.format_trace_id(span.get_span_context().trace_id),
    },
)
```

### 7.6 错误处理与异常记录

所有 span 内的异常都应该显式记录，而不是只打印日志：

```python
from opentelemetry.trace import Status, StatusCode

except Exception as exc:
    span.set_status(Status(StatusCode.ERROR, str(exc)))
    span.record_exception(exc)
```

---

## 8. 面试可以怎么讲

> “我们在 AI 服务里接入了 OpenTelemetry，覆盖了三层：
> 1. **自动埋点**：FastAPI、SQLAlchemy、HTTPX 自动接入；
> 2. **手动埋点**：Ollama 调用、Agent ReAct 循环、每个 tool 调用都有独立 span；
> 3. **业务指标**：推荐请求数、latency、Agent 迭代次数都通过 OTel metrics 上报。
> 数据通过 OTLP 发送到 Jaeger/Langfuse，配合 `AiDecisionLog` 里的 trace_id，可以一键定位一次推荐请求里哪个 tool 慢、LLM 有没有调用 tool、输出是否合规。”

---

## 9. 下一步落地建议

1. **先接 trace，再补 metrics**：trace 带来的调试价值最大。
2. **优先手动埋点 Agent 链路**：这是项目的核心亮点。
3. **本地用 Console exporter**：确保 span 正确生成后再接 OTLP。
4. **和 Java 后端约定 traceparent header**：打通全链路。
5. **保留 `AiDecisionLog` 作为审计，OTel 作为实时观测**：两者互补。
