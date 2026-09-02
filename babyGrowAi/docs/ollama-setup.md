# Ollama 本地模型部署与调优

## 安装 Ollama

```bash
brew install ollama
```

或从官网下载桌面版：https://ollama.com/download

## 拉取模型

```bash
# 主模型：文本提取 + 食谱推荐
ollama pull qwen2.5:7b-instruct-q5_K_M

# Embedding 模型（二选一）
ollama pull bge-m3:latest
# 备选：ollama pull nomic-embed-text:latest
```

## 性能优化（强烈建议）

在 `~/.zshrc` 或 `~/.bashrc` 中添加：

```bash
export OLLAMA_FLASH_ATTENTION=1
export OLLAMA_KV_CACHE_TYPE=q8_0
export OLLAMA_MAX_LOADED_MODELS=2
export OLLAMA_KEEP_ALIVE=30m
```

说明：
- `OLLAMA_FLASH_ATTENTION=1`：启用 Flash Attention，降低内存并提速
- `OLLAMA_KV_CACHE_TYPE=q8_0`：KV 缓存量化到 8bit
- `OLLAMA_MAX_LOADED_MODELS=2`：同时驻留 2 个模型（7B + embedding）
- `OLLAMA_KEEP_ALIVE=30m`：模型驻留 30 分钟

## 创建自定义模型（可选）

创建 `baby-extractor.Modelfile`：

```
FROM qwen2.5:7b-instruct-q5_K_M
PARAMETER num_ctx 1024
PARAMETER num_batch 512
PARAMETER temperature 0.1
PARAMETER top_p 0.8
SYSTEM """
你是宝宝成长记录信息提取助手。从家长描述中提取里程碑、食物、奶量信息。
只输出JSON，不要解释。输出最精简的JSON，不要包含空字段。
"""
```

创建并运行：

```bash
ollama create baby-extractor -f baby-extractor.Modelfile
ollama run baby-extractor "今天宝宝第一次笑了"
```

## 验证模型可用

```bash
curl http://localhost:11434/api/tags
```

## 内存参考

| 模型 | 量化 | 内存占用 |
|------|------|----------|
| qwen2.5:7b-instruct-q5_K_M | Q5 | ~5GB |
| bge-m3:latest | FP16 | ~500MB |

合计约 5.5GB，加上系统开销，建议 AI 服务预留 10GB 以上。
