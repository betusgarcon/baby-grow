# baby-grow-ai 架构与代码寿命

本文档描述 AI 服务的整体架构、核心数据流、各模块职责以及代码寿命（哪些代码稳定、哪些即将重构、哪些只是临时占位）。阅读前建议先看 `README.md` 和 `docs/api.md`。

---

## 1. 整体架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                          外部调用方                                   │
│         小程序 ←→ Java 后端 (baby-grow-server) ←→ 这里                 │
└──────────────────────────────────┬──────────────────────────────────┘
                                   │ HTTP
                          ┌────────▼────────┐
                          │   FastAPI 服务   │  src/app/main.py
                          │  (port 8001)     │
                          └────────┬────────┘
                                   │
          ┌────────────────────────┼────────────────────────┐
          │                        │                        │
┌─────────▼─────────┐  ┌───────────▼────────────┐  ┌──────▼──────┐
│  /api/baby/records │  │  /api/baby/recipes     │  │   /health   │
│      /extract      │  │      /recommend        │  │             │
│  src/app/routers/   │  │  src/app/routers/      │  │             │
│     extract.py      │  │      recipe.py         │  │             │
└─────────┬──────────┘  └───────────┬────────────┘  └─────────────┘
          │                         │
          │            ┌────────────┼────────────┐
          │            │            │            │
┌─────────▼──────────┐ │  ┌───────▼──────┐ ┌────▼────────┐
│  BabyRecordExtractor │ │  │ RecipeRAGService │ │ RecipeAgent   │
│  src/app/extractor.py│ │  │ src/app/recipe_  │ │ src/app/agent/│
│                     │ │  │     rag.py       │ │    react.py   │
└─────────┬───────────┘ │  └───────┬────────┘ └──────┬────────┘
          │             │          │                  │
          │             │          │   ReAct loop       │
          │             │          │   (max 5 iters)  │
          │             │          │                  │
          │             │          │      ┌─────────────▼──────────┐
          │             │          │      │ ToolExecutor           │
          │             │          │      │ src/app/agent/tools.py │
          │             │          │      └─────────────┬──────────┘
          │             │          │                    │
          │             │          │    ┌───────────────┼───────────────┐
          │             │          │    │               │               │
┌─────────▼──────────┐ ┌▼──────────▼──┐ ┌▼───────────┐ ┌▼──────────────┐
│  OllamaGateway     │ │ RuleEngine   │ │ RetrievalService│ get_recent_diet│
│  (chat/embed/health)│ │ (hard rules) │ │ (RAG retrieval) │   (mock)       │
│  services/ollama_  │ │ services/    │ │ services/       │  agent/tools.py│
│     gateway.py     │ │   rules.py   │ │  retrieval.py   │                │
└─────────┬──────────┘ └──────────────┘ └──────┬────────┘ └───────────────┘
          │                                     │
          │                            ┌────────▼────────┐
          │                            │ EmbeddingService │
          │                            │ services/        │
          │                            │  embedding.py    │
          │                            └────────┬────────┘
          │                                     │
          └─────────────────┬───────────────────┘
                            │
                    ┌─────────▼─────────┐
                    │   Ollama Server   │
                    │  localhost:11434  │
                    └─────────┬─────────┘
                              │
            ┌─────────────────┼─────────────────┐
            │                 │                 │
    ┌───────▼──────┐ ┌────────▼─────┐ ┌────────▼─────┐
    │  qwen2.5:7b  │ │ bge-m3:latest│ │  future:     │
    │  generate    │ │  embeddings  │ │  external LLM│
    └──────────────┘ └──────────────┘ └──────────────┘

数据库层 (PostgreSQL + pgvector):
┌─────────────────────────────────────────────────────────────────────┐
│ knowledge_documents / knowledge_chunks (向量检索)                    │
│ recipes / recipe_ingredients (结构化食谱)                              │
│ ai_decision_logs (决策审计日志)                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 架构要点

