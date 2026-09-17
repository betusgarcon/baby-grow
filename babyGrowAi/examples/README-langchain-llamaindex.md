# LangChain / LlamaIndex Agent 接入示例

> 本目录演示如何用 LangChain 和 LlamaIndex 跑通一个 recipe recommendation Agent，并与当前项目的原生 ReAct Agent 进行对比。

---

## 1. 为什么接入 LangChain / LlamaIndex

当前项目自己实现了 ReAct Agent（`src/app/agent/react.py`）。接入 LangChain / LlamaIndex 的目的不是替换现有代码，而是：

1. **对比验证**：用成熟框架跑一遍，确认自定义 Agent 的行为是否合理。
2. **面试素材**：能讲出“我自己写过 Agent，也用 LangChain 做过，知道什么时候该用框架、什么时候该自研”。
3. **能力扩展**：LangChain 有丰富的 tool、memory、retrieval 组件，LlamaIndex 在 RAG 方面有更成熟的抽象。
4. **生态借力**：LangChain 的 LangSmith、LlamaIndex 的 eval 组件都可以直接复用。

---

## 2. 依赖安装

在 `babyGrowAi/pyproject.toml` 的 `[project.optional-dependencies]` 中加入：

```toml
"langchain>=0.3.0",
"langchain-community>=0.3.0",
"langchain-ollama>=0.2.0",
"llama-index>=0.12.0",
"llama-index-llms-ollama>=0.4.0",
"llama-index-embeddings-ollama>=0.5.0",
```

然后运行：

```bash
cd babyGrowAi
source .venv/bin/activate
pip install -e ".[dev]"
```

---

## 3. LangChain Agent 示例

### 3.1 工具定义

```python
# examples/langchain_agent.py
from langchain_core.tools import tool
from langchain_ollama import ChatOllama
from langchain.agents import AgentExecutor, create_tool_calling_agent
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder

from app.services.rules import RuleEngine
from app.services.retrieval import RetrievalService
from app.services.embedding import get_embedding_service
from app.db import db_session


@tool
def check_rules(baby_age_months: int, allergens: list[str] = None, texture_level: str = None) -> str:
    """检查宝宝月龄、过敏原、质地相关的硬性安全规则。"""
    engine = RuleEngine()
    result = engine.filter_by_rules(
        baby_age_months=baby_age_months,
        allergens=allergens or [],
        texture_level=texture_level,
    )
    import json
    return json.dumps(result, ensure_ascii=False)


@tool
async def retrieve_knowledge(query: str, baby_age_months: int, allergens: list[str] = None) -> str:
    """从辅食知识库检索与查询相关的食谱和指南片段。"""
    import json
    from app.models import get_engine
    from sqlalchemy.orm import Session

    with Session(bind=get_engine()) as db:
        retrieval = RetrievalService(db=db, embedding_service=get_embedding_service())
        retrieved = await retrieval.retrieve(
            query=query,
            baby_age_months=baby_age_months,
            allergens=allergens or [],
        )
        snippets = [
            {"content": r["content"][:300], "metadata": r["metadata"]}
            for r in retrieved
        ]
        return json.dumps({"snippets": snippets}, ensure_ascii=False)


@tool
def get_recent_diet(baby_id: str, days: int = 3) -> str:
    """查询宝宝近几天的饮食记录（mock）。"""
    import json
    _MOCK = {
        "baby_001": [
            {"day": "今天", "foods": ["胡萝卜泥", "米粉", "苹果泥"]},
            {"day": "昨天", "foods": ["南瓜粥", "蛋黄泥"]},
        ],
    }
    return json.dumps({"recent_diet": _MOCK.get(baby_id, [])[:days]}, ensure_ascii=False)


tools = [check_rules, retrieve_knowledge, get_recent_diet]
```

### 3.2 创建 Agent

