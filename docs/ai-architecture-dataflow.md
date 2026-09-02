# 宝宝成长记录 · AI 系统架构与数据流总图

> 版本：基于当前代码实现（Phase 1-5）
> 覆盖范围：微信小程序前端、Java 后端、Python AI 服务、Ollama 本地模型、PostgreSQL 知识库

---

## 一、总体系统架构

```mermaid
flowchart TB
    subgraph Frontend["前端层"]
        A[微信小程序 Taro]
        B[src/api/modules/ai.ts]
        C[src/mock/ai.ts]
        D[src/api/config.ts]
    end

    subgraph Gateway["网关/后端层"]
        E[AiProxyController<br/>Java Spring Boot]
    end

    subgraph AIService["Python AI 服务层"]
        F[app/main.py FastAPI]
        G[routers/extract.py]
        H[routers/recipe.py]
        I[extractor.py BabyRecordExtractor]
        J[recipe_rag.py RecipeRAGService]
        K[services/ollama_gateway.py]
        L[services/embedding.py]
        M[services/retrieval.py]
        N[services/rules.py]
        O[prompts/extraction.py]
        P[prompts/recipe.py]
        Q[knowledge/ingest.py]
    end

    subgraph Infra["基础设施层"]
        R[(PostgreSQL + pgvector)]
        S[(MySQL)]
        T[(Redis)]
        U[Ollama 本地模型]
        V[qwen2.5:7b]
        W[bge-m3 / nomic]
    end

    A -->|调用| B
    B -->|USE_MOCK=true| C
    B -->|USE_MOCK=false| E
    E -->|透传 HTTP| F
    F --> G
    F --> H
    G --> I
    H --> J
    I --> O
    J --> P
    I --> K
    J --> K
    J --> L
    J --> M
    J --> N
    K --> U
    L --> K
    M --> R
    Q --> R
    I --> R
    J --> R
    E -.->|预留| S
    E -.->|预留| T
    U --> V
    U --> W

    style Frontend fill:#e1f5fe
    style Gateway fill:#fff3e0
    style AIService fill:#e8f5e9
    style Infra fill:#fce4ec
```

### 架构说明

| 层级 | 组件 | 职责 |
|------|------|------|
| 前端层 | 微信小程序 + `ai.ts` + `mock/ai.ts` | 发起 AI 请求，支持 mock 调试 |
| 后端层 | `AiProxyController` | 透传前端请求到 Python AI 服务，隐藏 AI 细节 |
| AI 服务层 | FastAPI + routers + services | 文本提取、食谱推荐、知识库管理 |
| 基础设施层 | Ollama、PostgreSQL/pgvector、MySQL、Redis | 模型推理、向量检索、业务数据、缓存 |

---

## 二、文本智能提取模块数据流

### 2.1 时序图

```mermaid
sequenceDiagram
    autonumber
    participant Mini as 微信小程序
    participant Java as AiProxyController
    participant Py as FastAPI /api/baby/records/extract
    participant Ext as BabyRecordExtractor
    participant Prompt as prompts/extraction.py
    participant OG as OllamaGateway
    participant Ollama as Ollama qwen2.5:7b
    participant PG as PostgreSQL

    Mini->>Java: POST /api/baby/records/extract
    Note over Mini,Java: {baby_id, baby_age_months, text}
    Java->>Py: 透传请求
    Py->>Py: Pydantic 校验 ExtractRequest
    Py->>Ext: extract(text, baby_age_months)
    Ext->>Prompt: build_messages(text, age)
    Prompt-->>Ext: system prompt + few-shot + user input
    Ext->>OG: chat_sync(format=ExtractionResult.schema)
    OG->>OG: 第 1 次调用
    alt 调用失败
        OG->>OG: 等待 0.5s 后重试
    end
    OG->>Ollama: POST /api/chat
    Ollama-->>OG: {message: {content: JSON}}
    OG-->>Ext: raw response
    Ext->>Ext: ExtractionResult.model_validate_json()
    alt JSON 解析失败
        Ext->>OG: 降低 temperature 重试
        OG->>Ollama: POST /api/chat
        Ollama-->>OG: 新响应
    end
    Ext-->>Py: ExtractResponse
    Py->>PG: INSERT ai_decision_logs
    Py-->>Java: ExtractResponse
    Java-->>Mini: 推荐结果 / 错误
```

### 2.2 类调用链

