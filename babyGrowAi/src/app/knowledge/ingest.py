import argparse
import logging
import re
from pathlib import Path

from sqlalchemy.orm import Session

from app.db import db_session
from app.models import (
    KnowledgeChunk,
    KnowledgeDocument,
    Recipe,
    RecipeIngredient,
    init_db,
)
from app.services.embedding import get_embedding_service

logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).parent.parent.parent.parent / "data"
RECIPES_DIR = DATA_DIR / "recipes"
GUIDES_DIR = DATA_DIR / "guides"

TEXTURE_MAP = {
    "泥糊": "泥糊",
    "碎末": "碎末",
    "软块": "软块",
    "颗粒": "颗粒",
    "家常": "家常",
}


def _relative_source(path: Path) -> str:
    """Return a path relative to DATA_DIR, falling back to path.name if outside."""
    try:
        return str(path.relative_to(DATA_DIR))
    except ValueError:
        return path.name


def _parse_recipe_age(age_line: str) -> tuple[int, int]:
    """Parse '适合月龄：6-8个月' -> (6, 8) or '适合月龄：12-18月' -> (12, 18)."""
    match = re.search(r"(\d+)(?:\s*[-–]\s*(\d+))?", age_line)
    if not match:
        return 0, 60
    min_age = int(match.group(1))
    max_age = int(match.group(2)) if match.group(2) else min_age + 2
    return min_age, max_age


def _parse_texture(line: str) -> str:
    for key in TEXTURE_MAP:
        if key in line:
            return key
    return ""


def _extract_section(text: str, section_name: str) -> str:
    pattern = rf"##\s*{section_name}.*?(?=\n##\s|\Z)"
    match = re.search(pattern, text, re.DOTALL)
    if match:
        return match.group(0).strip()
    return ""


def _parse_recipe_markdown(path: Path) -> dict:
    content = path.read_text(encoding="utf-8")
    title = content.split("\n", 1)[0].replace("# ", "").strip()
    age_min, age_max = 0, 60
    texture = ""
    category = ""
    allergen = ""

    for line in content.splitlines():
        if line.startswith("- 适合月龄："):
            age_min, age_max = _parse_recipe_age(line)
        if line.startswith("- 质地等级："):
            texture = _parse_texture(line)
        if line.startswith("- 食物类别："):
            category = line.split("：", 1)[1].strip()
        if line.startswith("- 过敏原："):
            allergen = line.split("：", 1)[1].strip()

    ingredient_section = _extract_section(content, "食材")
    instructions_section = _extract_section(content, "做法")
    nutrition_section = _extract_section(content, "营养说明")

    return {
        "title": title,
        "content": content,
        "age_min": age_min,
        "age_max": age_max,
        "texture": texture,
        "category": category,
        "allergen": allergen,
        "ingredient_text": ingredient_section,
        "instructions_text": instructions_section,
        "nutrition_text": nutrition_section,
    }


async def _ingest_recipe(session: Session, path: Path, embedding_service) -> None:
    data = _parse_recipe_markdown(path)

    doc = KnowledgeDocument(
        doc_type="recipe",
        title=data["title"],
        source=_relative_source(path),
        language="zh",
        content=data["content"],
    )
    session.add(doc)
    session.flush()

    recipe = Recipe(
        recipe_name=data["title"],
        age_min_month=data["age_min"],
        age_max_month=data["age_max"],
        texture_level=data["texture"],
        ingredient_summary=data["ingredient_text"],
        nutrition_summary=data["nutrition_text"],
        instructions=data["instructions_text"],
    )
    session.add(recipe)
    session.flush()

    ingredient_names = []
    for line in data["ingredient_text"].splitlines():
        line = line.strip()
        if line.startswith("-"):
            name = line[1:].split(" ", 1)[0].split("（")[0].strip()
            if name:
                ingredient_names.append(name)
                ri = RecipeIngredient(
                    recipe_id=recipe.id,
                    ingredient_name=name,
                    is_allergen=0,
                )
                session.add(ri)

    chunk_text = (
        f"食谱：{data['title']}\n"
        f"适合月龄：{data['age_min']}-{data['age_max']}个月\n"
        f"质地：{data['texture']}\n"
        f"食材：{', '.join(ingredient_names)}\n"
        f"做法：{data['instructions_text']}\n"
        f"营养：{data['nutrition_text']}"
    )

    try:
        vector = await embedding_service.embed(chunk_text)
    except Exception as exc:
        logger.warning("Embedding failed, skipping vector: %s", exc)
        vector = None

    chunk = KnowledgeChunk(
        document_id=doc.id,
        chunk_no=0,
        content=chunk_text,
        chunk_metadata={
            "age_min_month": data["age_min"],
            "age_max_month": data["age_max"],
            "doc_type": "recipe",
            "texture_level": data["texture"],
            "allergens": data["allergen"],
            "source": str(path),
        },
        embedding=vector,
    )
    session.add(chunk)
    logger.info("Ingested recipe: %s", data["title"])


async def _ingest_guide(session: Session, path: Path, embedding_service) -> None:
    content = path.read_text(encoding="utf-8")
    title = content.split("\n", 1)[0].replace("# ", "").strip()

    doc = KnowledgeDocument(
        doc_type="guide",
        title=title,
        source=_relative_source(path),
        language="zh",
        content=content,
    )
    session.add(doc)
    session.flush()

    sections = re.split(r"\n##\s+", content)
    chunk_no = 0
    for section in sections:
        if not section.strip():
            continue
        chunk_text = section.strip()
        try:
            vector = await embedding_service.embed(chunk_text)
        except Exception as exc:
            logger.warning("Embedding failed, skipping vector: %s", exc)
            vector = None

        chunk = KnowledgeChunk(
            document_id=doc.id,
            chunk_no=chunk_no,
            content=chunk_text,
            chunk_metadata={
                "age_min_month": 0,
                "age_max_month": 60,
                "doc_type": "guide",
                "source": str(path),
            },
            embedding=vector,
        )
        session.add(chunk)
        chunk_no += 1

    logger.info("Ingested guide: %s", title)


async def ingest_all(recipes_dir: Path | None = None, guides_dir: Path | None = None):
    init_db()
    embedding_service = get_embedding_service()

    if recipes_dir is None:
        recipes_dir = RECIPES_DIR
    if guides_dir is None:
        guides_dir = GUIDES_DIR

    with db_session() as session:  # type: ignore[arg-type]
        for path in sorted(recipes_dir.glob("*.md")):
            await _ingest_recipe(session, path, embedding_service)

        for path in sorted(guides_dir.glob("*.md")):
            await _ingest_guide(session, path, embedding_service)


def main():
    parser = argparse.ArgumentParser(description="Ingest baby growth knowledge base")
    parser.add_argument("--recipes-dir", type=Path, default=None)
    parser.add_argument("--guides-dir", type=Path, default=None)
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO)
    import asyncio

    asyncio.run(ingest_all(args.recipes_dir, args.guides_dir))


if __name__ == "__main__":
    main()