```python
system_prompt = """你是婴幼儿辅食推荐 Agent。你可以调用工具来获取信息，并基于工具返回的结果为宝宝生成当日辅食推荐。

工作流程：
1. 先调用 check_rules 确认安全边界（月龄、过敏原、质地）
2. 调用 retrieve_knowledge 检索与家长需求相关的知识
3. 调用 get_recent_diet 了解近期已吃过的食物
4. 基于以上工具结果，生成最终推荐

安全原则：
- 过敏原、月龄适配等高风险判断必须依赖 check_rules，不要凭自己判断
- 只能推荐 retrieve_knowledge 返回的知识库中存在的食谱，不要编造

最终输出 JSON：
{
  "summary": "一句话今日推荐",
  "items": [{"mealType": "早餐/午餐/晚餐/加餐", "dishName": "菜名", "reason": "推荐理由", "ingredients": ["食材"]}],
  "avoidItems": ["需要避免的食物"],
  "reason": "整体推荐逻辑2-3句",
  "confidence": 0.0到1.0的置信度
}
"""

prompt = ChatPromptTemplate.from_messages(
    [
        ("system", system_prompt),
        ("human", "宝宝月龄：{baby_age_months}个月\n家长需求：{query}\n已知过敏原：{allergens}\n宝宝ID：{baby_id}\n请调用工具获取信息，然后给出今日辅食推荐。"),
        MessagesPlaceholder(variable_name="agent_scratchpad"),
    ]
)


async def run_langchain_agent(baby_age_months: int, query: str, allergens: list[str], baby_id: str):
    llm = ChatOllama(model="qwen2.5:7b-instruct-q5_K_M", temperature=0.1)
    agent = create_tool_calling_agent(llm, tools, prompt)
    agent_executor = AgentExecutor(agent=agent, tools=tools, verbose=True, max_iterations=5)

    result = await agent_executor.ainvoke(
        {
            "baby_age_months": baby_age_months,
            "query": query,
            "allergens": allergens,
            "baby_id": baby_id,
        }
    )
    return result


if __name__ == "__main__":
    import asyncio
    r = asyncio.run(run_langchain_agent(8, "便秘吃什么", [], "baby_001"))
    print(r["output"])
```

### 3.3 运行

```bash
cd babyGrowAi
source .venv/bin/activate
python examples/langchain_agent.py
```

---

## 4. LlamaIndex Agent 示例

### 4.1 定义 Tools

```python
# examples/llamaindex_agent.py
from llama_index.core.tools import FunctionTool
from llama_index.llms.ollama import Ollama
from llama_index.core.agent import ReActAgent
from llama_index.core import Settings

from app.services.rules import RuleEngine
from app.services.retrieval import RetrievalService
from app.services.embedding import get_embedding_service
from app.db import db_session
import json


def check_rules_tool(baby_age_months: int, allergens: list[str] = None, texture_level: str = None) -> str:
    engine = RuleEngine()
    result = engine.filter_by_rules(
        baby_age_months=baby_age_months,
        allergens=allergens or [],
        texture_level=texture_level,
    )
    return json.dumps(result, ensure_ascii=False)


def retrieve_knowledge_tool(query: str, baby_age_months: int, allergens: list[str] = None) -> str:
    from app.models import get_engine
    from sqlalchemy.orm import Session

    with Session(bind=get_engine()) as db:
        retrieval = RetrievalService(db=db, embedding_service=get_embedding_service())
        retrieved = retrieval.retrieve(
            query=query,
            baby_age_months=baby_age_months,
            allergens=allergens or [],
        )
        snippets = [
            {"content": r["content"][:300], "metadata": r["metadata"]}
            for r in retrieved
        ]
        return json.dumps({"snippets": snippets}, ensure_ascii=False)


def get_recent_diet_tool(baby_id: str, days: int = 3) -> str:
    _MOCK = {
        "baby_001": [
            {"day": "今天", "foods": ["胡萝卜泥", "米粉", "苹果泥"]},
            {"day": "昨天", "foods": ["南瓜粥", "蛋黄泥"]},
        ],
    }
    return json.dumps({"recent_diet": _MOCK.get(baby_id, [])[:days]}, ensure_ascii=False)


check_rules_fn = FunctionTool.from_defaults(
    fn=check_rules_tool,
    name="check_rules",
    description="检查宝宝月龄、过敏原、质地相关的硬性安全规则。",
)
retrieve_knowledge_fn = FunctionTool.from_defaults(
    fn=retrieve_knowledge_tool,
    name="retrieve_knowledge",
    description="从辅食知识库检索与查询相关的食谱和指南片段。",
)
get_recent_diet_fn = FunctionTool.from_defaults(
    fn=get_recent_diet_tool,
    name="get_recent_diet",
    description="查询宝宝近几天的饮食记录。",
)
```

