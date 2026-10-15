"""Application configuration.

Settings are loaded from environment variables, with an optional `.env` file in
`babyGrowAi/.env` for local development. Pydantic-settings handles validation and
type coercion.

Lifespan:
    Stable. New toggles or endpoint URLs should be added here as typed fields.
"""

import os
from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

# Base path used to locate the .env file relative to this module.
_BASE_DIR = os.path.dirname(os.path.abspath(__file__))
_ENV_FILE = os.path.join(_BASE_DIR, "..", "..", ".env")


class Settings(BaseSettings):
    """All service configuration, sourced from environment variables."""

    model_config = SettingsConfigDict(
        env_file=_ENV_FILE,
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # -----------------------------------------------------------------------
    # Service runtime
    # -----------------------------------------------------------------------
    ai_service_port: int = Field(default=8001, alias="AI_SERVICE_PORT")
    log_level: str = Field(default="INFO", alias="LOG_LEVEL")

    # -----------------------------------------------------------------------
    # Ollama model server
    # -----------------------------------------------------------------------
    ollama_base_url: str = Field(default="http://localhost:11434", alias="OLLAMA_BASE_URL")
    # Main generative model: used for extraction, recipe generation, and Agent.
    ollama_model: str = Field(default="qwen2.5:7b-instruct-q5_K_M", alias="OLLAMA_MODEL")
    # Embedding model: used for knowledge base vector search.
    embedding_model: str = Field(default="bge-m3:latest", alias="EMBEDDING_MODEL")
    # Vision-language model: used to extract records from photos/video frames.
    # Kept separate from the text model because VLMs are memory-hungry and are
    # loaded on demand rather than kept resident.
    vision_model: str = Field(default="qwen3-vl:8b", alias="VISION_MODEL")

    # -----------------------------------------------------------------------
    # LLM behavior
    # -----------------------------------------------------------------------
    ai_timeout: int = Field(default=60, alias="AI_TIMEOUT")
    ai_max_tokens: int = Field(default=1024, alias="AI_MAX_TOKENS")
    ai_temperature: float = Field(default=0.1, alias="AI_TEMPERATURE")
    ai_top_p: float = Field(default=0.8, alias="AI_TOP_P")
    # Context window size passed to Ollama. Must fit the full prompt including
    # few-shot examples and retrieved knowledge.
    ai_num_ctx: int = Field(default=1024, alias="AI_NUM_CTX")

    # -----------------------------------------------------------------------
    # Data stores
    # -----------------------------------------------------------------------
    pg_dsn: str = Field(
        default="postgresql://postgres:postgres@localhost:5432/baby_grow_ai",
        alias="PG_DSN",
    )
    # 业务库不在这里：它由 Java 后端独占，本服务不连（见 docs/backend-design.md §1.2）。
    # 原先预留的 MYSQL_DSN 随架构定案一并移除。
    redis_url: str = Field(default="redis://localhost:6379/0", alias="REDIS_URL")

    # -----------------------------------------------------------------------
    # RAG retrieval
    # -----------------------------------------------------------------------
    rag_top_k: int = Field(default=5, alias="RAG_TOP_K")
    rag_min_similarity: float = Field(default=0.5, alias="RAG_MIN_SIMILARITY")

    # -----------------------------------------------------------------------
    # 模型后端选择
    # -----------------------------------------------------------------------
    # 全局开关，决定文本类任务（识别、食谱）走哪一侧：
    #   gateway（默认）—— 云端大模型网关，DeepSeek 的 API 是 OpenAI 兼容的，
    #                    因此复用 openai provider，只需填下面三个参数
    #   local          —— 本机 Ollama，同时把云端挂作兜底（本机不在线时自动切走）
    #
    # 之所以默认 gateway：本机不常开机、在外时无法穿透，可用性太低；
    # 云端才是能一直依赖的那一侧。回家想用本机模型时改这个值即可。
    #
    # 注意 embedding 不受本开关影响——知识库向量是用 bge-m3 生成的，
    # 换模型会导致向量空间不匹配、检索直接失效（除非整库重新向量化）。
    # 具体路由见 services/model_gateway/router.py。
    ai_model_source: str = Field(default="gateway", alias="AI_MODEL_SOURCE")

    # 云端网关连接参数。三者齐全才算「配好了」，缺任何一个都不启用该 provider，
    # 免得路由选中一个必然失败的地址。
    external_model_api_key: str = Field(default="", alias="EXTERNAL_MODEL_API_KEY")
    external_model_base_url: str = Field(default="", alias="EXTERNAL_MODEL_BASE_URL")
    external_model_name: str = Field(default="", alias="EXTERNAL_MODEL_NAME")

    # -----------------------------------------------------------------------
    # 文生图（心愿头图）
    # -----------------------------------------------------------------------
    # 刻意与上面那套路由分开，原因有三：
    #   1. 出图是另一家供应商、另一种接口形状（不是 chat completions），
    #      套不进 model_gateway 的 ModelRequest/ModelResponse；
    #   2. 它不受 AI_MODEL_SOURCE 影响——Ollama **不支持出图**，
    #      所以这一路没有本机退路，开关对它没有意义；
    #   3. 目前只有一家供应商，本来也没有 fallback 链可言。
    # 出第二家时再抽公共抽象（见 services/image_gateway.py 的说明）。
    #
    # 未填 api_key 时该能力整体关闭：路由返回 503，调用方把心愿标成 failed，
    # 页面回落到渐变占位——心愿本身照常可用。
    image_model_api_key: str = Field(default="", alias="IMAGE_MODEL_API_KEY")
    image_model_base_url: str = Field(
        default="https://api.siliconflow.cn/v1", alias="IMAGE_MODEL_BASE_URL"
    )
    image_model_name: str = Field(default="Kwai-Kolors/Kolors", alias="IMAGE_MODEL_NAME")
    # 头图是按 3:4 左右的区域裁切显示的，方图裁出来最不吃亏
    image_model_size: str = Field(default="1024x1024", alias="IMAGE_MODEL_SIZE")
    # 出图比对话慢得多，超时要给够；这也顺带界定了 Java 侧那次调用的上界
    image_model_timeout: int = Field(default=120, alias="IMAGE_MODEL_TIMEOUT")


@lru_cache
def get_settings() -> Settings:
    """Return a cached Settings instance.

    The instance is cached so that environment variables are read only once
    per process, avoiding repeated validation overhead.
    """
    return Settings()
