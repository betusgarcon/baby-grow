"""Ingest the converted guideline Markdown into the knowledge base.

Sits beside `ingest.py` and shares its conventions (same embedding service,
same `to_tsvector('simple', ...)` keyword strategy) but reads the structured
Markdown produced by `scripts/build_guidelines.py` rather than data/guides.

What this loader adds over the plain guide loader:

* YAML front matter is carried into ``KnowledgeChunk.chunk_metadata``, so a
  chunk knows its source document, its place in the heading tree, and which
  population it is written for.
* Chunks are cut on heading boundaries and carry a breadcrumb prefix, so a
  passage retrieved out of context still says what it belongs to.
* Every chunk is idempotent on ``source``: re-running deletes the document's
  previous chunks first, so the pipeline can be re-run after any change.

Usage:
    cd babyGrowAi
    python -m app.knowledge.ingest_guidelines

Lifespan:
    Stable. Re-run after `scripts/build_guidelines.py`.
"""

import argparse
import asyncio
import logging
import re
from pathlib import Path

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db import db_session
from app.models import KnowledgeChunk, KnowledgeDocument, init_db
from app.services.embedding import get_embedding_service

logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).parent.parent.parent.parent / "data"
GUIDELINES_DIR = DATA_DIR / "guidelines"

# Chinese runs about one token per character, so these are character counts
# standing in for the 512-1024 token target of the written plan.
# 800 is the trade-off: cut smaller and a single argument gets shredded into
# fragments that no longer state a conclusion; cut larger and the vector
# averages several topics together. Measured median across the corpus: 389.
CHUNK_TARGET_CHARS = 800
# Neighbouring chunks share this much text so a conclusion sitting exactly on a
# boundary is still fully present in one of them.
CHUNK_OVERLAP_CHARS = 100

HEADING_RE = re.compile(r"^(#{1,6})\s+(.*)$")
PAGE_MARKER_RE = re.compile(r"^<!--\s*page:\s*([\d-]+)\s*-->$")
FRONT_MATTER_RE = re.compile(r"^---\n(.*?)\n---\n", re.DOTALL)


def _parse_front_matter(content: str) -> tuple[dict, str]:
    """Split `content` into its front matter mapping and the body below it."""
    match = FRONT_MATTER_RE.match(content)
    if not match:
        return {}, content

    front: dict = {}
    for line in match.group(1).splitlines():
        if not line.strip() or ":" not in line:
            continue
        key, _, value = line.partition(":")
        value = value.strip()
        if value.startswith("[") and value.endswith("]"):
            items = [v.strip() for v in value[1:-1].split(",") if v.strip()]
            front[key.strip()] = items
        else:
            front[key.strip()] = value
    return front, content[match.end():]


def _parse_sections(body: str) -> list[tuple[list[str], str]]:
    """Return ``(title_path, text)`` per heading, with the title_path as a breadcrumb.

    ``title_path`` holds the enclosing headings including the section's own,
    e.g. ``["第二部分 如何养", "07 “吃”这件事可不简单"]``.
    """
    sections: list[tuple[list[str], str]] = []
    stack: list[tuple[int, str]] = []
    current: list[str] = []
    path: list[str] = []

    def flush() -> None:
        text = "\n".join(current).strip()
        if text and path:
            sections.append((list(path), text))
        current.clear()

    for line in body.splitlines():
        match = HEADING_RE.match(line)
        if match:
            flush()
            level, title = len(match.group(1)), match.group(2).strip()
            while stack and stack[-1][0] >= level:
                stack.pop()
            stack.append((level, title))
            path = [t for _, t in stack]
            continue
        # The page marker is provenance for the chunk, not part of its text.
        if PAGE_MARKER_RE.match(line.strip()):
            continue
        current.append(line)

    flush()
    return sections


def _split_long(text: str, *, target: int, overlap: int) -> list[str]:
    """Split `text` at paragraph boundaries into chunks of about `target` chars.

    A table is one paragraph and is never cut: its rows only mean anything
    together. Consecutive chunks share `overlap` characters so a passage that
    straddles a boundary is still retrievable from one of them.
    """
    paragraphs = [p for p in re.split(r"\n\s*\n", text) if p.strip()]
    chunks: list[str] = []
    current = ""

    for paragraph in paragraphs:
        if current and len(current) + len(paragraph) + 2 > target:
            chunks.append(current)
            current = _tail(current, overlap)
        current = f"{current}\n\n{paragraph}" if current else paragraph

    if current.strip():
        chunks.append(current)
    return chunks or [text]


def _tail(text: str, limit: int) -> str:
    """Return the last `limit` characters of `text`, starting at a paragraph break."""
    if len(text) <= limit:
        return text
    tail = text[-limit:]
    _, _, remainder = tail.partition("\n\n")
    return remainder or tail


def _breadcrumb(title_path: list[str]) -> str:
    return "【" + " > ".join(title_path) + "】"


def _block_type(chunk: str) -> str:
    return "table" if any(line.lstrip().startswith("|") for line in chunk.splitlines()) else "text"


