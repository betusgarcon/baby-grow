# AI 服务企业级升级路线图

> 本文从 **需求、技能、实践** 三个维度，把当前 AI 模块从“玩具级”推进到“生产级/企业级”，并说明如何对应 Agent 岗位的面试。

---

## 1. 需求维度：企业级 AI 长什么样

玩具级项目只关心 **“能跑通”**，企业级必须关心以下 6 点：

| 维度 | 玩具级现状 | 企业级要求 |
|------|-----------|-----------|
| **可靠性（Reliability）** | 偶尔 JSON 解析失败、LLM 输出不可控 | 失败率 < 1%，有降级策略，输出 schema 稳定 |
| **可观测性（Observability）** | 只打印日志 | 每次 AI 调用都有 trace、latency、token、输入输出、tool trace、版本号 |
| **可评估性（Evaluability）** | 只有几个样本测试 | 有离线回归套件、在线 A/B、人工标注反馈闭环 |
| **安全性（Safety）** | 规则硬编码 | 规则 + LLM 护栏 + 内容审核 + 权限控制 + 审计 |
| **可扩展性（Scalability）** | 单进程、Ollama 本机 | 能水平扩容、异步队列、模型路由、缓存 |
| **可解释性（Explainability）** | 只有推荐结果 | 有引用来源、推理步骤、置信度、决策日志 |

对应到当前项目，最优先补齐的 3 件事：

1. **把“推荐结果”变得可审计、可解释**：来源引用、tool trace、决策日志。
2. **把“偶尔失败”变成“可控失败”**：schema 校验、重试、降级、人工兜底。
3. **把“感觉好用”变成“能量化”**：离线 eval 数据集、在线指标看板。

---

## 2. 技能维度：面试 Agent 岗位需要补什么

Agent 岗位（LLM Engineer / AI Agent Engineer / Applied AI Engineer）面试通常考 4 层能力：

### 2.1 Agent 架构设计能力

需要能讲清楚：

- **ReAct / Tool Use / Function Calling 的区别**
  - ReAct：Thought → Action → Observation 循环
  - Tool Use / Function Calling：模型直接输出结构化工具调用
  - 当前项目用的是 Ollama native tool calling，这本身就是一个亮点

- **多 Agent vs 单 Agent**
  - 当前是单 Agent 多工具（check_rules / retrieve / diet）
  - 企业级会拆成：规划 Agent、检索 Agent、安全 Agent、总结 Agent，或用 Supervisor 调度

- **Memory 设计**
  - 当前没有持久化 memory
  - 企业级需要：短期 conversation memory + 长期用户 profile memory + 向量 memory

### 2.2 大模型工程能力

- **Prompt 工程**：system prompt 版本管理、动态 prompt 组装、prompt 压缩
- **结构化输出**：JSON schema 约束、function schema 设计、失败后的 repair 策略
- **模型路由**：小模型做简单任务、大模型做复杂任务、外部模型 fallback
- **Token / 成本优化**：缓存、截断、embedding 预处理、模型量化

### 2.3 评估与数据飞轮

- **离线评估**：准确率、召回率、幻觉率、安全性
- **在线评估**：用户反馈（点赞/踩）、AB 测试、业务指标（转化率、留存）
- **数据飞轮**：bad case → 标注 → 微调 / prompt 优化 → 重新评估

### 2.4 工程化与基建

- **异步队列**：Celery / RQ / 消息队列处理耗时 LLM 调用
- **缓存**：Redis 缓存 embedding、prompt 结果
- **监控**：LangSmith / Langfuse / 自研 tracing
- **部署**：Docker、K8s、模型服务独立部署、负载均衡

---

## 3. 实践维度：当前项目可以具体做哪些升级

下面按优先级列出可以直接落地的升级点，做完后简历和面试都能打。

### 3.1 立即做：输出更可靠

#### ① 强制 schema + structured output

当前 `recipe_rag.py` 里手写 JSON schema，建议改为：

```python
from pydantic import BaseModel, Field

class RecipeRecommendOutput(BaseModel):
    summary: str
    items: list[RecipeItem]
    avoid_items: list[str]
    reason: str
    confidence: float = Field(..., ge=0.0, le=1.0)
```

然后：

```python
response = await gateway.chat_sync(messages, format=RecipeRecommendOutput)
```

这样 Ollama 会用 JSON mode 约束输出，解析失败率更低。

#### ② 输出修复策略（Output Repair）

当 LLM 输出不合法 JSON 时，自动做一次 repair：

```python
async def repair_json(gateway, broken_text, schema):
    messages = [
        {"role": "system", "content": "Fix the following JSON to match this schema..."},
        {"role": "user", "content": broken_text},
    ]
    return await gateway.chat_sync(messages, format=schema)
```

面试点：**“我们不做简单重试，而是做 schema-aware repair，失败率从 X% 降到 Y%”**。

---

### 3.2 短期做：可观测性

#### ③ 接入 Langfuse / LangSmith

每个 LLM 调用都要记录：

- input / output
- model name / version
- latency / token usage
- tool trace
- user feedback

当前项目已经有 `AiDecisionLog`，建议把它升级为 **OpenTelemetry trace + 自研决策日志表** 双轨。

#### ④ 把 `iterations` / `tool_trace` 可视化

当前 Agent 已经返回了 `iterations` 和 `tool_trace`，但只在日志里。可以：

