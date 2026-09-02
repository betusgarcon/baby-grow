# baby-grow-ai 服务

宝宝成长记录 AI 服务，基于 FastAPI + Ollama + pgvector。

## 核心能力

1. **文本智能提取**：从家长输入的自然语言中提取里程碑、食物、奶量、睡眠、情绪等结构化信息。
2. **食谱 RAG 推荐**：基于本地知识库和宝宝画像，推荐辅食/食谱。

## 环境要求

- Python 3.11+
- Ollama（建议本地 Mac 原生安装，不要用 Docker）
- PostgreSQL 16 + pgvector（可用仓库根目录 `docker-compose.yml` 启动）
- Docker（仅用于启动 MySQL/Redis/PostgreSQL）

## 快速开始

### 1. 启动基础设施

```bash
cd /Users/betus/Documents/trae_projects/baby-grow/.claude/worktrees/ecstatic-rubin-ac7c5a
pnpm db:up
```

这会启动 MySQL、Redis、PostgreSQL/pgvector。

### 2. 安装 Ollama 并拉取模型

```bash
brew install ollama
ollama pull qwen2.5:7b-instruct-q5_K_M
ollama pull bge-m3:latest  # 如失败可改用 nomic-embed-text:latest
```

建议开启性能优化环境变量：

```bash
export OLLAMA_FLASH_ATTENTION=1
export OLLAMA_KV_CACHE_TYPE=q8_0
export OLLAMA_MAX_LOADED_MODELS=2
export OLLAMA_KEEP_ALIVE=30m
```

### 3. 安装 Python 依赖

```bash
cd babyGrowAi
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
```

或直接使用根目录脚本：

```bash
cd ..
pnpm ai:setup
```

### 4. 导入知识库

```bash
cd babyGrowAi
source .venv/bin/activate
python -m app.knowledge.ingest
```

### 5. 启动服务

```bash
# 方式一：根目录脚本
cd ..
pnpm dev:ai

# 方式二：直接启动
cd babyGrowAi
source .venv/bin/activate
python -m uvicorn app.main:app --app-dir src --reload --port 8001
```

访问 http://localhost:8001/docs 查看接口文档。

## 目录结构

```
babyGrowAi/
├── src/app/
│   ├── main.py              # FastAPI 入口
│   ├── config.py            # 配置管理
│   ├── models.py            # Pydantic/SQLAlchemy 模型
│   ├── db.py                # 数据库连接
│   ├── extractor.py         # 文本提取服务
│   ├── recipe_rag.py        # 食谱 RAG 服务
│   ├── prompts/             # Prompt 模板
│   ├── services/            # Ollama 网关、Embedding、检索、规则
│   ├── routers/             # FastAPI 路由
│   └── knowledge/           # 知识库导入
├── data/
│   ├── recipes/             # 食谱 Markdown
│   └── guides/              # 指南 Markdown
├── tests/                   # 测试
└── docs/                    # 文档
```

## 接口清单

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/health` | 健康检查 |
| POST | `/api/baby/records/extract` | 文本智能提取 |
| POST | `/api/baby/recipes/recommend` | 食谱推荐 |

详细接口见 `docs/api.md`。

## 测试

```bash
cd babyGrowAi
source .venv/bin/activate
pytest tests/ -v
```

## 模型要求

| 任务 | 模型 | 大小（约） |
|------|------|------------|
| 文本提取 + 食谱生成 | `qwen2.5:7b-instruct-q5_K_M` | ~5GB |
| Embedding | `bge-m3:latest` | ~500MB |

在 64GB Mac 上，建议 AI 服务可用内存控制在 24GB 以内。Ollama 原生运行时，7B + embedding 常驻约 6GB，剩余空间给前后端服务。