```mermaid
flowchart LR
    A[routers/extract.py<br/>extract_text] -->|调用| B[extractor.py<br/>BabyRecordExtractor]
    B -->|组装消息| C[prompts/extraction.py<br/>build_messages]
    B -->|调用| D[services/ollama_gateway.py<br/>OllamaGateway]
    D -->|HTTP| E[Ollama /api/chat]
    B -->|验证| F[models.py<br/>ExtractionResult]
    A -->|写日志| G[PostgreSQL<br/>ai_decision_logs]
```

### 2.3 数据流转说明

1. 前端发送 `{baby_id, baby_age_months, text}`。
2. `AiProxyController` 透传到 Python AI 服务。
3. `ExtractRequest` 校验后交给 `BabyRecordExtractor`。
4. `build_messages()` 拼接 system prompt + few-shot 示例 + 真实输入。
5. `OllamaGateway.chat_sync()` 调用 Ollama，强制 `format=ExtractionResult.schema`。
6. 返回 JSON 被 Pydantic 校验为 `ExtractionResult`。
7. 解析失败时自动重试 1 次（降低 temperature）。
8. 最终写入 `ai_decision_logs`，返回 `ExtractResponse`。

---

## 三、食谱 RAG 推荐模块数据流

### 3.1 时序图

```mermaid
sequenceDiagram
    autonumber
    participant Mini as 微信小程序
    participant Java as AiProxyController
    participant Py as FastAPI /api/baby/recipes/recommend
    participant RAG as RecipeRAGService
    participant Rules as RuleEngine
    participant Ret as RetrievalService
    participant Emb as EmbeddingService
    participant OG as OllamaGateway
    participant Ollama as Ollama qwen2.5:7b
    participant Prompt as prompts/recipe.py
    participant PG as PostgreSQL + pgvector

    Mini->>Java: POST /api/baby/recipes/recommend
    Note over Mini,Java: {baby_id, age, query, allergens, texture_level}
    Java->>Py: 透传请求
    Py->>Py: Pydantic 校验 RecipeRecommendRequest
    Py->>RAG: recommend(request)
    RAG->>Rules: filter_by_rules(age, allergens, texture)
    Rules-->>RAG: 推荐质地 + 禁忌食材 + 提示
    RAG->>Ret: retrieve(query, age, allergens, texture)
    Ret->>Emb: embed(query)
    Emb->>OG: embeddings(model=bge-m3)
    OG->>Ollama: POST /api/embeddings
    Ollama-->>OG: vector
    OG-->>Emb: vector
    Emb-->>Ret: query vector
    Ret->>PG: SELECT ... ORDER BY embedding.cosine_distance
    PG-->>Ret: Top-K chunks
    Ret->>Ret: 月龄/质地过滤 + 过敏原排除
    Ret-->>RAG: 精选知识片段
    RAG->>Prompt: build_recipe_prompt(...)
    Prompt-->>RAG: 完整 prompt
    RAG->>OG: chat_sync(format=严格 JSON schema)
    Note over RAG,OG: 限制 items 1-3 条、字段必填、禁止额外字段
    OG->>Ollama: POST /api/chat
    Ollama-->>OG: 推荐 JSON
    OG-->>RAG: raw response
    RAG->>RAG: JSON 解析 + RecipeItem 组装
    RAG-->>Py: RecipeRecommendResponse
    Py->>PG: INSERT ai_decision_logs
    Py-->>Java: RecipeRecommendResponse
    Java-->>Mini: 推荐结果
```

### 3.2 类调用链

```mermaid
flowchart LR
    A[routers/recipe.py<br/>recommend_recipes] -->|调用| B[recipe_rag.py<br/>RecipeRAGService]
    B -->|规则层| C[services/rules.py<br/>RuleEngine]
    B -->|检索层| D[services/retrieval.py<br/>RetrievalService]
    D -->|embed| E[services/embedding.py<br/>EmbeddingService]
    E -->|调用| F[services/ollama_gateway.py<br/>OllamaGateway]
    D -->|向量检索| G[PostgreSQL + pgvector]
    B -->|生成 prompt| H[prompts/recipe.py<br/>build_recipe_prompt]
    B -->|调用| F
    F -->|推理| I[Ollama qwen2.5:7b]
    A -->|写日志| G
```

### 3.3 三层决策链路

