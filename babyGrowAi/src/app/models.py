from datetime import datetime
from functools import lru_cache
from typing import Any, Optional

from pgvector.sqlalchemy import Vector
from pydantic import BaseModel, Field
from sqlalchemy import JSON, Column, DateTime, Integer, String, Text, create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker

from app.config import get_settings

Base = declarative_base()

# ---------------------------------------------------------------------------
# Pydantic models: extraction
# ---------------------------------------------------------------------------


class MilestoneRecord(BaseModel):
    type: str = Field(..., description="里程碑类型: 语言/运动/社交/认知")
    event: str = Field(..., description="里程碑事件描述")
    is_first: bool = Field(default=False, description="是否首次")


class FoodRecord(BaseModel):
    name: str = Field(..., description="食物名称")
    category: str = Field(..., description="食物类别: 蔬菜/水果/谷物/蛋类/肉类/豆制品/奶制品")
    is_first: bool = Field(default=False, description="是否首次食用")


class MilkRecord(BaseModel):
    type: str = Field(..., description="奶类型: 母乳/配方奶")
    amount_ml: Optional[int] = Field(default=None, description="奶量，单位 ml")
    period: Optional[str] = Field(default=None, description="时间段: 全天/单次")


class SleepRecord(BaseModel):
    duration_min: Optional[int] = Field(default=None, description="睡眠时长，单位分钟")
    quality: Optional[str] = Field(default=None, description="睡眠质量: 好/一般/差")
    note: Optional[str] = Field(default=None, description="额外说明")


class MoodRecord(BaseModel):
    mood: Optional[str] = Field(default=None, description="情绪: 开心/烦躁/哭闹/平静")
    trigger: Optional[str] = Field(default=None, description="触发原因")


class ExtractionResult(BaseModel):
    milestones: list[MilestoneRecord] = Field(default_factory=list)
    food: list[FoodRecord] = Field(default_factory=list)
    milk: list[MilkRecord] = Field(default_factory=list)
    sleep: list[SleepRecord] = Field(default_factory=list)
    mood: list[MoodRecord] = Field(default_factory=list)
    summary: Optional[str] = Field(default=None, description="一句话摘要")


class ExtractRequest(BaseModel):
    baby_id: str
    baby_age_months: int = Field(..., ge=0, le=60)
    text: str = Field(..., min_length=1, max_length=2000)
    source_type: str = Field(default="TEXT", description="输入类型: TEXT/IMAGE/VIDEO")


class ExtractResponse(BaseModel):
    status: str
    data: Optional[ExtractionResult] = None
    raw_text: Optional[str] = None
    confidence: Optional[float] = None
    model_name: Optional[str] = None
    elapsed_ms: Optional[int] = None
    error: Optional[str] = None


# ---------------------------------------------------------------------------
# Pydantic models: recipe RAG
# ---------------------------------------------------------------------------


class RecipeItem(BaseModel):
    meal_type: Optional[str] = Field(default=None, description="餐别: 早餐/午餐/晚餐/加餐")
    dish_name: str
    reason: Optional[str] = None
    ingredients: list[str] = Field(default_factory=list)
    instructions: Optional[str] = None


class SourceRef(BaseModel):
    document_id: int
    chunk_id: int
    title: str
    content: str
    similarity: float


class RecipeRecommendRequest(BaseModel):
    baby_id: str
    baby_age_months: int = Field(..., ge=0, le=60)
    query: str = Field(default="今天吃什么", max_length=200)
    allergens: list[str] = Field(default_factory=list)
    liked_foods: list[str] = Field(default_factory=list)
    disliked_foods: list[str] = Field(default_factory=list)
    texture_level: Optional[str] = Field(default=None, description="质地: 泥糊/碎末/软块/颗粒/家常")


class RecipeRecommendResponse(BaseModel):
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
    error: Optional[str] = None


# ---------------------------------------------------------------------------
# SQLAlchemy models: knowledge base
# ---------------------------------------------------------------------------


class KnowledgeDocument(Base):
    __tablename__ = "knowledge_documents"

    id = Column(Integer, primary_key=True, autoincrement=True)
    doc_type = Column(String(32), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    source = Column(String(128), nullable=True)
    language = Column(String(16), default="zh")
    content = Column(Text, nullable=False)
    version = Column(String(32), default="1.0")
    status = Column(String(16), default="active")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class KnowledgeChunk(Base):
    __tablename__ = "knowledge_chunks"

    id = Column(Integer, primary_key=True, autoincrement=True)
    document_id = Column(Integer, nullable=False, index=True)
    chunk_no = Column(Integer, default=0)
    content = Column(Text, nullable=False)
    chunk_metadata = Column(JSON, default=dict)
    embedding = Column(Vector(1024), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Recipe(Base):
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
    __tablename__ = "recipe_ingredients"

    id = Column(Integer, primary_key=True, autoincrement=True)
    recipe_id = Column(Integer, nullable=False, index=True)
    ingredient_name = Column(String(64), nullable=False)
    quantity_desc = Column(String(64), nullable=True)
    is_allergen = Column(Integer, default=0)
    remark = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class AiDecisionLog(Base):
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
    created_at = Column(DateTime, default=datetime.utcnow)


# ---------------------------------------------------------------------------
# DB helpers
# ---------------------------------------------------------------------------


from functools import lru_cache


@lru_cache(maxsize=1)
def get_engine():
    settings = get_settings()
    return create_engine(
        settings.pg_dsn,
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=10,
        echo=False,
    )


def get_session_factory():
    return sessionmaker(autocommit=False, autoflush=False, bind=get_engine())


def init_db():
    engine = get_engine()
    with engine.connect() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        conn.commit()
    Base.metadata.create_all(bind=engine)