- 在 response 里暴露
- 在后台管理页展示“Agent 思考路径”
- 记录每个 tool 的调用耗时

---

### 3.3 中期做：安全与护栏

#### ⑤ 三层安全体系

当前只有 `RuleEngine`，企业级需要：

| 层级 | 作用 | 当前状态 |
|------|------|---------|
| **输入层** | 敏感词过滤、用户输入校验 | 有 Pydantic 校验 |
| **规则层** | 年龄、过敏原、医嘱禁忌 | `RuleEngine` ✅ |
| **输出层** | LLM 幻觉检测、内容审核、免责声明 | ❌ 缺失 |

建议加一个 `SafetyGuard`：

```python
class SafetyGuard:
    def check_output(self, response: RecipeRecommendResponse):
        # 1. 检查推荐菜品是否包含过敏原
        # 2. 检查 confidence 是否合理
        # 3. 检查是否有违禁内容
        pass
```

#### ⑥ 来源引用（Citation）

当前固定流水线 `source_refs` 的 `similarity=0.0`，Agent 路径甚至没填。企业级必须做：

- 每个推荐菜品关联到知识库 chunk
- 展示“这道菜来自哪篇指南/食谱”
- 如果知识库没命中，明确告知用户“基于通用建议”

---

### 3.4 长期做：智能与规模化

#### ⑦ 真正的饮食历史接入

当前 `get_recent_diet` 是 mock。生产环境要：

- 查询 `diet_records` 表
- 或调用 Java 后端 `/api/v1/baby/{id}/diet/recent`
- 做食材去重、营养均衡、过敏追踪

#### ⑧ Memory 系统

```text
短期记忆：当前对话上下文
长期记忆：宝宝月龄变化、过敏史、喜好演化
向量记忆：之前问过的问题和推荐
```

实现：

- 用 Redis 存短期对话
- 用 PG 表存长期 profile
- 用向量库存历史 query

#### ⑨ 多模型路由

配置不同任务用不同模型：

| 任务 | 模型 | 原因 |
|------|------|------|
| 提取 | qwen2.5 7B | 够快够准 |
| 推荐固定链路 | qwen2.5 7B | 结构化输出 |
| Agent 复杂推理 | qwen2.5 14B / GPT-4 | 需要强指令遵循 |
| Embedding | bge-m3 | 中文语义 |

#### ⑩ 异步化与缓存

把 `/api/baby/recipes/recommend` 改为：

- **同步快速路径**：命中缓存直接返回
- **异步慢路径**：LLM 调用走 Celery + Redis，前端轮询结果

```python
@router.post("/recommend")
async def recommend_recipes(data: RecipeRecommendRequest):
    # 1. check cache
    # 2. if miss, enqueue background job
    # 3. return job_id or wait with timeout
```

---

## 4. 面试角度：怎么讲这个项目

如果你要去面 Agent 岗位，不要只讲“我加了一个 ReAct Agent”。要讲清楚以下 5 点：

### 4.1 问题定义

> “婴幼儿辅食推荐有严格的安全约束（月龄、过敏原），不能把决策完全交给 LLM。我设计了一个 ReAct Agent，让 LLM 负责编排，但把安全判断留给确定性规则。”

### 4.2 架构选型

> “我用 Ollama 原生 function calling 实现 Agent，比纯 prompt 解析的 ReAct 更稳定。工具层有 3 个：check_rules（安全）、retrieve_knowledge（RAG）、get_recent_diet（个性化）。最大迭代次数 5 次，超时强制生成最终答案。”

### 4.3 关键挑战与解法

| 挑战 | 解法 |
|------|------|
| LLM 输出不稳定 | JSON schema + output repair |
| Agent 可能无限循环 | max_iterations + force answer prompt |
| 安全红线不能交给 LLM | RuleEngine 硬规则前置 |
| 来源不可解释 | source_refs + tool_trace |
| 评估困难 | 离线回归套件 + 阈值 75%/80% |

### 4.4 量化成果

即使没有真实用户，也要有指标：

- “离线 retrieval 回归准确率 80%+”
- “Agent 回归准确率 75%+”
- “schema 解析失败率 < 5%”
- “平均 latency：固定链路 X ms，Agent 链路 Y ms”

### 4.5 下一步规划

> “目前饮食历史是 mock，下一步会接入真实 DB 和 Java 后端接口；另外会接入 Langfuse 做全链路 tracing，并引入多模型路由和缓存。”

---

## 5. 落地路线图

如果你只有业余时间，建议按这个顺序推进：

| 阶段 | 目标 | 周期 |
|------|------|------|
| **第 1 阶段** | 补全 schema、repair、source_refs、tracing | 1-2 周 |
| **第 2 阶段** | 接入真实 diet_records、SafetyGuard、缓存 | 2-3 周 |
| **第 3 阶段** | 多模型路由、异步队列、A/B 测试框架 | 3-4 周 |
| **第 4 阶段** | 用户反馈闭环、数据飞轮、微调 | 1-2 个月 |

---

## 6. 一句话总结

**企业级 AI = 可靠的输出 + 完整的观测 + 严格的安全 + 持续的评估 + 可扩展的架构。** 当前项目已经完成了“功能演示”，下一步是把每个失败点和不确定点都变成“可观测、可降级、可迭代”的工程能力。这样既能支撑真实业务，也能在面试时把每个技术决策讲出深度。
