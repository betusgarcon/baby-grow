#!/usr/bin/env python3
"""Verify the guideline RAG ingest end to end.

Checks the converted Markdown, the database rows it produced, and live
retrieval, then prints a PASS/FAIL report and exits non-zero if anything
failed. Run it after `ingest_guidelines`; it needs no human judgement.

Usage
    python scripts/verify_guidelines.py
    python scripts/verify_guidelines.py --json data/_work/verify/report.json

Lifespan:
    Stable tooling. Add a smoke query to `RETRIEVAL_CASES` per source.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from rag_paths import app_root, guidelines_dir, work_dir  # noqa: E402

sys.path.insert(0, str(app_root() / "src"))

from app.knowledge.ingest_guidelines import (  # noqa: E402
    CHUNK_TARGET_CHARS,
    _parse_front_matter,
    build_chunks,
)
from app.models import get_session_factory  # noqa: E402
from app.services.retrieval import RetrievalService  # noqa: E402

HEADING_RE = re.compile(r"^(#{1,6})\s+(.*)$")
PIPE_ROW_RE = re.compile(r"^\|.*\|$")

# Recipe/guide chunks that existed before this pipeline ran. A change here
# means the new loader touched data it was never supposed to own.
BASELINE_NON_GUIDELINE_CHUNKS = 146

REQUIRED_METADATA = {
    "source",
    "doc_type",
    "title",
    "title_path",
    "block_type",
    "population",
    "age_min_month",
    "age_max_month",
}

EMBEDDING_DIM = 1024


@dataclass
class Check:
    name: str
    passed: bool
    detail: str = ""


@dataclass
class Report:
    checks: list[Check] = field(default_factory=list)
    stats: dict = field(default_factory=dict)

    def check(self, name: str, passed: bool, detail: str = "") -> None:
        self.checks.append(Check(name, passed, detail))

    @property
    def failures(self) -> list[Check]:
        return [c for c in self.checks if not c.passed]


# --------------------------------------------------------------- markdown


def check_markdown(report: Report) -> dict[str, int]:
    """Validate the converted Markdown and return the expected chunk count per source."""
    files = sorted(guidelines_dir().rglob("*.md"))
    report.check("markdown.files", bool(files), f"{len(files)} file(s) under data/guidelines")

    expected: dict[str, int] = {}
    missing_keys: list[str] = []
    bad_headings: list[str] = []
    bad_tables: list[str] = []

    for path in files:
        content = path.read_text(encoding="utf-8")
        front, body = _parse_front_matter(content)
        rel = f"{path.parent.name}/{path.name}"

        for key in ("source", "doc_type", "population"):
            if not front.get(key):
                missing_keys.append(f"{rel}:{key}")

        headings = [HEADING_RE.match(line) for line in body.splitlines()]
        headings = [m for m in headings if m]
        levels = [len(m.group(1)) for m in headings]
        if not levels or levels[0] != 1:
            bad_headings.append(f"{rel}: does not start at '# '")
        elif any(levels[i + 1] > levels[i] + 1 for i in range(len(levels) - 1)):
            bad_headings.append(f"{rel}: skips a heading level")

        expected[rel] = len(build_chunks(front, body))
        bad_tables += _bad_tables(rel, body)

    report.check("markdown.front_matter", not missing_keys, ", ".join(missing_keys[:5]) or "all keys present")
    report.check("markdown.heading_tree", not bad_headings, ", ".join(bad_headings[:5]) or f"{len(files)} trees valid")
    report.check("markdown.tables", not bad_tables, ", ".join(bad_tables[:5]) or "every pipe table is well formed")
    return expected


def _bad_tables(rel: str, body: str) -> list[str]:
    """Report pipe tables whose rows do not all have the same column count."""
    problems: list[str] = []
    block: list[str] = []

    def flush() -> None:
        if len(block) < 2:
            return
        widths = {row.count("|") for row in block}
        if len(widths) != 1:
            problems.append(f"{rel}: table with {sorted(widths)} pipe counts")
        if not any("---" in row for row in block):
            problems.append(f"{rel}: table without a separator row")

    for line in body.splitlines() + [""]:
        if PIPE_ROW_RE.match(line.strip()):
            block.append(line.strip())
        else:
            flush()
            block = []
    return problems


# --------------------------------------------------------------- database


def check_database(report: Report, expected: dict[str, int]) -> list[dict]:
    """Validate the guideline rows and return them for the retrieval checks."""
    session = get_session_factory()()

    rows = session.execute(
        _text(
            """
            select d.source, count(c.id) as chunks,
                   count(c.embedding) as with_vector,
                   count(c.search_vector) as with_tsvector
            from knowledge_documents d
            join knowledge_chunks c on c.document_id = d.id
            where d.doc_type = 'guideline' and d.source like 'guidelines/%'
            group by d.source
            """
        )
    ).all()
    counts = {row[0].replace("guidelines/", ""): row[1] for row in rows}

    missing = [src for src in expected if src not in counts]
    report.check("db.every_file_ingested", not missing, ", ".join(missing[:5]) or f"{len(counts)} source(s) present")

    wrong = [
        f"{src}: expected {expected[src]}, stored {counts[src]}"
        for src in expected
        if src in counts and counts[src] != expected[src]
    ]
    report.check("db.chunk_counts_match_files", not wrong, ", ".join(wrong[:5]) or "every file matches its chunk count")

    without_vector = [row[0] for row in rows if row[2] != row[1]]
    without_tsvector = [row[0] for row in rows if row[3] != row[1]]
    report.check("db.every_chunk_embedded", not without_vector, ", ".join(without_vector[:5]) or "no NULL embeddings")
    report.check("db.every_chunk_indexed", not without_tsvector, ", ".join(without_tsvector[:5]) or "no NULL tsvectors")

    dims = session.execute(
        _text("select distinct vector_dims(embedding) from knowledge_chunks where embedding is not null")
    ).scalars().all()
    report.check("db.embedding_dim", dims == [EMBEDDING_DIM], f"dims={dims}")

    total = session.execute(_text("select count(*) from knowledge_chunks")).scalar()
    non_guideline = session.execute(
        _text(
            """
            select count(*) from knowledge_chunks c
            join knowledge_documents d on d.id = c.document_id
            where d.source not like 'guidelines/%'
            """
        )
    ).scalar()
    report.check(
        "db.no_regression_on_existing_chunks",
        non_guideline == BASELINE_NON_GUIDELINE_CHUNKS,
        f"non-guideline chunks={non_guideline}, baseline={BASELINE_NON_GUIDELINE_CHUNKS}",
    )

    metadata = _check_metadata(report, session)
    report.stats.update(
        {
            "guideline_sources": len(counts),
            "guideline_chunks": sum(counts.values()),
            "total_chunks": total,
            "non_guideline_chunks": non_guideline,
            "embedding_dims": dims,
        }
    )
    session.close()
    return metadata


def _check_metadata(report: Report, session) -> list[dict]:
    """Check chunk metadata completeness and shape; returns the chunk rows."""
    chunks = session.execute(
        _text(
            """
            select d.source, c.chunk_no, c.content, c.chunk_metadata
            from knowledge_chunks c
            join knowledge_documents d on d.id = c.document_id
            where d.source like 'guidelines/%'
            order by d.source, c.chunk_no
            """
        )
    ).all()

    untyped: list[str] = []
    unfilled: list[str] = []
    populated: list[str] = []
    straddling: list[str] = []
    oversized: list[str] = []
    breadcrumbs: list[str] = []

    for source, chunk_no, content, meta in chunks:
        meta = meta or {}
        where = f"{source}#{chunk_no}"

        if meta.get("block_type") not in ("text", "table"):
            untyped.append(where)

        keys = REQUIRED_METADATA - set(meta)
        if keys:
            unfilled.append(f"{where}: {sorted(keys)}")
            continue

        if not meta["population"]:
            populated.append(where)
        if int(meta["age_min_month"]) > int(meta["age_max_month"]):
            straddling.append(where)
        if len(content) > CHUNK_TARGET_CHARS * 2:
            oversized.append(where)
        if not content.startswith("【"):
            breadcrumbs.append(where)

    report.check("chunk.block_type", not untyped, ", ".join(untyped[:5]) or "every chunk is text or table")
    report.check("chunk.metadata_complete", not unfilled, "; ".join(unfilled[:3]) or f"{len(chunks)} chunks complete")
    report.check("chunk.population_set", not populated, ", ".join(populated[:5]) or "every chunk declares a population")
    report.check("chunk.age_range_valid", not straddling, ", ".join(straddling[:5]) or "min <= max everywhere")
    report.check("chunk.size_bounded", not oversized, ", ".join(oversized[:5]) or f"all <= {CHUNK_TARGET_CHARS * 2} chars")
    report.check("chunk.breadcrumb", not breadcrumbs, ", ".join(breadcrumbs[:5]) or "every chunk carries a breadcrumb")

    table_chunks = sum(1 for *_, meta in chunks if (meta or {}).get("block_type") == "table")
    report.stats["table_chunks"] = table_chunks
    return [{"source": c[0], "chunk_no": c[1], "content": c[2], "metadata": c[3]} for c in chunks]


# -------------------------------------------------------------- retrieval


@dataclass
class RetrievalCase:
    """A query whose answer must come from a known source."""

    name: str
    query: str
    age_months: int
    population: str
    expected_source: str | None
    # When set, no result may come from this source (population isolation).
    forbidden_source: str | None = None


RETRIEVAL_CASES = [
    RetrievalCase(
        name="complementary_feeding",
        query="婴儿满6个月添加辅食的时间和方法",
        age_months=8,
        population="baby",
        expected_source="婴幼儿辅食添加营养指南",
    ),
    RetrievalCase(
        name="postpartum_diet",
        query="产褥期妇女每天的能量和蛋白质推荐摄入量",
        age_months=0,
        population="postpartum",
        expected_source="产褥期妇女膳食指导",
    ),
    RetrievalCase(
        name="cuiyutao_natural_parenting",
        query="自然养育的核心理念是什么",
        age_months=12,
        population="baby",
        expected_source="崔玉涛自然养育法",
    ),
    RetrievalCase(
        name="population_isolation",
        query="产褥期妇女每天的能量推荐摄入量是多少",
        age_months=0,
        population="baby",
        expected_source=None,
        forbidden_source="产褥期妇女膳食指导",
    ),
]


async def check_retrieval(report: Report) -> list[dict]:
    """Run smoke queries and verify each one finds the source it is about."""
    service = RetrievalService(db=get_session_factory()())
    outcomes: list[dict] = []

    for case in RETRIEVAL_CASES:
        results = await service.retrieve(
            case.query,
            baby_age_months=case.age_months,
            top_k=5,
            population=case.population,
        )
        sources = [(r["metadata"] or {}).get("source", "") for r in results]

        if case.expected_source:
            passed = case.expected_source in sources
            detail = f"top={sources[:3] or 'no results'}"
        else:
            passed = case.forbidden_source not in sources
            detail = f"sources={sorted(set(sources)) or 'no results'}"

        report.check(f"retrieval.{case.name}", passed, detail)
        outcomes.append(
            {
                "case": case.name,
                "query": case.query,
                "population": case.population,
                "age_months": case.age_months,
                "passed": passed,
                "sources": sources,
                "top1": results[0]["content"][:160] if results else "",
            }
        )

    report.stats["retrieval"] = outcomes
    return outcomes


async def run(json_out: Path | None) -> int:
    report = Report()
    expected = check_markdown(report)
    check_database(report, expected)
    await check_retrieval(report)

    width = max(len(c.name) for c in report.checks)
    for check in report.checks:
        mark = "PASS" if check.passed else "FAIL"
        print(f"[{mark}] {check.name.ljust(width)}  {check.detail}")

    print()
    print(json.dumps(report.stats, ensure_ascii=False, indent=2))
    print()
    print(f"{len(report.checks) - len(report.failures)}/{len(report.checks)} checks passed")

    if json_out:
        json_out.parent.mkdir(parents=True, exist_ok=True)
        json_out.write_text(
            json.dumps(
                {
                    "passed": not report.failures,
                    "checks": [vars(c) for c in report.checks],
                    "stats": report.stats,
                },
                ensure_ascii=False,
                indent=2,
            ),
            encoding="utf-8",
        )

    return 1 if report.failures else 0


def _text(sql: str):
    from sqlalchemy import text

    return text(sql)


def main() -> int:
    parser = argparse.ArgumentParser(description="Verify the guideline RAG ingest")
    parser.add_argument("--json", type=Path, default=work_dir() / "verify" / "report.json")
    args = parser.parse_args()
    return asyncio.run(run(args.json))


if __name__ == "__main__":
    raise SystemExit(main())
