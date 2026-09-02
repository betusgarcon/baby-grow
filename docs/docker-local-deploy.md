# 本地全 Docker 部署指南

> 目标：把 `babyGrowBackend`（Java）和 `babyGrowAi`（Python）都纳入 Docker Compose，与 MySQL、Redis、PostgreSQL 一起一键启动。

## 前置依赖

1. **Docker + Docker Compose** 已安装并运行。
2. **Ollama 在宿主机运行**（模型文件大、需要 Metal/GPU 加速，不建议放 Docker 内）。
3. 已拉取所需模型：
   - `qwen2.5:7b-instruct-q5_K_M`
   - `bge-m3:latest`（或 `nomic-embed-text:latest`）

---

## 一、启动 Ollama（宿主机）

### 1.1 安装 Ollama

```bash
brew install ollama
```

或从官网下载桌面版：https://ollama.com/download

### 1.2 配置环境变量（推荐）

将以下内容加入 `~/.zshrc` 或 `~/.bashrc`：

```bash
export OLLAMA_FLASH_ATTENTION=1
export OLLAMA_KV_CACHE_TYPE=q8_0
export OLLAMA_MAX_LOADED_MODELS=2
export OLLAMA_KEEP_ALIVE=30m
```

然后执行：

```bash
source ~/.zshrc
```

### 1.3 启动 Ollama 服务

方式一：桌面版直接运行 App。

方式二：命令行启动：

```bash
ollama serve
```

默认监听：`http://localhost:11434`

### 1.4 拉取模型

```bash
# 主模型：文本提取 + 食谱推荐
ollama pull qwen2.5:7b-instruct-q5_K_M

# Embedding 模型
ollama pull bge-m3:latest
# 如 bge-m3 拉取失败，可换：ollama pull nomic-embed-text:latest
```

### 1.5 验证 Ollama 和模型

```bash
# 查看 Ollama 是否运行
curl http://localhost:11434/api/tags

# 查看已安装模型
ollama list
```

---

## 二、Docker 全栈启动

### 2.1 启动所有服务

```bash
# 仓库根目录
pnpm docker:up
```

等价于：

```bash
docker compose up -d --build
```

启动的服务包括：

| 服务 | 端口 | 说明 |
|------|------|------|
| MySQL | 3306 | 业务数据 |
| Redis | 6379 | 缓存/会话 |
| PostgreSQL/pgvector | 5432 | AI 知识库 |
| ai-service | 8001 | Python AI 服务 |
| backend | 8080 | Java 后端服务 |

### 2.2 只启动数据库

```bash
pnpm db:up
```

### 2.3 查看服务状态

```bash
docker compose ps
```

### 2.4 查看日志

```bash
# 全部服务
pnpm docker:logs

# 只看数据库
pnpm db:logs

# 只看 AI 服务
docker compose logs -f ai-service
```

### 2.5 停止服务

```bash
pnpm docker:down
```

---

## 三、导入知识库

首次启动后，需要将食谱/指南数据导入 PostgreSQL 并生成向量：

```bash
# 方式一：直接在运行中的 ai-service 容器内执行
docker exec -it baby-grow-ai-service python -m app.knowledge.ingest

# 方式二：在宿主机执行（需要 .env 中 PG_DSN 指向 localhost:5432）
cd babyGrowAi
source .venv/bin/activate
python -m app.knowledge.ingest
```

导入成功后会看到类似日志：

```
INFO:__main__:Ingested recipe: 胡萝卜泥
INFO:__main__:Ingested recipe: 南瓜米粉糊
...
INFO:__main__:Ingested guide: 辅食添加基础指南
```

---

## 四、验证服务

### 4.1 健康检查

```bash
# Java 后端
curl http://localhost:8080/health

# Python AI 服务
curl http://localhost:8001/health
```

### 4.2 测试文本提取

```bash
curl -X POST http://localhost:8080/api/baby/records/extract \
  -H "Content-Type: application/json" \
  -d '{
    "baby_id": "test",
    "baby_age_months": 10,
    "text": "今天宝宝第一次自己站起来了，吃了南瓜泥"
  }'
```

### 4.3 测试食谱推荐

```bash
curl -X POST http://localhost:8080/api/baby/recipes/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "baby_id": "test",
    "baby_age_months": 9,
    "query": "中午吃什么",
    "allergens": ["鸡蛋"]
  }'
```

---

## 五、Ollama 使用详解

### 5.1 AI 服务如何连接 Ollama

AI 服务通过环境变量 `OLLAMA_BASE_URL` 连接 Ollama：

```yaml
# docker-compose.yml 中
environment:
  OLLAMA_BASE_URL: http://host.docker.internal:11434
```

在容器内，`host.docker.internal` 会解析到宿主机。

### 5.2 模型使用场景