def build_chunks(front: dict, body: str) -> list[dict]:
    """Turn one guideline Markdown file into the chunks to be embedded.

    This is the document -> chunk split itself, done in two passes: first by
    Markdown heading, then, only if a section is still too long, by paragraph.
    Heading boundaries line up with meaning, so a sentence is far less likely
    to be cut in half than it would be under a fixed-size sliding window.
    """
    chunks: list[dict] = []
    for title_path, text in _parse_sections(body):
        # The breadcrumb goes into the embedded text, not just the metadata:
        # the vector is computed over `content`, so a passage only becomes
        # findable by "what does 崔玉涛 say about natural parenting" if its own
        # text says which book and chapter it came from.
        prefix = _breadcrumb(title_path) + "\n"
        for piece in _split_long(text, target=CHUNK_TARGET_CHARS, overlap=CHUNK_OVERLAP_CHARS):
            content = prefix + piece.strip()
            chunks.append({"content": content, "title_path": title_path})
    return chunks


def _relative_source(path: Path) -> str:
    try:
        return str(path.relative_to(DATA_DIR))
    except ValueError:
        return path.name


async def _ingest_document(session: Session, path: Path, embedding_service) -> int:
    """Replace the stored chunks for one Markdown file. Returns the new chunk count.

    One Markdown file becomes exactly one `knowledge_documents` row (the full
    text, for provenance) plus N `knowledge_chunks` rows (the searchable
    slices). They are linked by `document_id` with no foreign key, so the
    delete below has to happen in two explicit steps.
    """
    front, body = _parse_front_matter(path.read_text(encoding="utf-8"))
    title = next(
        (HEADING_RE.match(line).group(2).strip() for line in body.splitlines() if HEADING_RE.match(line)),
        path.stem,
    )
    source = _relative_source(path)
    chunks = build_chunks(front, body)

    # Idempotency: drop whatever this file produced last time, so a re-run
    # never leaves stale chunks behind.
    old_ids = [
        row[0]
        for row in session.query(KnowledgeDocument.id)
        .filter(KnowledgeDocument.source == source)
        .all()
    ]
    if old_ids:
        session.query(KnowledgeChunk).filter(KnowledgeChunk.document_id.in_(old_ids)).delete(
            synchronize_session=False
        )
        session.query(KnowledgeDocument).filter(KnowledgeDocument.id.in_(old_ids)).delete(
            synchronize_session=False
        )

    doc = KnowledgeDocument(
        doc_type=front.get("doc_type", "guideline"),
        title=title,
        source=source,
        language="zh",
        content=body.strip(),
    )
    session.add(doc)
    session.flush()

    for chunk_no, chunk in enumerate(chunks):
        content = chunk["content"]
        try:
            vector = await embedding_service.embed(content)
        except Exception as exc:
            logger.warning("Embedding failed, skipping vector: %s", exc)
            vector = None

        metadata = {
            # This is the only thing the retrieval-time filter can see:
            # RetrievalService reads age_min/month_max to gate on age and
            # `population` to gate on who the answer is for. A missing field
            # does not fail loudly -- it silently widens or narrows what the
            # chunk matches, which is why verify_guidelines checks for it.
            "source": front.get("source", title),
            "doc_type": front.get("doc_type", "guideline"),
            "title": title,
            "title_path": chunk["title_path"],
            "part": front.get("part", ""),
            "section": chunk["title_path"][-1],
            "block_type": _block_type(content),
            "population": front.get("population", []),
            "age_min_month": int(front.get("age_min_month", 0) or 0),
            "age_max_month": int(front.get("age_max_month", 60) or 60),
            "doc_id": front.get("doc_id", ""),
            "file": source,
        }
        session.add(
            KnowledgeChunk(
                document_id=doc.id,
                chunk_no=chunk_no,
                content=content,
                chunk_metadata=metadata,
                embedding=vector,
                search_vector=text("to_tsvector('simple', :txt)").bindparams(txt=_build_tsvector(content)),
            )
        )

    logger.info("Ingested %s: %d chunk(s)", source, len(chunks))
    return len(chunks)


def _build_tsvector(content: str) -> str:
    """Tokenize for `to_tsvector('simple', ...)`; see `app.knowledge.ingest`."""
    tokens = re.findall(r"[一-鿿]+", content)
    words = [w for w in re.findall(r"[a-zA-Z]+", content) if len(w) > 1]
    tokens.extend(words)
    return " ".join(tokens)


async def ingest_guidelines(directory: Path | None = None) -> int:
    """Ingest every guideline Markdown file under `directory`. Returns its chunk count."""
    init_db()
    embedding_service = get_embedding_service()
    directory = directory or GUIDELINES_DIR

    total = 0
    with db_session() as session:  # type: ignore[arg-type]
        for path in sorted(directory.rglob("*.md")):
            total += await _ingest_document(session, path, embedding_service)
    return total


def main() -> None:
    parser = argparse.ArgumentParser(description="Ingest converted guideline Markdown")
    parser.add_argument("--dir", type=Path, default=None)
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO)
    total = asyncio.run(ingest_guidelines(args.dir))
    print(f"Ingested {total} chunk(s)")


if __name__ == "__main__":
    main()
