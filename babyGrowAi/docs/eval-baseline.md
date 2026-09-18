# baby-grow AI 模块评估基线

记录时间：2026-09-18
环境：本地 Ollama（qwen2.5:7b-instruct-q5_K_M）+ bge-m3:latest，PostgreSQL/pgvector Docker

## 回归结果

| 测试集 | 阈值 | 结果 | 耗时 |
|--------|------|------|------|
| Agent 回归 (`tests/test_agent_regression.py`) | ≥75% | ✅ 通过 | 约 7.5 min（含其他测试） |
| Retrieval 回归 (`tests/test_retrieval_regression.py`) | ≥80% | ✅ 通过 | 含在上式中 |
| Extractor 回归 (`tests/test_extractor_regression.py`) | ≥85% | ✅ 通过 | 含在上式中 |
| 规则/提取单元测试 (`tests/test_recipe_rag.py`, `tests/test_extractor.py`) | 精确断言 | ✅ 通过 | 含在上式中 |

**完整命令**：

```bash
cd babyGrowAi
python -m pytest tests/ -v --tb=short
```

输出：

```
======================== 10 passed in 450.23s (0:7:30) ========================
```

## 已知的 mock/占位项

1. `agent/tools.py::get_recent_diet` 使用内存 mock 数据（`_MOCK_RECENT_DIET`）。
2. `recipe_rag.py` 固定流水线 `source_refs` 的 `similarity=0.0` 占位。
3. `agent/react.py` Agent 路径 `source_refs=[]` 未回填。
4. `extractor.py::confidence=1.0` 固定值。
5. `recipe_rag.py::recommend_stream` 并非真实流式推理。

## 下一步

开始 Phase 1：网关升级 + OpenTelemetry 可观测性骨架。
