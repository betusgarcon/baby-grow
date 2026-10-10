"""Data models and database schema for the AI service.

This module contains two groups of models:

1. Pydantic models: API request/response schemas. These define the contract
   between the AI service and its callers (the Java backend / mini-program).
2. SQLAlchemy ORM models: tables persisted in PostgreSQL, including the
   knowledge base, recipes, and AI decision audit logs.

Lifespan:
    Stable. Add new fields to existing schemas rather than replacing them.
    Breaking changes should be coordinated with the Java backend.
"""

from datetime import datetime
from functools import lru_cache
from typing import Any, Optional

from pgvector.sqlalchemy import Vector
from pydantic import BaseModel, Field, model_validator
from sqlalchemy import (
    JSON,
    Column,
    DateTime,
    Index,
    Integer,
    String,
    Text,
    create_engine,
    text,
)
from sqlalchemy.dialects.postgresql import TSVECTOR
from sqlalchemy.orm import declarative_base, sessionmaker

from app.config import get_settings

Base = declarative_base()

# ===========================================================================
# Pydantic models: extraction
# ===========================================================================


class PopulationContext(BaseModel):
    """Describes the population context for a request."""

    population: str
    placeholder: bool = False
    message: Optional[str] = None


class MilestoneRecord(BaseModel):
    """A developmental milestone reported by the parent."""

    type: str = Field(..., description="里程碑类型: 语言/运动/社交/认知")
    event: str = Field(..., description="里程碑事件描述")
    is_first: bool = Field(default=False, description="是否首次")


class FoodRecord(BaseModel):
    """A food item reported by the parent."""

    name: str = Field(..., description="食物名称")
    category: str = Field(..., description="食物类别: 蔬菜/水果/谷物/蛋类/肉类/豆制品/奶制品")
    is_first: bool = Field(default=False, description="是否首次食用")


class MilkRecord(BaseModel):
    """A milk feeding record reported by the parent."""

    type: str = Field(..., description="奶类型: 母乳/配方奶")
    amount_ml: Optional[int] = Field(default=None, description="奶量，单位 ml")
    period: Optional[str] = Field(default=None, description="时间段: 全天/单次")


class SleepRecord(BaseModel):
    """A sleep record reported by the parent."""

    duration_min: Optional[int] = Field(default=None, description="睡眠时长，单位分钟")
    quality: Optional[str] = Field(default=None, description="睡眠质量: 好/一般/差")
    note: Optional[str] = Field(default=None, description="额外说明")


class MoodRecord(BaseModel):
    """A mood record reported by the parent."""

    mood: Optional[str] = Field(default=None, description="情绪: 开心/烦躁/哭闹/平静")
    trigger: Optional[str] = Field(default=None, description="触发原因")


class GrowthRecord(BaseModel):
    """A body measurement reported by the parent.

    All three fields are optional: parents often weigh without measuring height.
    """

    height_cm: Optional[float] = Field(default=None, description="身高，单位 cm")
    weight_kg: Optional[float] = Field(default=None, description="体重，单位 kg")
    head_cm: Optional[float] = Field(default=None, description="头围，单位 cm")


class ExtractionResult(BaseModel):
    """Structured result of extracting baby records from free text."""

    milestones: list[MilestoneRecord] = Field(default_factory=list)
    food: list[FoodRecord] = Field(default_factory=list)
    milk: list[MilkRecord] = Field(default_factory=list)
    sleep: list[SleepRecord] = Field(default_factory=list)
    mood: list[MoodRecord] = Field(default_factory=list)
    growth: list[GrowthRecord] = Field(default_factory=list)
    summary: Optional[str] = Field(default=None, description="一句话摘要")


class ExtractRequest(BaseModel):
    """Request body for the record extraction endpoint.

    Two input shapes share this endpoint:

    - text-only: `text` carries the parent's note;
    - media: `media_base64` carries an inline image, with `text` as an optional
      caption.

    The media arrives inline rather than as a URL because the AI service neither
    reaches the business database nor holds a user token, and sharing a
    filesystem would couple the two deployments together.
    """

    baby_id: str
    baby_age_months: int = Field(..., ge=0, le=60)
    text: str = Field(default="", max_length=2000, description="家长的文字描述或图片说明")
    source_type: str = Field(default="TEXT", description="输入类型: TEXT/IMAGE/VIDEO")
    media_base64: Optional[str] = Field(default=None, description="图片的 base64 内容（不含 data URI 前缀）")
    media_mime: Optional[str] = Field(default=None, description="图片的 MIME 类型")
    population: str = Field(default="baby", description="人群: baby/pregnant/worker/elderly")

    @model_validator(mode="after")
    def require_some_input(self) -> "ExtractRequest":
        """Reject a request that carries neither text nor media."""
        if not self.text.strip() and not self.media_base64:
            raise ValueError("text 与 media_base64 至少要有一个")
        return self


