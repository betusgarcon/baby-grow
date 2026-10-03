#!/usr/bin/env python3
"""Stage 1: text-layer PDF -> clean, reflowed blocks (JSONL).

Pipeline
    pdftotext -layout (text, indentation preserved)
    pdfplumber        (ruled tables, exact cell grid)
      -> split pages on form feed
      -> drop running headers / footers / watermarks / page numbers
      -> reflow hard-wrapped CJK lines into paragraphs
      -> emit one JSONL record per block:
         {"page_start", "page_end", "kind", "text"}

Tables come from two sources, in this order of trust:

1. ``pdfplumber`` reads the ruling lines the PDF draws, so its cell grid is
   exact even when a cell wraps onto several lines. This is the normal path.
2. Where a table has no ruling lines, the *spacing* between cells in the
   ``-layout`` text is the only signal left. That fallback recovers simple
   tables but misplaces the values of any table whose cells wrap.

Only PDFs that already contain a text layer are supported. A scanned PDF must
be OCR'd first; see docs/rag-pdf-vectorization-plan.md for that path.

Usage
    python scripts/pdf_extract.py --pdf <path.pdf> --out data/_work/extract/<slug>.jsonl

Lifespan:
    Stable tooling. Tune `--boilerplate-ratio` / `--extra-noise` for new sources.
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from collections import Counter
from dataclasses import dataclass, field
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from rag_paths import work_dir  # noqa: E402

# ---------------------------------------------------------------- extraction

# A page number is a short line made only of digits or roman numerals.
PAGE_NUMBER_RE = re.compile(r"^[\s]*(\d{1,4}|[IVXLCivxlc]{1,7})[\s]*$")

# In `-layout` output, table cells are separated by runs of spaces: the only
# signal a text-layer PDF gives us for where its table columns are.
TABLE_GAP_RE = re.compile(r"\s{2,}")

# Table rows are short; long lines are prose that happens to contain spacing.
TABLE_ROW_MAX_LEN = 80

# Dot leaders ("01 什么是自然养育？ ......... 12") are a table of contents, not a table.
LEADER_DOTS_RE = re.compile(r"(?:\.\s*){3,}|…{2,}")

# Two rows is the minimum that can carry a header and at least one data row.
MIN_TABLE_ROWS = 2

# Cells starting within this many columns of each other share a table column.
COLUMN_TOLERANCE = 3

# Full-width space used as a paragraph indent in Chinese typesetting.
INDENT_CHARS = " 　\t"

# Characters that terminate a sentence in Chinese/English prose.
SENTENCE_END = "。！？!?…\"'”’）)]】"


def run_pdftotext(pdf: Path, *, layout: bool = False, first: int | None = None, last: int | None = None) -> str:
    """Return raw text for `pdf`, one form feed per page boundary."""
    cmd = ["pdftotext", "-enc", "UTF-8"]
    if layout:
        cmd.append("-layout")
    if first is not None:
        cmd += ["-f", str(first)]
    if last is not None:
        cmd += ["-l", str(last)]
    cmd += [str(pdf), "-"]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        raise RuntimeError(f"pdftotext failed for {pdf}: {proc.stderr.strip()}")
    return proc.stdout


def split_pages(raw: str) -> list[str]:
    """Split pdftotext output into pages.

    pdftotext separates pages with a form feed; the trailing one is a
    terminator rather than a new page, so it is dropped.
    """
    pages = raw.split("\f")
    if pages and not pages[-1].strip():
        pages.pop()
    return pages


# ------------------------------------------------------------ noise removal


def detect_boilerplate(
    pages: list[str],
    *,
    min_ratio: float = 0.25,
    max_len: int = 45,
    min_pages: int = 4,
) -> set[str]:
    """Find lines repeated across many pages (running headers, footers, watermarks).

    A line qualifies when it is short, appears on a large fraction of pages, and
    the document is long enough for that fraction to be meaningful. Content
    lines that repeat occasionally (e.g. "干货总结") fall below the threshold and
    are kept.
    """
    if len(pages) < min_pages:
        return set()

    counts: dict[str, int] = {}
    for page in pages:
        seen = set()
        for line in page.splitlines():
            stripped = line.strip()
            if not stripped or len(stripped) > max_len:
                continue
            if stripped in seen:
                continue
            seen.add(stripped)
            counts[stripped] = counts.get(stripped, 0) + 1

    threshold = max(min_pages, int(len(pages) * min_ratio))
    return {line for line, n in counts.items() if n >= threshold}


def indent_width(line: str) -> int:
    """Return the visual indent of `line`, counting a full-width space as two."""
    width = 0
    for ch in line:
        if ch == "　":
            width += 2
        elif ch in " \t":
            width += 1
        else:
            break
    return width


# ------------------------------------------------------------------- tables


@dataclass
class TableRegion:
    """A ruled table found by pdfplumber, and the page lines it covers."""

    markdown: str
    # Whitespace-stripped text of the lines inside the table's bounding box,
    # matched against the `-layout` text to know which lines it replaces.
    lines: Counter = field(default_factory=Counter)
    emitted: bool = False


def pdfplumber_available() -> bool:
    try:
        import pdfplumber  # noqa: F401
    except ImportError:
        return False
    return True


def _normalize(text: str) -> str:
    return re.sub(r"\s+", "", text)


def recover_tables(pdf: Path) -> dict[int, list[TableRegion]]:
    """Return ``{page_number: [TableRegion, ...]}`` for the PDF's ruled tables.

    Reads the lines the PDF actually draws rather than inferring cells from
    spacing, which is the only way to get a table right when a cell wraps.
    Returns an empty mapping when pdfplumber is not installed, in which case
    the spacing-based fallback is all that is available.
    """
    if not pdfplumber_available():
        return {}

    import logging

    import pdfplumber

    # pdfminer reports unparseable font descriptors on stderr for some scans;
    # the text still extracts correctly, so the noise is suppressed.
    logging.getLogger("pdfminer").setLevel(logging.ERROR)

    regions: dict[int, list[TableRegion]] = {}
    with pdfplumber.open(pdf) as doc:
        for page_no, page in enumerate(doc.pages, start=1):
            found: list[TableRegion] = []
            for table in page.find_tables():
                grid = _clean_grid(table.extract())
                if not _is_real_table(grid):
                    continue
                inside = page.crop(table.bbox).extract_text_lines()
                found.append(
                    TableRegion(
                        markdown=render_grid(grid),
                        lines=Counter(_normalize(line["text"]) for line in inside),
                    )
                )
            if found:
                regions[page_no] = found
    return regions


def _clean_grid(grid: list[list[str | None]]) -> list[list[str]]:
    """Drop the None cells and flatten wrapped cells onto one line."""
    return [[(cell or "").replace("\n", " ").strip() for cell in row] for row in grid]


def _is_real_table(grid: list[list[str]]) -> bool:
    """Reject the framed single-column boxes these standards draw for titles.

    A real table has a header and at least one data row, and more than one
    column carrying text. "附录 B / （资料性附录）" is a title in a box.
    """
    if len(grid) < MIN_TABLE_ROWS or len(grid[0]) < 2:
        return False
    return any(cell for row in grid[1:] for cell in row[1:])


def render_grid(grid: list[list[str]]) -> str:
    """Render a cell grid as a Markdown pipe table; the first row is the header."""
    width = max(len(row) for row in grid)
    rows = [row + [""] * (width - len(row)) for row in grid]

    def escape(cell: str) -> str:
        return cell.replace("|", "\\|")

    lines = [
        "| " + " | ".join(escape(c) for c in rows[0]) + " |",
        "|" + "|".join([" --- "] * width) + "|",
    ]
    lines += ["| " + " | ".join(escape(c) for c in row) + " |" for row in rows[1:]]
    return "\n".join(lines)


def is_table_row(line: str) -> bool:
    """True when `line` looks like one row of a table with no ruling lines.

    Leading indentation is stripped first: an indented prose line is not a row,
    and its indent would otherwise read as an inter-column gap. A row is short
    and has at least two cells; a table-of-contents line has the same shape but
    is excluded by its dot leaders.
    """
    stripped = line.strip()
    if not stripped or len(stripped) > TABLE_ROW_MAX_LEN:
        return False
    if LEADER_DOTS_RE.search(stripped):
        return False
    return len(TABLE_GAP_RE.split(stripped)) >= 2


def split_cells(line: str) -> list[tuple[int, str]]:
    """Return `(column, text)` for each cell of a table row.

    A cell is a run of tokens joined by single spaces; columns are separated by
    runs of two or more, so "9614 kJ/d (2300 kcal/d)" stays one cell.
    """
    return [(m.start(), m.group()) for m in re.finditer(r"\S+(?: \S+)*", line)]


def _column_anchors(rows: list[list[tuple[int, str]]]) -> list[int]:
    """Cluster the column positions seen across `rows` into table columns.

    Anchors that no data row ever writes to are dropped: a centred header sits
    between the columns it spans rather than on one ("哺乳状态 / 能量推荐量"
    over left-aligned values), and would otherwise become a phantom column that
    pushes every heading one cell to the right.
    """
    starts = sorted({col for row in rows for col, _ in row})
    anchors: list[int] = []
    for start in starts:
        if anchors and start - anchors[-1] <= COLUMN_TOLERANCE:
            continue
        anchors.append(start)

    used = {col for row in rows[1:] for col, _ in row}
    kept = [a for a in anchors if any(abs(a - col) <= COLUMN_TOLERANCE for col in used)]
    return kept or anchors


def render_table(rows: list[str]) -> str:
    """Render spacing-separated rows as a Markdown pipe table.

    The fallback for tables with no ruling lines. Cells are placed by the
    column they start in, so a row that leaves a cell empty keeps its values
    under the right headings.
    """
    cells = [split_cells(row) for row in rows]
    anchors = _column_anchors(cells)

    grid = [[""] * len(anchors) for _ in rows]
    for i, row in enumerate(cells):
        for col, text in row:
            idx = min(range(len(anchors)), key=lambda j: abs(anchors[j] - col))
            grid[i][idx] = f"{grid[i][idx]} {text}".strip()
    return render_grid(grid)



# ---------------------------------------------------------------- reflowing


@dataclass
class Block:
    """A reflowed paragraph or table with the page range it spans."""

    text: str
    page_start: int
    page_end: int
    kind: str = "para"


def reflow_blocks(
    pages: list[str],
    boilerplate: set[str],
    *,
    first_page: int = 1,
    drop_page_numbers: bool = True,
    indent_threshold: int = 2,
    ruled_tables: dict[int, list[TableRegion]] | None = None,
) -> list[Block]:
    """Turn page text into reflowed paragraph and table blocks.

    A line begins a new paragraph when it is indented (`indent_threshold` or
    more), or when it follows a blank line. Otherwise it is a continuation of
    the current paragraph, which is how hard-wrapped CJK prose is reassembled.

    Removed lines (boilerplate, page numbers, page breaks) never register as a
    blank separator, so a paragraph broken by a page boundary stays joined.

    Each region in `ruled_tables` replaces the lines inside its bounding box
    with the table pdfplumber read off the page's ruling lines; a region whose
    lines never match is reported by the caller rather than guessed at. Any
    remaining run of spacing-separated rows becomes a table of its own, unless
    it is shorter than `MIN_TABLE_ROWS`, in which case it falls back to prose.
    """
    ruled_tables = ruled_tables or {}
    blocks: list[Block] = []
    current: list[str] = []
    start_page = first_page
    last_page = first_page
    blank_seen = True  # the document start behaves like a paragraph boundary

    table: list[str] = []
    table_start = first_page
    table_end = first_page

    def flush() -> None:
        if current:
            text = "".join(current).strip()
            if text:
                blocks.append(Block(text=text, page_start=start_page, page_end=last_page))
            current.clear()

    def flush_table() -> None:
        if len(table) >= MIN_TABLE_ROWS:
            blocks.append(
                Block(
                    text=render_table(table),
                    page_start=table_start,
                    page_end=table_end,
                    kind="table",
                )
            )
        else:
            for row in table:
                blocks.append(Block(text=row, page_start=table_start, page_end=table_end))
        table.clear()

    for offset, page in enumerate(pages):
        page_no = first_page + offset
        regions = ruled_tables.get(page_no, [])
        for line in page.splitlines():
            stripped = line.strip()

            if not stripped:
                blank_seen = True
                continue
            if stripped in boilerplate or (drop_page_numbers and PAGE_NUMBER_RE.match(stripped)):
                continue

            region = _match_region(stripped, regions)
            if region is not None:
                flush()
                flush_table()
                if not region.emitted:
                    region.emitted = True
                    blocks.append(
                        Block(text=region.markdown, page_start=page_no, page_end=page_no, kind="table")
                    )
                blank_seen = False
                continue

            if is_table_row(line):
                flush()
                if not table:
                    table_start = page_no
                table_end = page_no
                table.append(stripped)
                blank_seen = False
                continue

            if table:
                flush_table()

            indented = indent_width(line) >= indent_threshold
            if indented or blank_seen or not current:
                flush()
                start_page = page_no
            if not current:
                last_page = page_no
            current.append(_join_piece(current, stripped))
            blank_seen = False

    flush()
    flush_table()
    return blocks


def _match_region(line: str, regions: list[TableRegion]) -> TableRegion | None:
    """Return the ruled table whose bounding box holds `line`, if any."""
    key = _normalize(line)
    for region in regions:
        if region.lines[key] > 0:
            region.lines[key] -= 1
            return region
    return None




def _join_piece(current: list[str], piece: str) -> str:
    """Join `piece` onto the current paragraph, inserting a space only for Latin words."""
    if not current:
        return piece
    prev = current[-1]
    if prev and piece and prev[-1].isascii() and piece[0].isascii():
        if prev[-1].isalnum() and piece[0].isalnum():
            return " " + piece
    return piece


# ---------------------------------------------------------------------- CLI


def extract(
    pdf: Path,
    *,
    first: int | None = None,
    last: int | None = None,
    extra_noise: set[str] | None = None,
    boilerplate_ratio: float = 0.25,
    layout: bool = True,
    use_pdfplumber: bool = True,
) -> tuple[list[Block], dict]:
    """Run the full stage-1 pipeline for one PDF and return blocks plus a report.

    `layout` defaults to True: `-layout` is the only mode that preserves the
    paragraph leading indent these books use as their paragraph boundary, which
    is the signal the reflow step depends on. All sources here are single
    column, so the column-reordering risk of `-layout` does not apply.

    `use_pdfplumber` adds the ruled-table pass. It is on by default because
    spacing alone cannot recover a table whose cells wrap; the report's
    `test_tables_missed` count is the check that it did not silently drop one.
    """
    raw = run_pdftotext(pdf, layout=layout, first=first, last=last)
    pages = split_pages(raw)
    if not any(p.strip() for p in pages):
        raise RuntimeError(
            f"{pdf.name} has no text layer; it must be OCR'd before extraction. "
            "See docs/rag-pdf-vectorization-plan.md."
        )

    boilerplate = detect_boilerplate(pages, min_ratio=boilerplate_ratio)
    boilerplate |= set(extra_noise or ())
    first_page = first or 1

    ruled = recover_tables(pdf) if use_pdfplumber else {}
    if first is not None or last is not None:
        ruled = {
            page: regions
            for page, regions in ruled.items()
            if (first or 1) <= page <= (last or len(ruled))
        }

    blocks = reflow_blocks(
        pages, boilerplate, first_page=first_page, ruled_tables=ruled
    )

    tables = [b for b in blocks if b.kind == "table"]
    recovered = [r for regions in ruled.values() for r in regions if r.emitted]
    missed = [r for regions in ruled.values() for r in regions if not r.emitted]
    report = {
        "pdf": str(pdf),
        "pages": len(pages),
        "first_page": first_page,
        "blocks": len(blocks),
        "tables": len(tables),
        "tables_from_ruling": len(recovered),
        "tables_from_spacing": len(tables) - len(recovered),
        "tables_missed": len(missed),
        "chars": sum(len(b.text) for b in blocks),
        "boilerplate": sorted(boilerplate),
    }
    return blocks, report



def main() -> int:
    parser = argparse.ArgumentParser(description="Extract clean blocks from a text-layer PDF")
    parser.add_argument("--pdf", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True, help="Destination JSONL path")
    parser.add_argument("--first", type=int, default=None, help="First page (1-based)")
    parser.add_argument("--last", type=int, default=None, help="Last page (1-based)")
    parser.add_argument("--boilerplate-ratio", type=float, default=0.25)
    parser.add_argument("--extra-noise", action="append", default=[], help="Extra line to drop (repeatable)")
    parser.add_argument("--no-layout", action="store_true", help="Disable -layout (loses paragraph indents)")
    parser.add_argument(
        "--no-pdfplumber",
        action="store_true",
        help="Skip ruled-table recovery and infer tables from spacing only",
    )
    args = parser.parse_args()

    if not args.pdf.exists():
        parser.error(f"PDF not found: {args.pdf}")

    blocks, report = extract(
        args.pdf,
        first=args.first,
        last=args.last,
        extra_noise=set(args.extra_noise),
        boilerplate_ratio=args.boilerplate_ratio,
        layout=not args.no_layout,
        use_pdfplumber=not args.no_pdfplumber,
    )

    args.out.parent.mkdir(parents=True, exist_ok=True)
    with args.out.open("w", encoding="utf-8") as fh:
        for block in blocks:
            fh.write(
                json.dumps(
                    {
                        "page_start": block.page_start,
                        "page_end": block.page_end,
                        "kind": block.kind,
                        "text": block.text,
                    },
                    ensure_ascii=False,
                )
                + "\n"
            )

    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
