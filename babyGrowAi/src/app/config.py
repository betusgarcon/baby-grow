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
    # MySQL DSN is reserved for the Java backend; not used by the AI service directly.
    mysql_dsn: str = Field(
        default="mysql+pymysql://babygrow:babygrow-dev@localhost:3306/baby_grow",
        alias="MYSQL_DSN",
    )
    redis_url: str = Field(default="redis://localhost:6379/0", alias="REDIS_URL")

    # -----------------------------------------------------------------------
    # RAG retrieval
    # -----------------------------------------------------------------------
    rag_top_k: int = Field(default=5, alias="RAG_TOP_K")
    rag_min_similarity: float = Field(default=0.5, alias="RAG_MIN_SIMILARITY")

    # -----------------------------------------------------------------------
    # External model fallback (reserved for future phases)
    # -----------------------------------------------------------------------
    # Currently unused. The gateway only talks to Ollama. These fields exist so
    # the fallback can be enabled without changing the settings schema.
    external_model_enabled: bool = Field(default=False, alias="EXTERNAL_MODEL_ENABLED")
    external_model_api_key: str = Field(default="", alias="EXTERNAL_MODEL_API_KEY")
    external_model_base_url: str = Field(default="", alias="EXTERNAL_MODEL_BASE_URL")
    external_model_name: str = Field(default="", alias="EXTERNAL_MODEL_NAME")


@lru_cache
def get_settings() -> Settings:
    """Return a cached Settings instance.

    The instance is cached so that environment variables are read only once
    per process, avoiding repeated validation overhead.
    """
    return Settings()