| 模型 | 作用 | 调用位置 |
|------|------|----------|
| `qwen2.5:7b-instruct-q5_K_M` | 文本提取、食谱推荐生成 | `services/ollama_gateway.py` -> `/api/chat` |
| `bge-m3:latest` | 文本向量化，用于 RAG 检索 | `services/embedding.py` -> `/api/embeddings` |

### 5.3 在容器中验证 Ollama 可达

```bash
docker exec -it baby-grow-ai-service python -c "
import httpx
resp = httpx.get('http://host.docker.internal:11434/api/tags')
print(resp.json())
"
```

### 5.4 更换模型

如果想换模型，修改 `docker-compose.yml`：

```yaml
environment:
  OLLAMA_MODEL: qwen2.5:7b-instruct-q5_K_M
  EMBEDDING_MODEL: bge-m3:latest
```

然后重启 ai-service：

```bash
docker compose up -d --build ai-service
```

### 5.5 自定义模型参数

可以创建自定义 Modelfile，例如 `babyGrowAi/baby-extractor.Modelfile`：

```
FROM qwen2.5:7b-instruct-q5_K_M
PARAMETER num_ctx 1024
PARAMETER temperature 0.1
PARAMETER top_p 0.8
SYSTEM """
你是宝宝成长记录信息提取助手。从家长描述中提取里程碑、食物、奶量信息。
只输出JSON，不要解释。输出最精简的JSON，不要包含空字段。
"""
```

创建模型：

```bash
ollama create baby-extractor -f baby-extractor.Modelfile
```

然后修改 `docker-compose.yml`：

```yaml
environment:
  OLLAMA_MODEL: baby-extractor
```

---

## 六、目录结构与文件说明

| 文件/目录 | 说明 |
|-----------|------|
| `babyGrowBackend/Dockerfile` | Java 后端镜像构建文件 |
| `babyGrowBackend/.dockerignore` | Java 后端 Docker 构建忽略文件 |
| `babyGrowAi/Dockerfile` | Python AI 服务镜像构建文件 |
| `babyGrowAi/.dockerignore` | Python AI 服务 Docker 构建忽略文件 |
| `docker-compose.yml` | 本地全栈服务编排 |
| `docker/init-postgres/01-enable-vector.sql` | PostgreSQL 初始化脚本，启用 pgvector |

---

## 七、常见问题

### Q1：AI 服务启动失败，提示 Ollama 不可达

检查 Ollama 是否在宿主机运行：

```bash
curl http://localhost:11434/api/tags
```

如果 Ollama 运行正常但容器内不可达，可能是 `host.docker.internal` 解析问题。在 Linux 上需要确保 Docker 版本 >= 19.03，并添加：

```yaml
extra_hosts:
  - "host.docker.internal:host-gateway"
```

`docker-compose.yml` 中已包含此配置。

### Q2：模型拉取失败

如果 `ollama pull` 失败，可以检查网络或换用其他镜像源。Ollama 模型默认从 `registry.ollama.ai` 拉取，国内可能需要代理。

### Q3：AI 服务启动后知识库为空

需要手动执行知识库导入：

```bash
docker exec -it baby-grow-ai-service python -m app.knowledge.ingest
```

### Q4：如何重新构建某个服务

```bash
# 重新构建并启动 Java 后端
docker compose up -d --build backend

# 重新构建并启动 AI 服务
docker compose up -d --build ai-service
```

### Q5：Docker Hub 镜像拉取慢/失败

如果 `python:3.11-slim`、`eclipse-temurin:17-jdk` 等基础镜像拉取失败，可以配置 Docker 镜像加速器，或修改 Dockerfile 使用镜像源：

```dockerfile
# Python AI 服务
FROM docker.m.daocloud.io/library/python:3.11-slim AS builder
FROM docker.m.daocloud.io/library/python:3.11-slim
```

```dockerfile
# Java 后端
FROM docker.m.daocloud.io/library/maven:3.9-eclipse-temurin-17 AS builder
FROM docker.m.daocloud.io/library/eclipse-temurin:17-jdk
```

---

## 八、推荐工作流

首次部署：

```bash
# 1. 启动 Ollama（宿主机）
ollama serve

# 2. 拉取模型
ollama pull qwen2.5:7b-instruct-q5_K_M
ollama pull bge-m3:latest

# 3. 启动全栈服务
pnpm docker:up

# 4. 导入知识库（首次）
docker exec -it baby-grow-ai-service python -m app.knowledge.ingest

# 5. 验证
curl http://localhost:8080/health
curl http://localhost:8001/health
```

日常开发：

```bash
pnpm docker:up     # 启动
pnpm docker:down   # 停止
```

---

> 本文件会随着项目演进持续更新。如有疑问，可查看 `babyGrowAi/README.md` 和 `babyGrowAi/docs/ollama-setup.md`。