1. **网关层唯一化**：所有 LLM / Embedding 调用都走 `OllamaGateway`，避免在业务代码里直接依赖 `ollama.AsyncClient`。
2. **服务层无状态**：`BabyRecordExtractor`、`RecipeRAGService`、`RecipeAgent` 内部不持有数据库连接，依赖注入或运行时创建。
3. **规则引擎硬兜底**：过敏原、月龄、质地等安全规则由确定性 Python 代码执行，不交给 LLM 判断。
4. **双路径并存**：食谱推荐同时保留固定流水线 (`RecipeRAGService.recommend(use_agent=False)`) 和 ReAct Agent (`use_agent=True`)，便于 A/B 对比和回归。
5. **审计日志**：所有 AI 决策写入 `ai_decision_logs`，用于线上问题排查和后续模型优化。

---

## 2. 核心数据流

### 2.1 文本提取 `/api/baby/records/extract`

```
家长自然语言文本
    │
    ▼
提取 Prompt (src/app/prompts/extraction.py)  +  few-shot 示例
    │
    ▼
OllamaGateway.chat_sync(format=ExtractionResult.model_json_schema())
    │
    ▼
BabyRecordExtractor 校验 JSON → ExtractResponse
    │
    ▼
持久化 AiDecisionLog + 返回 JSON
```

- 使用 Pydantic schema 强制 Ollama 输出结构化 JSON。
- 如果第一次解析失败，会降低 temperature 重试一次。
- `confidence` 目前固定为 1.0（提取成功即认为可信），后续可接入置信度模型。

### 2.2 固定流水线食谱推荐 `/api/baby/recipes/recommend?use_agent=False`

```
RecipeRecommendRequest
    │
    ├─► RuleEngine.filter_by_rules() ──► 避免项 / 推荐质地
    │
    ├─► RetrievalService.retrieve() ──► top-k 知识片段
    │
    ▼
Prompt 拼装 (rules + knowledge_context)
    │
    ▼
OllamaGateway.chat_sync(format=recipe JSON schema)
    │
    ▼
解析为 RecipeRecommendResponse
    │
    ▼
持久化 AiDecisionLog + 返回 JSON
```

- 优点是可控、可预测、延迟低；缺点是 LLM 不自主决定“何时需要额外信息”。

### 2.3 ReAct Agent 食谱推荐 `/api/baby/recipes/recommend?use_agent=True`（默认）

```
RecipeRecommendRequest
    │
    ▼
RecipeAgent.recommend()
    │
    ▼
构建 system + user messages (src/app/agent/prompts.py)
    │
    ▼
循环 (max 5 次):
    │
    ├─► LLM 决定：调用工具 或 直接输出最终 JSON
    │
    ├─► 若调用工具：ToolExecutor 执行 → 结果回填 tool message → 继续循环
    │
    └─► 若直接输出：解析为 RecipeRecommendResponse → 返回
    │
    ▼
若 5 次仍未终止：注入 FORCE_ANSWER_PROMPT，强制 LLM 输出最终 JSON
```

- 工具：
  - `check_rules`：安全边界，**必须先调用**。
  - `retrieve_knowledge`：从知识库获取食谱。
  - `get_recent_diet`：近期饮食记录（当前 mock）。
- Agent 路径会额外返回 `iterations` 和 `tool_trace`，用于可观测性。

---

## 3. 模块职责与代码寿命

### 3.1 稳定层（已投产，短期内不会大改）

| 文件 | 职责 | 寿命评估 |
|------|------|----------|
| `src/app/config.py` | Pydantic-settings 集中管理环境变量 | 稳定，新增配置项即可 |
| `src/app/models.py` | Pydantic 请求/响应模型 + SQLAlchemy 表定义 | 稳定，新增业务字段即可 |
| `src/app/db.py` | 数据库会话工厂 + FastAPI dependency | 稳定 |
| `src/app/services/rules.py` | 确定性安全规则引擎 | 稳定，规则会随医学建议更新 |
| `src/app/services/embedding.py` | Embedding 服务薄封装 | 稳定 |
| `src/app/services/ollama_gateway.py` | Ollama 客户端统一网关 | 稳定，但未来会追加外部模型 fallback |
| `src/app/prompts/extraction.py` | 提取任务 system prompt + few-shot | 稳定，会持续优化 |
| `src/app/prompts/recipe.py` | 固定流水线 system prompt | 稳定，随 Agent 成熟可能弱化 |

### 3.2 演进层（当前重点，会频繁迭代）