class ExtractResponse(BaseModel):
    """Response returned by the record extraction endpoint."""

    status: str
    data: Optional[ExtractionResult] = None
    raw_text: Optional[str] = None
    confidence: Optional[float] = None
    model_name: Optional[str] = None
    elapsed_ms: Optional[int] = None
    error: Optional[str] = None


# ===========================================================================
# Pydantic models: recipe RAG
# ===========================================================================


class RecipeItem(BaseModel):
    """A single recommended dish."""

    meal_type: Optional[str] = Field(default=None, description="餐别: 早餐/午餐/晚餐/加餐")
    dish_name: str
    reason: Optional[str] = None
    ingredients: list[str] = Field(default_factory=list)
    instructions: Optional[str] = None
    source_chunk_ids: list[int] = Field(default_factory=list, description="来源 chunk_id 列表")


class SourceRef(BaseModel):
    """Reference to a knowledge chunk used to produce a recommendation."""

    document_id: int
    chunk_id: int
    title: str
    content: str
    similarity: float


class RecentDietDay(BaseModel):
    """One day of recent intake, supplied by the caller.

    The AI service has no access to the business database by design, so recent
    intake is passed in with the request rather than queried here.
    """

    day: str = Field(..., description="日期标签，如 今天/昨天 或 ISO 日期")
    foods: list[str] = Field(default_factory=list, description="当天吃过的食物名称")


class RecipeRecommendRequest(BaseModel):
    """Request body for the recipe recommendation endpoint."""

    baby_id: str
    baby_age_months: int = Field(..., ge=0, le=60)
    query: str = Field(default="今天吃什么", max_length=200)
    allergens: list[str] = Field(default_factory=list)
    liked_foods: list[str] = Field(default_factory=list)
    disliked_foods: list[str] = Field(default_factory=list)
    texture_level: Optional[str] = Field(default=None, description="质地: 泥糊/碎末/软块/颗粒/家常")
    # 近期饮食由调用方注入。为空时 Agent 会明确告知「未提供」，而不是拿假数据糊过去。
    recent_diet: list[RecentDietDay] = Field(
        default_factory=list, description="宝宝近几天的饮食，按时间倒序"
    )
    # Orchestration switch: True (default) → ReAct agent; False → fixed pipeline.
    use_agent: bool = Field(default=True, description="是否走 ReAct Agent 链路")
    population: str = Field(default="baby", description="人群: baby/pregnant/worker/elderly")


class RecipeRecommendResponse(BaseModel):
    """Response returned by the recipe recommendation endpoint."""

    status: str
    recommendation_id: Optional[int] = None
    summary: str
    items: list[RecipeItem] = Field(default_factory=list)
    avoid_items: list[str] = Field(default_factory=list)
    reason: Optional[str] = None
    confidence: Optional[float] = None
    source_refs: list[SourceRef] = Field(default_factory=list)
    model_name: Optional[str] = None
    elapsed_ms: Optional[int] = None
    # Agent observability: how many ReAct iterations ran and which tools were called.
    # Populated by RecipeAgent; left None by the fixed-pipeline path for comparison.
    iterations: Optional[int] = None
    tool_trace: list[str] = Field(default_factory=list)
    error: Optional[str] = None


# ===========================================================================
# SQLAlchemy models: knowledge base
# ===========================================================================