```mermaid
flowchart TB
    subgraph Input["输入"]
        A[宝宝画像<br/>月龄/过敏/质地/偏好]
        B[家长查询<br/>今天吃什么/便秘吃什么]
    end

    subgraph Layer1["第一层：硬规则"]
        C[RuleEngine]
        C1[月龄边界]
        C2[过敏原排除]
        C3[质地等级]
        C4[安全禁忌]
    end

    subgraph Layer2["第二层：知识检索"]
        D[RetrievalService]
        D1[Embedding 向量化]
        D2[pgvector 向量召回]
        D3[结构化过滤]
        D4[过敏原二次排除]
    end

    subgraph Layer3["第三层：AI 生成"]
        E[RecipeRAGService]
        E1[Prompt 拼装]
        E2[Ollama 7B 生成]
        E3[严格 JSON schema 校验]
    end

    subgraph Output["输出"]
        F[推荐菜品 + 原因 + 忌口 + source_refs]
    end

    A & B --> C
    C --> C1 & C2 & C3 & C4
    C --> D
    D --> D1 --> D2 --> D3 --> D4
    D --> E
    E --> E1 --> E2 --> E3
    E --> F
```

---

## 四、知识库构建数据流

### 4.1 时序图

```mermaid
sequenceDiagram
    autonumber
    participant User as 开发者
    participant Ingest as app/knowledge/ingest.py
    participant Parser as Markdown 解析器
    participant Emb as EmbeddingService
    participant OG as OllamaGateway
    participant Ollama as Ollama bge-m3
    participant PG as PostgreSQL

    User->>Ingest: python -m app.knowledge.ingest
    Ingest->>Ingest: 遍历 data/recipes/*.md
    Ingest->>Parser: _parse_recipe_markdown(path)
    Parser-->>Ingest: 标题/月龄/食材/做法/营养
    Ingest->>PG: INSERT knowledge_documents
    Ingest->>PG: INSERT recipes
    Ingest->>PG: INSERT recipe_ingredients
    Ingest->>Ingest: 生成 chunk 文本
    Ingest->>Emb: embed(chunk_text)
    Emb->>OG: embeddings()
    OG->>Ollama: POST /api/embeddings
    Ollama-->>OG: vector
    OG-->>Emb: vector
    Emb-->>Ingest: vector
    Ingest->>PG: INSERT knowledge_chunks(embedding)
    Ingest->>Ingest: 遍历 data/guides/*.md
    Ingest->>PG: INSERT knowledge_documents
    Ingest->>Emb: embed(section)
    Ingest->>PG: INSERT knowledge_chunks
```

### 4.2 调用链

```mermaid
flowchart LR
    A[app/knowledge/ingest.py<br/>ingest_all] --> B[Markdown 解析]
    B --> C[KnowledgeDocument]
    B --> D[Recipe + RecipeIngredient]
    A --> E[EmbeddingService]
    E --> F[OllamaGateway]
    F --> G[Ollama /api/embeddings]
    A --> H[KnowledgeChunk]
    C & D & H --> I[PostgreSQL]
```

---

## 五、服务启动与初始化时序

```mermaid
sequenceDiagram
    autonumber
    participant User as 开发者
    participant Uvicorn as uvicorn
    participant Main as app/main.py
    participant Config as Settings
    participant DB as init_db()
    participant PG as PostgreSQL
    participant OG as OllamaGateway
    participant Ollama as Ollama

    User->>Uvicorn: pnpm dev:ai
    Uvicorn->>Main: import app
    Main->>Config: 读取 .env / .env.example
    Main->>Main: include_router(extract.router)
    Main->>Main: include_router(recipe.router)
    Main->>DB: startup_event()
    DB->>PG: CREATE EXTENSION IF NOT EXISTS vector
    DB->>PG: CREATE TABLE IF NOT EXISTS ...
    DB-->>Main: 数据库就绪
    Main->>OG: health()
    OG->>Ollama: GET /api/tags
    Ollama-->>OG: 200 OK
    OG-->>Main: Ollama 可达
    Main-->>Uvicorn: Application startup complete
    Uvicorn->>User: 监听 http://localhost:8001
```

---

## 六、前端调用链路

```mermaid
sequenceDiagram
    autonumber
    participant Page as 小程序页面
    participant AI as src/api/modules/ai.ts
    participant Config as src/api/config.ts
    participant Mock as src/mock/ai.ts
    participant Java as AiProxyController

    Page->>AI: extractRecordText(params)
    AI->>Config: 读取 USE_MOCK / BASE_URL
    alt USE_MOCK = true
        Config->>Mock: 返回 mock 数据
        Mock-->>Page: ExtractRecordResponse
    else USE_MOCK = false
        AI->>Java: POST /api/baby/records/extract
        Java-->>Page: 真实响应
    end
```