| 文件 | 职责 | 寿命评估 |
|------|------|----------|
| `src/app/agent/react.py` | ReAct Agent 主循环 | **演进中**，迭代上限、提示词、工具顺序会持续调优 |
| `src/app/agent/tools.py` | Agent 可调用的工具定义与执行器 | **演进中**，`get_recent_diet` 当前是 mock |
| `src/app/agent/prompts.py` | Agent system prompt | **演进中**，对模型行为影响大 |
| `src/app/recipe_rag.py` | 食谱服务编排（固定 + Agent 双路径） | 演进中，Agent 成熟后可能去掉固定链路 |

### 3.3 临时 / 待替换代码（阅读时重点关注）

| 文件/位置 | 问题 | 预计替换方式 |
|-----------|------|--------------|
| `src/app/agent/tools.py` 中 `_MOCK_RECENT_DIET` | 饮食历史没有真实 DB，用内存 mock | 接入 `diet_records` 表或调用 Java 后端接口 |
| `src/app/agent/react.py` 的 `source_refs` | Agent 路径暂未把检索片段作为 source_refs 返回 | 在工具结果中携带 chunk id，最终响应回填 |
| `src/app/recipe_rag.py` 固定流水线 source_refs 的 `similarity=0.0` | 固定流水线没回填实际相似度 | 从检索结果或 pgvector 查询中补回 |
| `src/app/extractor.py` 的 `confidence=1.0` | 提取任务没有真实置信度 | 基于 schema 匹配度或多次采样计算 |
| `src/app/routers/recipe.py` / `extract.py` 中的 `except Exception` | 日志记录失败被吞掉 | 未来接入统一告警，不再静默忽略 |

---

## 4. 关键设计决策

### 4.1 为什么同时保留固定流水线和 ReAct Agent？

- **可对比**：同一组样本可以跑 `use_agent=True/False`，量化 Agent 带来的准确率/延迟变化。
- **可回滚**：Agent 路径不稳定时，接口参数可秒切回固定流水线。
- **面试/演示**：能清晰说明“从固定流水线到 Agent 的演进”。

### 4.2 为什么用 Ollama 原生 tool calling？

- 不需要手动解析 `Thought: / Action:` 文本，模型按 OpenAI function format 输出 `tool_calls`。
- 工具参数是结构化 JSON，降低解析失败率。
- 与外部 OpenAI/兼容服务切换时成本更低。

### 4.3 为什么 `RuleEngine` 是确定性的？

婴幼儿辅食涉及安全红线（蜂蜜、盐、糖、过敏原等）。LLM 可能产生幻觉，因此：

- 避免项、推荐质地、年龄限制由代码硬编码。
- LLM 只负责在约束内做“组合与解释”，不做高风险判断。

### 4.4 为什么 `RecipeAgent` 内部自己创建 `RetrievalService`？

- `RetrievalService` 依赖数据库会话 `db`。
- 为了兼容现有单例模式（`get_recipe_agent()`），Agent 在第一次需要检索时懒创建 session。
- 后续如果改为 FastAPI dependency 注入，这段逻辑会简化。

---

## 5. 常见调试路径

| 现象 | 检查点 |
|------|--------|
| 服务启动报错 | `OLLAMA_BASE_URL`、`PG_DSN` 是否可连通；`init_db()` 是否成功 |
| 推荐返回空 | 知识库是否已导入；`rag_top_k` / `rag_min_similarity` 是否过严 |
| Agent 返回 `iterations` 超过 5 | 检查 model 是否正确支持 tool calling；提示词是否明确 |
| 召回测试失败 | 看 `tests/fixtures/recipe_recommend_samples.json` 预期是否随知识库更新 |
| 延迟过高 | Agent 路径多次 LLM 调用，正常比固定链路慢 2-4 倍 |

---

## 6. 下一步演进方向（供设计参考）

1. **饮食历史真实化**：把 `get_recent_diet` 从 mock 改为查询 `diet_records` 表或调用后端接口。
2. **Agent source_refs 回填**：让最终推荐携带检索片段引用，提升可解释性。
3. **外部模型 fallback**：当 Ollama 不可用时，切到外部模型（config 中已预留字段）。
4. **置信度真实化**：提取和推荐任务都给出有业务意义的 confidence。
5. **Prompt 版本管理**：把 prompt 内容从代码里抽到配置/数据库，支持 A/B。
6. **Agent 自我评估**：让 Agent 输出对自身答案的置信度，低置信度时触发兜底策略。