class KnowledgeDocument(Base):
    """One source file in the knowledge base -- the unit of provenance, not of search.

    Every converted Markdown file gets one row here (a whole standard, or one
    chapter of a book), holding the full text. Retrieval never returns these
    rows; they exist so a chunk can be traced back to the document it came from.

    `KnowledgeDocument` -> `KnowledgeChunk` is one-to-many. There is
    deliberately no foreign key and no cascade: the knowledge base is a
    rebuildable batch artifact, not transactional business data, so deletes
    drop chunks first and the document second, by hand -- see
    `ingest_guidelines._ingest_document`.
    """

    __tablename__ = "knowledge_documents"

    id = Column(Integer, primary_key=True, autoincrement=True)
    doc_type = Column(String(32), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    # Business key and the basis of idempotent ingestion: a path relative to
    # data/, e.g. guidelines/cuiyutao_natural_parenting/01-01-....md.
    # Re-running deletes previous rows by this value before inserting.
    source = Column(String(128), nullable=True)
    language = Column(String(16), default="zh")
    content = Column(Text, nullable=False)
    version = Column(String(32), default="1.0")
    status = Column(String(16), default="active")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class KnowledgeChunk(Base):
    """One searchable slice of a document -- the unit retrieval actually hits.

    Why slice at all: embed a whole chapter and its vector averages out every
    topic in it, matching nothing well. At a few hundred characters a chunk
    carries one idea, retrieves sharply, and still fits several of them into
    the model's context for citation.

    `content` carries a breadcrumb prefix (part > chapter > section) so a slice
    read out of context still says what it belongs to. `chunk_metadata` holds
    the structured fields the retrieval filter needs.
    """

    __tablename__ = "knowledge_chunks"

    __table_args__ = (
        # tsvector 上的索引必须是 GIN。写成 Column(..., index=True) 会让
        # create_all 建出一个 btree 索引：对 tsvector 既没有意义，又会在行内容较大时
        # 超出 btree 的约 2704 字节上限，导致插入（以及从备份恢复）直接失败。
        # 索引名沿用已有库里的那个，create_all 在既有库上因此是幂等的。
        Index("idx_knowledge_chunks_search_vector", "search_vector", postgresql_using="gin"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    document_id = Column(Integer, nullable=False, index=True)
    chunk_no = Column(Integer, default=0)
    content = Column(Text, nullable=False)
    chunk_metadata = Column(JSON, default=dict)
    # 1024 is fixed by the embedding model, bge-m3 (bert.embedding_length =
    # 1024). It is not a tunable: pointing EMBEDDING_MODEL at a different
    # dimension makes every insert fail on a dimension mismatch, and requires
    # changing this column and re-embedding the whole corpus.
    embedding = Column(Vector(1024), nullable=True)
    # Full-text column, fed the space-joined per-character tokens built by
    # `_build_tsvector`, because Postgres has no Chinese tokenizer for
    # to_tsvector('simple', ...). Indexed via __table_args__ above (GIN).
    search_vector = Column(TSVECTOR, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Recipe(Base):
    """Structured recipe record parsed from markdown files."""

    __tablename__ = "recipes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    recipe_name = Column(String(128), nullable=False)
    age_min_month = Column(Integer, nullable=False)
    age_max_month = Column(Integer, nullable=False)
    texture_level = Column(String(32), nullable=True)
    cook_method = Column(String(64), nullable=True)
    ingredient_summary = Column(Text, nullable=True)
    nutrition_summary = Column(Text, nullable=True)
    instructions = Column(Text, nullable=True)
    status = Column(String(16), default="active")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class RecipeIngredient(Base):
    """Ingredients associated with a recipe."""

    __tablename__ = "recipe_ingredients"

    id = Column(Integer, primary_key=True, autoincrement=True)
    recipe_id = Column(Integer, nullable=False, index=True)
    ingredient_name = Column(String(64), nullable=False)
    quantity_desc = Column(String(64), nullable=True)
    is_allergen = Column(Integer, default=0)
    remark = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


# ===========================================================================
# SQLAlchemy models: audit logs
# ===========================================================================


class AiDecisionLog(Base):
    """Audit log for every AI decision (extraction or recommendation).

    Persisted for observability, debugging, and future model improvement.
    """

    __tablename__ = "ai_decision_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    biz_type = Column(String(32), nullable=False, index=True)
    biz_id = Column(String(64), nullable=True, index=True)
    model_name = Column(String(64), nullable=True)
    model_version = Column(String(64), nullable=True)
    prompt_version = Column(String(64), nullable=True)
    input_summary = Column(Text, nullable=True)
    retrieved_refs = Column(JSON, default=list)
    output_summary = Column(Text, nullable=True)
    confidence = Column(String(32), nullable=True)
    decision_type = Column(String(32), nullable=True)
    raw_response_json = Column(JSON, nullable=True)
    elapsed_ms = Column(Integer, nullable=True)
    trace_id = Column(String(64), nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class LlmCallLog(Base):
    """Per-LLM-call telemetry log for cost, latency, and observability.

    Records every chat/embed/tokenizer call to any model provider so the team
    can track spend, latency, and usage by model/task over time.
    """

    __tablename__ = "llm_call_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    request_id = Column(String(64), nullable=True, index=True)
    trace_id = Column(String(64), nullable=True, index=True)
    provider = Column(String(32), nullable=False)
    model = Column(String(64), nullable=False)
    task_type = Column(String(32), nullable=True)
    input_tokens = Column(Integer, nullable=True)
    output_tokens = Column(Integer, nullable=True)
    latency_ms = Column(Integer, nullable=True)
    cost_usd = Column(String(32), nullable=True)
    status = Column(String(16), default="ok")
    error = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


# ===========================================================================
# DB helpers
# ===========================================================================


@lru_cache(maxsize=1)
def get_engine():
    """Create and cache a SQLAlchemy engine bound to PostgreSQL."""
    settings = get_settings()
    return create_engine(
        settings.pg_dsn,
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=10,
        echo=False,
    )


def get_session_factory():
    """Return a configured sessionmaker for the cached engine."""
    return sessionmaker(autocommit=False, autoflush=False, bind=get_engine())


def init_db():
    """Ensure the pgvector extension and all tables exist."""
    engine = get_engine()
    with engine.connect() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        conn.commit()
    Base.metadata.create_all(bind=engine)