### 4.2 创建 Agent

```python
def run_llamaindex_agent(baby_age_months: int, query: str, allergens: list[str], baby_id: str):
    Settings.llm = Ollama(model="qwen2.5:7b-instruct-q5_K_M", temperature=0.1)

    agent = ReActAgent.from_tools(
        [check_rules_fn, retrieve_knowledge_fn, get_recent_diet_fn],
        verbose=True,
        max_iterations=5,
    )

    user_prompt = f"""宝宝月龄：{baby_age_months}个月
家长需求：{query}
已知过敏原：{', '.join(allergens) if allergens else '无'}
宝宝ID：{baby_id}

请调用工具获取信息，然后给出今日辅食推荐。
最终输出 JSON 格式：
{{
  "summary": "一句话今日推荐",
  "items": [{{"mealType": "早餐/午餐/晚餐/加餐", "dishName": "菜名", "reason": "推荐理由", "ingredients": ["食材"]}}],
  "avoidItems": ["需要避免的食物"],
  "reason": "整体推荐逻辑2-3句",
  "confidence": 0.0到1.0的置信度
}}
"""

    response = agent.chat(user_prompt)
    return response


if __name__ == "__main__":
    result = run_llamaindex_agent(8, "便秘吃什么", [], "baby_001")
    print(result)
```

### 4.3 运行

```bash
cd babyGrowAi
source .venv/bin/activate
python examples/llamaindex_agent.py
```

---

## 5. 与原生 ReAct Agent 的对比

| 维度 | 原生 ReAct Agent (`src/app/agent/react.py`) | LangChain Agent | LlamaIndex Agent |
|------|-------------------------------------------|-----------------|------------------|
| **实现复杂度** | 低，代码可控 | 中，依赖框架 | 中，依赖框架 |
| **灵活性** | 高，可任意定制循环逻辑 | 中，受框架约束 | 中，受框架约束 |
| **可观测性** | 需手动实现 | LangSmith 集成好 | 自带 trace，但需配置 |
| **Tool 管理** | 手动解析 | 自动 schema 生成 | 自动 schema 生成 |
| **Memory** | 无 | 内置 memory 组件 | 内置 memory 组件 |
| **RAG 集成** | 自己实现 | 需要额外组件 | 原生强项 |
| **面试亮点** | “我自己实现了 Agent” | “我能用 LangChain 快速搭建” | “我用 LlamaIndex 做 RAG Agent” |

---

## 6. 什么时候用框架，什么时候自研

| 场景 | 建议 |
|------|------|
| 快速验证、MVP | LangChain / LlamaIndex |
| 需要严格的安全控制、迭代上限、自定义工具结果格式 | 自研 Agent |
| 需要与现有代码深度集成 | 自研 Agent 或基于框架二次封装 |
| 需要强大的 RAG 能力 | LlamaIndex |
| 需要丰富的生态组件（memory、eval） | LangChain |
| 对延迟和 token 成本敏感 | 自研 Agent，按需最小化调用 |

---

## 7. 面试表达

> “我们的 AI 服务里同时存在两套 Agent 实现：一套是我基于 Ollama 原生 function calling 自研的 ReAct Agent，严格控制工具调用顺序和安全边界；另一套我可以用 LangChain / LlamaIndex 快速复刻出来，用于快速验证和对比。这样我既理解 Agent 底层原理，也能利用成熟框架的生态能力。”

---

## 8. 下一步建议

1. 把 LangChain / LlamaIndex 跑通，记录关键指标（延迟、工具调用次数、准确率）。
2. 和原生 Agent 做同一样本的对比实验，输出对比报告。
3. 如果框架 Agent 表现更好，考虑把核心抽象封装到 `app/agent/` 下，实现可插拔。
4. 把对比结果作为 `docs/` 文档或 `examples/` 示例保存，方便面试展示。
