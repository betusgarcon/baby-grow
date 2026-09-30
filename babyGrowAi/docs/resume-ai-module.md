# AI 模块简历描述

## 项目背景

宝宝成长 AI 服务是一个面向婴幼儿辅食/营养场景的推荐系统，基于本地 Ollama 大模型构建，后续逐步接入外部模型，支持 recipes 推荐、营养知识检索、信息抽取等能力。

## 我的职责

负责 AI 服务核心链路的设计与实现，重点完成生产级模型网关的架构升级，提升系统可用性、可扩展性与可观测性。

## 技术亮点

### 1. 生产级模型网关

- 设计并实现统一 `ModelGatewayRouter`，抽象 Ollama、OpenAI 等模型 provider。
- 支持任务级路由、指数退避重试、多 provider 降级、熔断、限流。
- 统一 `ModelRequest/ModelResponse` 数据结构，业务代码与具体 SDK 解耦。
- 向后兼容旧 `OllamaGateway` API，业务代码无感知迁移。

### 2. 成本与可观测

- 实现 `CostTracker`，按 provider/model 核算 input/output token 成本，每次调用写入 `LlmCallLog`。
- 接入 OpenTelemetry，输出 `model_gateway.router.chat` span 与 `llm_request_total`、`llm_latency_ms`、`llm_cost_usd`、`llm_fallback_total` 等指标。

### 3. RAG 与 Agent

- 参与 BM25 + 向量 + RRF 混合检索实现。
- 支持 chunk-level 来源引用，让推荐结果可解释。
- ReAct Agent 具备工具调用与反思能力。

### 4. 工程与测试

- 使用 pytest 完成网关单元测试与端到端回归，全量 33 个测试用例通过。
- 规范化 prompt/schema registry，支持版本管理与 A/B 切换。

## 技术栈

Python, FastAPI, Ollama, OpenAI, SQLAlchemy, PostgreSQL + pgvector, OpenTelemetry, pytest

## 一句话总结

独立负责宝宝成长 AI 服务的模型网关升级，实现多模型统一路由、降级、熔断、成本核算与 OpenTelemetry 可观测，保障推荐链路高可用与可扩展。