---

## 七、核心模块/类职责对照表

| 模块/类 | 路径 | 输入 | 输出 | 核心职责 |
|---------|------|------|------|----------|
| `AiProxyController` | `babyGrowBackend/.../controller` | 前端 JSON | AI 响应 | 透传、屏蔽 AI 细节 |
| `ai.ts` | `babyGrowFrontend/src/api/modules/ai.ts` | 页面参数 | Promise<响应> | 前端 AI API 封装 |
| `app/main.py` | `babyGrowAi/src/app/main.py` | HTTP 请求 | HTTP 响应 | FastAPI 入口、路由注册、启动事件 |
| `Settings` | `babyGrowAi/src/app/config.py` | `.env` | 配置对象 | 统一管理环境变量 |
| `BabyRecordExtractor` | `babyGrowAi/src/app/extractor.py` | text + age | `ExtractResponse` | 文本提取业务逻辑 |
| `RecipeRAGService` | `babyGrowAi/src/app/recipe_rag.py` | request | `RecipeRecommendResponse` | 推荐业务编排 |
| `OllamaGateway` | `babyGrowAi/src/app/services/ollama_gateway.py` | messages/schema | LLM 响应 | 模型调用 + 重试 + 流式 |
| `EmbeddingService` | `babyGrowAi/src/app/services/embedding.py` | text | vector | 生成文本向量 |
| `RetrievalService` | `babyGrowAi/src/app/services/retrieval.py` | query + 画像 | chunks | 混合检索 |
| `RuleEngine` | `babyGrowAi/src/app/services/rules.py` | age + 过敏 | rules | 硬规则过滤 |
| `ingest.py` | `babyGrowAi/src/app/knowledge/ingest.py` | Markdown | DB rows | 知识库入库 |
| `models.py` | `babyGrowAi/src/app/models.py` | - | Pydantic/SQLAlchemy | 数据结构 + ORM |
| `prompts/extraction.py` | `babyGrowAi/src/app/prompts/extraction.py` | text + age | messages | 提取 prompt |
| `prompts/recipe.py` | `babyGrowAi/src/app/prompts/recipe.py` | 画像 + context | messages | 推荐 prompt |

---

## 八、数据持久化关系

```mermaid
erDiagram
    KNOWLEDGE_DOCUMENTS ||--o{ KNOWLEDGE_CHUNKS : contains
    RECIPES ||--o{ RECIPE_INGREDIENTS : contains
    KNOWLEDGE_CHUNKS {
        int id
        int document_id
        int chunk_no
        text content
        jsonb chunk_metadata
        vector embedding_1024
    }
    KNOWLEDGE_DOCUMENTS {
        int id
        string doc_type
        string title
        string source
        text content
    }
    RECIPES {
        int id
        string recipe_name
        int age_min_month
        int age_max_month
        string texture_level
        text ingredient_summary
        text instructions
    }
    RECIPE_INGREDIENTS {
        int id
        int recipe_id
        string ingredient_name
        int is_allergen
    }
    AI_DECISION_LOGS {
        int id
        string biz_type
        string biz_id
        string model_name
        text input_summary
        jsonb raw_response_json
        int elapsed_ms
    }
```

---

## 九、当前边界与未实现部分

| 层级 | 已实现 | 未实现（后续扩展） |
|------|--------|-------------------|
| 前端 | ai.ts API 模块、mock | 真实页面接入 |
| Java 后端 | 透传 Controller | 业务状态机、用户鉴权、MySQL 实体 |
| Python AI | 提取 + RAG + 知识库入库 | 图片/视频理解、月度总结、外部模型兜底、异步队列 |
| 数据库 | PostgreSQL 知识库/日志 | MySQL 业务表联动 |
| Ollama | qwen2.5:7b + bge-m3 接口 | 需用户本地拉取模型 |
| 部署 | Docker Compose 基础服务 + AI 服务 Dockerfile | 一键 make 脚本、CI/CD 流水线 |

---

> 本文档基于当前代码生成，后续随着 Phase 6+ 的演进（图片理解、月度总结、外部模型兜底、异步队列）会持续更新。
