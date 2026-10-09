#!/usr/bin/env python3
"""Stage 1 of the B-tier pipeline: scanned PDF -> per-page block JSONL.

The A-tier sources (`scripts/pdf_extract.py`) carry a text layer, so `pdftotext`
can hand back paragraphs directly. The B-tier sources are pure page images, so
the text has to be recovered by OCR first, and the structure the A-tier sources
get for free (paragraph flow, table grids) has to be reconstructed from the
geometry of the recognised text boxes.

Emits exactly the JSONL shape `pdf_extract.py` does, so stage 2
(`build_guidelines.py`) consumes it unchanged:

    {"page_start", "page_end", "kind", "text"}

Why Vision (macOS) rather than MinerU / PaddleOCR
    Measured on the hardest page in the corpus -- the six-column glycemic index
    table -- Vision reconstructs it exactly, runs at 1-2 s/page, needs no model
    download and keeps the material on this machine. See
    `docs/rag-ocr-b-tier.md` for the comparison.

Five problems shaped this design, all recorded in `docs/rag-ocr-b-tier.md`:

* Vision stops recognising after roughly a dozen lines in one request, and no
  amount of DPI fixes it, so every page is read in overlapping horizontal bands
  and the boxes merged. Without this the bottom third of a dense table is lost.
* That banding reads a line lying across a band boundary twice, and the two
  readings differ because the crop clips the glyphs differently, so the
  duplicates are removed by rectangle overlap rather than by comparing text.
* A wide table read as a text stream detaches numbers from their row labels, so
  tables are rebuilt from box geometry: cluster column centres, then group rows.
* Merging boxes by y alone assumes one column per page, and these books are not
  that simple: one sets a sidebar inside a single-column page, another is all
  two-column recipes, and both would come out interleaved. Columns are found
  from the clear vertical strip between them, and the indent test is then told
  which measure each line belongs to -- a page can carry two stacked.
* OCR bounding boxes carry no font metrics, so they cannot tell a heading from
  body text. Structure is therefore *not* inferred here -- it is recovered in
  stage 2 from the printed table of contents and from the text itself, which is
  what the A-tier books already do.

Paragraphs are cut on indentation, exactly as `pdf_extract.py` cuts them, and
they run across page boundaries: the last paragraph of one page is the first of
the next unless the following page opens a new one.

Usage:
    python scripts/ocr_pages.py --pdf ... --out ... [--first N] [--last N]

Requires `ocrmac` and `pillow`, which live in the OCR virtualenv, not the
service one -- run this script with that interpreter.

Lifespan:
    Stable tooling. Mirrors `pdf_extract.py`; feeds `build_guidelines.py`.
"""

from __future__ import annotations

import argparse
import json
import re
import statistics
import subprocess
import sys
import tempfile
import time
from dataclasses import dataclass, field
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from rag_paths import work_dir  # noqa: E402

# The page is read in overlapping horizontal bands because a single Vision
# request stops recognising once a page carries enough text lines. Measured on
# the glycemic index table: one pass returned 6 of 16 rows at 150 DPI and 14 of
# 16 at 300 DPI, with no further gain at 400 or 600. Two bands recover all 16.
BAND_HEIGHT = 0.55
BAND_OVERLAP = 0.06

# Render resolution. 300 DPI is the plan's figure and is where recognition
# stops improving; below it the dense table rows start dropping out.
DEFAULT_DPI = 300

# A paragraph begins this many character widths in from the column's
# continuation edge (`column_edges`). Chinese typesetting indents body paragraphs by
# two full-width characters, and a full-width glyph is about as wide as it is
# tall, so the indent can be measured without knowing the point size.
# `pdf_extract.py` uses the same rule on the text layer, where the indent is
# literal spaces.
#
# The floor sits under the nominal two, and the exact value is a compromise.
# Measured over the corpus, the largest *non*-indent is 1.54 characters (the
# wraps of a numbered list on sync p100, which align past the marker) and the
# smallest real indent is 1.68 (zhongguo p40). The gap is 0.14 characters, which
# is narrower than Vision's own box-edge jitter on a page of identical margins,
# so the two overlap and a line will land on the wrong side now and then. 1.6 is
# the middle of the gap and errs towards leaving text joined: an indent missed
# welds a heading onto its paragraph, which is untidy but keeps every word,
# whereas a floor set too low shatters wrapped lines into their own chunks.
INDENT_MIN_CHARS = 1.6

# Line starts within this distance are the same position, and this many lines
# have to agree on a position before `column_edges` believes it is a column
# edge. The window only has to absorb Vision's box-edge jitter, which on a page
# of identical left margins measures 0.005 end to end.
EDGE_BIN = 0.006
EDGE_MIN_LINES = 2

# Lines on either side of the line being judged that the edge is measured over.
# Only wide enough to contain the wrapped lines of the paragraph in hand, which
# are always adjacent: at seven lines a short paragraph's continuations are all
# inside the window, and a measure change is far more than seven lines away.
EDGE_WINDOW_LINES = 3

# A vertical gap this many times the page's leading is a blank line, i.e. a
# paragraph break even where the source does not indent. Leading is measured
# per page, never assumed: the same book sets table rows tighter than prose.
BLANK_LINE_LEADING = 1.5

# Margin guards. A box out here is page furniture -- a page number, the running
# title, a vertical watermark -- never body content, so it is dropped. Position
# alone cannot carry that decision: 崔玉涛育儿百科 sets some asides with the
# continuation lines hanging *outside* the body margin, so a line of real text
# starts at x 0.042 against a body margin of 0.088 and an x-only guard deleted
# it. No prose was lost to the old guard on the pages sampled early, which is
# why it went unnoticed until a hanging-indent page was read.
#
# The shapes do separate, measured over the four books: page numbers and the
# running title come back 0.011-0.048 of the page wide and 0.34-0.93 as tall as
# wide, and the one vertical fragment (a sideways "（2022）" cut loose by the
# band split) is 2.94; real lines run 0.09-0.87 wide and at most 0.24 as tall as
# wide. So furniture is what is too narrow to be a line, or what stands on end.
MARGIN_X = 0.06
FOOTER_Y = 0.95
MARGIN_MAX_WIDTH = 0.06
MARGIN_MAX_ASPECT = 0.5

# Two boxes overlapping by this fraction of the smaller one are the same piece
# of text read twice, and the weaker reading is dropped.
DEDUPE_OVERLAP = 0.5

# Pages between progress lines on stderr. Ten pages is roughly half a minute,
# which is often enough to see a run is alive and rarely enough to be noise.
PROGRESS_EVERY = 10

# The sidebar title runs vertically down the outer edge; Vision returns it as
# narrow, tall boxes far to the right of the text column.
SIDEBAR_MIN_X = 0.90
# A vertical strip with no text crossing it for this much of the page height
# separates two independently typeset columns rather than two words.
MIN_COLUMN_HEIGHT = 0.10

# Where a gutter can sit, and how finely it is searched, in page-width fraction.
GUTTER_MIN_X = 0.34
GUTTER_MAX_X = 0.66
GUTTER_STEP = 0.005

# Vertical bin used to ask "is this y blocked at this x".
Y_BIN = 0.01

# A source note printed under a table ("资料来源：…", "注：…"). It credits the
# table above it, so it belongs to that table rather than to the prose below.
TABLE_NOTE_RE = re.compile(r"^(资料来源|数据来源|来源|注释|注)\s*[:：]")

# A cell this long is prose, not a cell. A recipe laid out as two columns has
# rows that look grid-like -- an ingredient beside its quantity beside a method
# step -- but the step wraps a whole sentence into one "cell", which is what
# separates it from a table. Measured: the glyph-index table's longest cell is
# 10 characters, while the recipe's method cells run to 25.
TABLE_CELL_MAX_CHARS = 18

# Percentile of line heights used to guess the body font size. Prose sets
# larger than table cells, and a table-heavy page has more cells than prose
# lines, so the median would follow the table -- the upper quartile does not.
BODY_HEIGHT_PERCENTILE = 0.75


@dataclass
class Box:
    """One recognised text box, in normalized page coordinates with top-left origin."""

    text: str
    x: float
    y: float
    w: float
    h: float
    confidence: float

    @property
    def centre_x(self) -> float:
        return self.x + self.w / 2


@dataclass
class Line:
    """A visual line: boxes sharing a baseline, ordered left to right."""

    boxes: list[Box] = field(default_factory=list)
    page: int = 0

    @property
    def text(self) -> str:
        return " ".join(b.text for b in self.boxes if b.text)

    @property
    def y(self) -> float:
        return min(b.y for b in self.boxes)

    @property
    def x(self) -> float:
        return min(b.x for b in self.boxes)

    @property
    def height(self) -> float:
        return statistics.median(b.h for b in self.boxes)


# --------------------------------------------------------------- rendering


def render_page(pdf: Path, page: int, dpi: int, dest_dir: Path) -> Path:
    """Rasterize one PDF page to PNG and return its path."""
    prefix = dest_dir / f"page-{page:04d}"
    subprocess.run(
        ["pdftoppm", "-f", str(page), "-l", str(page), "-r", str(dpi), "-png", str(pdf), str(prefix)],
        check=True,
        capture_output=True,
    )
    matches = sorted(dest_dir.glob(f"page-{page:04d}*.png"))
    if not matches:
        raise RuntimeError(f"pdftoppm produced no image for page {page}")
    return matches[0]


# -------------------------------------------------------------------- OCR


def _recognise(path: Path, top: float, bottom: float) -> list[Box]:
    """Vision's boxes for one band of an image, mapped onto the whole page."""
    from ocrmac import ocrmac

    found: list[Box] = []
    for text, confidence, box in ocrmac.OCR(
        str(path), language_preference=["zh-Hans", "en-US"], recognition_level="accurate"
    ).recognize():
        x, y, w, h = box
        found.append(
            Box(
                text=text.strip(),
                x=float(x),
                # Vision's origin is bottom-left; flip so larger y is lower,
                # then map the band-local y onto the full page.
                y=(1.0 - float(y) - float(h)) * (bottom - top) + top,
                w=float(w),
                h=float(h) * (bottom - top),
                confidence=float(confidence),
            )
        )
    return found


def ocr_boxes(image: Path) -> list[Box]:
    """Recognise a page in overlapping bands and whole; merge, bands winning.

    The whole page is read as well as the bands because the two fail in
    opposite directions, and each covers the other's failure:

    * On a dense page Vision stops reading part way down, losing everything
      below -- which is what the bands are for (P3).
    * On a *cropped* image Vision can skip lines in the middle of a paragraph
      that it reads without trouble from the whole page (P21). That is what the
      whole-page read is for.

    The bands stay authoritative and the whole-page read is admitted only where
    the bands saw nothing, because Vision is also *less* accurate on the whole
    page exactly where the bands earn their keep. On page 368 of the dietary
    guidelines -- the BMI grid of 附录六 -- the whole-page read returns rows with
    runs of columns duplicated and others torn apart, and letting those boxes
    win costs 49 characters of a numeric grid; on prose pages it repairs the
    odd misrecognised character instead. Deferring to the bands therefore keeps
    the grid intact and the recovered lines, and forgoes only those character
    repairs, which are the ordinary homoglyph problem (P8) rather than a
    coverage problem.
    """
    from PIL import Image

    src = Image.open(image)
    width, height = src.size

    banded: list[Box] = []
    top = 0.0
    while True:
        bottom = min(top + BAND_HEIGHT, 1.0)
        crop_path = image.with_name(f"{image.stem}-band{int(top * 100):03d}.png")
        src.crop((0, int(top * height), width, int(bottom * height))).save(crop_path)
        banded.extend(_recognise(crop_path, top, bottom))
        crop_path.unlink(missing_ok=True)
        if bottom >= 1.0:
            break
        top = bottom - BAND_OVERLAP

    return _dedupe(_recognise(image, 0.0, 1.0), seed=_dedupe(banded))


def _overlap_ratio(a: Box, b: Box) -> float:
    """Intersection area as a fraction of the smaller box's area."""
    ix = max(0.0, min(a.x + a.w, b.x + b.w) - max(a.x, b.x))
    iy = max(0.0, min(a.y + a.h, b.y + b.h) - max(a.y, b.y))
    smaller = min(a.w * a.h, b.w * b.h)
    if smaller <= 0:
        return 0.0
    return (ix * iy) / smaller


def _dedupe(boxes: list[Box], seed: list[Box] | None = None) -> list[Box]:
    """Drop boxes the band overlap produced twice.

    Deduplication has to be geometric, not textual. A line lying across a band
    boundary is recognised once per band, and the crop clips it differently each
    time, so the two readings of the *same* line come back with different text
    ("占60%~80%" against "占 60%~80%") and a plain text comparison keeps both.
    Overlapping rectangles are the reliable signal that they are one line.

    Boxes are visited strongest-first, so the copy that survives is the one
    Vision was most confident about, and the longer reading when confidence
    ties -- a clipped reading is always the shorter one.

    `seed` boxes are kept unconditionally and win every overlap against
    `boxes`, which is how a second reading of the page is admitted only where
    the first one saw nothing (see `ocr_boxes`).
    """
    kept: list[Box] = list(seed or [])
    for box in sorted(boxes, key=lambda b: (-b.confidence, -len(b.text))):
        if not box.text:
            continue
        for other in kept:
            if _overlap_ratio(box, other) >= DEDUPE_OVERLAP:
                break
        else:
            kept.append(box)
    return kept


# ------------------------------------------------------- layout analysis


def _is_furniture(box: Box) -> bool:
    """Whether a box sitting in the outer margin is furniture rather than text.

    Judged on shape, since real lines reach into the margin on the books that
    hang their aside continuations outward. A page number is too narrow to be a
    line, and a vertical title fragment is taller than it is wide; body text is
    never either. See `MARGIN_MAX_WIDTH`.
    """
    return box.w < MARGIN_MAX_WIDTH or box.h / box.w > MARGIN_MAX_ASPECT


def drop_marginalia(boxes: list[Box]) -> list[Box]:
    """Remove the running title, footer, page number and sidebar.

    These carry words the book repeats on every page -- or, for a vertical
    watermark, a fragment of the title cut loose from its line -- so leaving
    them in would scatter the running title through hundreds of chunks.

    The footer band is dropped whole, on position alone. Matching its *content*
    was the earlier mistake: the band holds the running title more often than a
    bare page number, and Vision returns "72 -崔玉涛育儿百科" as a single box, so
    a digits-only test let every footer through. Measured on 崔玉涛育儿百科 the
    band sits at y 0.9545-0.9816 while the deepest body line ends at 0.8904, so
    the position is unambiguous.

    The margin guards, by contrast, ask what the box *looks like*, because a
    page number and a hanging body line share the same x.
    """
    kept = []
    for box in boxes:
        if box.y + box.h / 2 > FOOTER_Y:
            continue
        if (box.x < MARGIN_X or box.x > SIDEBAR_MIN_X) and _is_furniture(box):
            continue
        kept.append(box)
    return kept


def to_lines(boxes: list[Box], page: int, tolerance: float = 0.006) -> list[Line]:
    """Group boxes into visual lines by vertical proximity."""
    lines: list[Line] = []
    for box in sorted(boxes, key=lambda b: (b.y, b.x)):
        if lines and abs(box.y - lines[-1].boxes[0].y) <= tolerance:
            lines[-1].boxes.append(box)
        else:
            lines.append(Line(boxes=[box], page=page))
    for line in lines:
        line.boxes.sort(key=lambda b: b.x)
    return lines


def _clear_runs(boxes: list[Box], g: float, y_min: float, y_max: float) -> list[tuple[float, float]]:
    """Return the y-ranges over which no box crosses `g`."""
    count = max(1, int((y_max - y_min) / Y_BIN) + 1)
    blocked = bytearray(count)
    for box in boxes:
        if box.x < g < box.x + box.w:
            lo = max(0, int((box.y - y_min) / Y_BIN))
            hi = min(count - 1, int((box.y + box.h - y_min) / Y_BIN))
            for i in range(lo, hi + 1):
                blocked[i] = 1

    runs: list[tuple[float, float]] = []
    start: int | None = None
    for i in range(count + 1):
        clear = i < count and not blocked[i]
        if clear and start is None:
            start = i
        elif not clear and start is not None:
            if (i - start) * Y_BIN >= MIN_COLUMN_HEIGHT:
                runs.append((y_min + start * Y_BIN, y_min + i * Y_BIN))
            start = None
    return runs


def find_columns(boxes: list[Box]) -> tuple[float, float, float] | None:
    """Locate the largest two-column region, as (gutter_x, y_start, y_end).

    Body text spanning the full measure crosses every candidate gutter and
    blocks it, so a two-column block set inside a single-column page -- or a
    whole two-column page -- shows up as a stretch no box crosses. The stretch
    is only believed when both sides carry text; table rows are left out by the
    caller, because a table also has a clear gutter and splitting it would tear
    its rows apart.
    """
    if len(boxes) < 4:
        return None
    y_min = min(b.y for b in boxes)
    y_max = max(b.y + b.h for b in boxes)
    if y_max - y_min < MIN_COLUMN_HEIGHT:
        return None

    best: tuple[float, float, float, float] | None = None
    for i in range(int((GUTTER_MAX_X - GUTTER_MIN_X) / GUTTER_STEP) + 1):
        g = GUTTER_MIN_X + i * GUTTER_STEP
        for y0, y1 in _clear_runs(boxes, g, y_min, y_max):
            side = [b for b in boxes if b.y + b.h > y0 and b.y < y1]
            left = [b for b in side if b.centre_x < g]
            right = [b for b in side if b.centre_x > g]
            if len(left) < 2 or len(right) < 2:
                continue
            if best is None or (y1 - y0) > best[0]:
                best = (y1 - y0, g, y0, y1)

    if best is None:
        return None
    return best[1], best[2], best[3]


def order_page(boxes: list[Box], page: int, skip: set[int] | None = None) -> list[list[Line]]:
    """Group boxes into lines in reading order, splitting two-column regions.

    `to_lines` merges by y alone, which is right for a single column and wrong
    for two: side-by-side columns share baselines, so their lines get welded
    together into sentences neither column wrote. Each detected two-column
    region is re-grouped per side, the left column read to its end before the
    right one begins, and the parts above and below are ordered the same way --
    a page can carry several such blocks, as a page of recipes does.

    One list is returned per column run, not one flat list: each run has its own
    flush-left margin, and the caller's paragraph rule needs to know which run a
    line belongs to. A single-column page returns one list.

    `skip` holds the boxes already claimed by a table, which must not be
    re-ordered.
    """
    skip = skip or set()
    free = [b for b in boxes if id(b) not in skip]
    region = find_columns(free)
    if region is None:
        lines = to_lines(boxes, page)
        return [lines] if lines else []

    gutter, y0, y1 = region
    above, inside, below = [], [], []
    for box in boxes:
        centre = box.y + box.h / 2
        (above if centre < y0 else below if centre > y1 else inside).append(box)

    left, right = [], []
    for box in inside:
        # Both conditions are invariants, not guesses. A box crossing the gutter
        # cannot sit in a stretch `_clear_runs` found no box crossing; and a
        # table row was excluded from the analysis, so a row reaching `inside`
        # would be torn apart by the split. Either way, leaving the page whole
        # is the safe answer.
        if id(box) in skip or box.x < gutter < box.x + box.w:
            lines = to_lines(boxes, page)
            return [lines] if lines else []
        (left if box.centre_x < gutter else right).append(box)

    groups = order_page(above, page, skip)
    for side in (left, right):
        lines = to_lines(side, page)
        if lines:
            groups.append(lines)
    groups.extend(order_page(below, page, skip))
    return groups


def _percentile(values: list[float], fraction: float) -> float:
    ordered = sorted(values)
    index = min(len(ordered) - 1, max(0, int(len(ordered) * fraction)))
    return ordered[index]


def column_edges(group: list[Line]) -> dict[int, float]:
    """Map every line in a column run to the edge its indentation is judged by.

    The edge is where the *continuation* lines of the nearby paragraphs start,
    which is not the page's leftmost ink and not the group's average start. The
    corpus indents three different ways and only the continuation edge is common
    to all three:

    * the usual one, the first line set in two characters from the margin;
    * an aside whose wrapped lines hang *outside* the margin -- cuiyutao p97
      sets its first lines at x 0.088 and their continuations at 0.042;
    * a numbered list, where the wrap aligns past the marker rather than under
      it -- sync p100 sets "1." at 0.4215 and its wraps at 0.4491.

    Taking one edge for the whole page fails on the first style and on the
    second alike. One edge for the whole *group* fails where a page carries two
    measures: cuiyutao p99 sets its top half 0.63 of the page wide with a flush
    left of 0.1208 and its bottom half full measure from 0.0581, so a single
    edge left the whole top half reading as indented. The edge is therefore
    measured over a window of neighbouring lines, which is how far a measure
    holds: a wrapped line is always adjacent to the lines it continues.

    Within the window, the edge is the lowest position that more than one line
    shares, so a section name standing alone in the margin is passed over --
    cuiyutao p99 sets one at 0.0785, and believing it made the paragraph end
    that follows look like a new paragraph. No position is shared on a page of
    one-line paragraphs, where there is nothing to measure either way; there the
    window's leftmost line is the least bad guess, since jitter alone is a
    quarter of a character and cannot reach the indent threshold.

    Lines inside a table are left out: a table's cells start at every column
    centre, which would drag the edge off the margin.
    """
    prose = [line for line in group if not _looks_tabular(line)] or group
    ordered = sorted(prose, key=lambda line: line.y)
    edges: dict[int, float] = {}
    for line in group:
        centre = min(range(len(ordered)), key=lambda i: abs(ordered[i].y - line.y))
        lo, hi = max(0, centre - EDGE_WINDOW_LINES), centre + EDGE_WINDOW_LINES + 1
        edges[id(line)] = _edge_position(ordered[lo:hi])
    return edges


def _edge_position(window: list[Line]) -> float:
    """The lowest line start in `window` that two lines share, else the lowest."""
    xs = sorted(line.x for line in window if line.text.strip())
    if not xs:
        return 0.0
    for index, x in enumerate(xs):
        if sum(1 for other in xs[index:] if other - x <= EDGE_BIN) >= EDGE_MIN_LINES:
            return x
    return xs[0]


def body_height(lines: list[Line]) -> float:
    """Guess the body font size, as a full-width glyph's height on the page."""
    heights = [ln.height for ln in lines if ln.text.strip()]
    return _percentile(heights, BODY_HEIGHT_PERCENTILE) if heights else 0.0


def leading(lines: list[Line]) -> float:
    """Median vertical distance between consecutive lines, i.e. the page's leading."""
    ys = sorted(ln.y for ln in lines if ln.text.strip())
    if len(ys) < 2:
        return 0.0
    return statistics.median(b - a for a, b in zip(ys, ys[1:]))


def starts_paragraph(line: Line, previous: Line | None, left: float, body: float, lead: float) -> bool:
    """True when `line` opens a new paragraph rather than continuing `previous`.

    Indentation is the primary signal because typography sets it deliberately;
    a blank line is the fallback for sources that do not indent. Line *height*
    is deliberately not used -- OCR boxes carry no font metrics, and in this
    corpus headings are no taller than the body text they sit above.
    """
    if body > 0 and line.x - left >= INDENT_MIN_CHARS * body:
        return True
    if previous is not None and lead > 0 and line.y - previous.y > BLANK_LINE_LEADING * lead:
        return True
    return False


# ----------------------------------------------------------------- tables


def render_table(region: list[Line]) -> str:
    """Rebuild a table from its lines by clustering boxes into columns.

    The wide tables pack several independent groups side by side, so a text
    stream would interleave them. Box centres cluster cleanly by column, which
    is what lets the numbers stay with their labels.
    """
    boxes = [b for line in region for b in line.boxes]
    if len(boxes) < 6:
        return ""

    centres = sorted(b.centre_x for b in boxes)
    columns: list[list[float]] = [[centres[0]]]
    for centre in centres[1:]:
        # A gap wider than this starts a new column.
        if centre - columns[-1][-1] > 0.03:
            columns.append([])
        columns[-1].append(centre)
    column_centres = [sum(col) / len(col) for col in columns]
    if len(column_centres) < 2:
        return ""

    rows: list[str] = []
    for line in region:
        cells = [""] * len(column_centres)
        for box in line.boxes:
            index = min(range(len(column_centres)), key=lambda i: abs(column_centres[i] - box.centre_x))
            cells[index] = (cells[index] + " " + box.text).strip()
        if any(cells):
            rows.append("| " + " | ".join(cells) + " |")

    if len(rows) < 2:
        return ""
    header = "| " + " | ".join(f"c{i + 1}" for i in range(len(column_centres))) + " |"
    divider = "|" + "---|" * len(column_centres)
    return "\n".join([header, divider, *rows])


def _looks_tabular(line: Line) -> bool:
    """True when a line's boxes sit in several separated horizontal clusters.

    Cells must also be short. Two columns of prose share baselines and split
    into clusters just as a table does, so the length of the clusters is what
    tells them apart: a method column wrapping a whole sentence is not a cell.
    """
    if len(line.boxes) < 3:
        return False
    if any(len(box.text) > TABLE_CELL_MAX_CHARS for box in line.boxes):
        return False
    centres = sorted(b.centre_x for b in line.boxes)
    gaps = [b - a for a, b in zip(centres, centres[1:])]
    return sum(1 for gap in gaps if gap > 0.04) >= 2


def _tabular_runs(lines: list[Line]) -> list[list[Line]]:
    """Contiguous runs of tabular lines, kept only when at least two long.

    A single line whose boxes split into clusters is not a table -- a recipe
    row of ingredient, amount and method does exactly that -- so a run of one is
    left in the flow. `_flush_table` requires two rows for the same reason.
    """
    runs: list[list[Line]] = []
    run: list[Line] = []
    for line in lines:
        if _looks_tabular(line):
            run.append(line)
            continue
        if len(run) >= 2:
            runs.append(run)
        run = []
    if len(run) >= 2:
        runs.append(run)
    return runs


def _flush_table(run: list[Line], page: int, report: dict) -> list[Line | dict]:
    """Turn a run of tabular lines into one table block, if it renders."""
    if len(run) < 2:
        return [*run]
    markdown = render_table(run)
    if not markdown:
        return [*run]
    report["table_lines"] += len(run)
    return [
        {
            "kind": "table",
            "text": markdown,
            "page_start": run[0].page,
            "page_end": run[-1].page,
        }
    ]


def _absorb_table_notes(items: list[Line | dict]) -> list[Line | dict]:
    """Fold a source note printed directly under a table into that table block.

    Left as a paragraph of its own, the note becomes the paragraph the *next*
    line continues -- prose that follows a table is not indented, because on the
    printed page it is the continuation of text the table interrupted -- and the
    result welds the citation onto a sentence that has nothing to do with it.
    """
    folded: list[Line | dict] = []
    for item in items:
        previous = folded[-1] if folded else None
        if (
            isinstance(item, Line)
            and isinstance(previous, dict)
            and TABLE_NOTE_RE.match(item.text.strip())
        ):
            previous["text"] += "\n\n" + item.text.strip()
            continue
        folded.append(item)
    return folded


# ------------------------------------------------------------------- main


def _report_progress(page: int, start: int, end: int, report: dict, started: float) -> None:
    """Write a progress line to stderr every `PROGRESS_EVERY` pages.

    A whole book is an hour of work, so a run with no output until it finishes
    is indistinguishable from one that has hung. stderr carries the progress and
    stdout stays reserved for the report JSON, so `--out` and the JSON report can
    still be redirected without the progress lines landing in them.
    """
    done = page - start + 1
    total = end - start + 1
    if done % PROGRESS_EVERY and done != total:
        return
    elapsed = time.monotonic() - started
    remaining = elapsed / done * (total - done)
    print(
        f"page {page}/{end} ({done * 100 // total}%) "
        f"{report['boxes']} boxes, {elapsed:.0f}s elapsed, ~{remaining:.0f}s left",
        file=sys.stderr,
        flush=True,
    )


def ocr_document(pdf: Path, first: int | None, last: int | None, dpi: int) -> tuple[list[dict], dict]:
    """OCR the requested pages and return (blocks, report)."""
    total_pages = int(
        subprocess.run(["pdfinfo", str(pdf)], capture_output=True, text=True, check=True)
        .stdout.split("Pages:")[1].split()[0]
    )
    # Checked here because the failure it prevents is expensive to read: an
    # out-of-range page reaches pdftoppm, which exits 99 with "Wrong page range
    # given" and surfaces as a CalledProcessError traceback pointing at the
    # subprocess call rather than at the page number that was wrong.
    for name, value in (("--first", first), ("--last", last)):
        if value is not None and not 1 <= value <= total_pages:
            raise SystemExit(f"{name} {value} is outside {pdf.name}, which has {total_pages} pages")
    start = first or 1
    end = last or total_pages

    blocks: list[dict] = []
    report = {"pages": 0, "boxes": 0, "tables": 0, "table_lines": 0}

    # The paragraph in progress. It deliberately outlives the page loop: a hard
    # wrap at a page break is not a paragraph break, the same reason
    # `pdf_extract.py` lets a paragraph span `page_start`..`page_end`.
    current: list[Line] = []

    def flush_current() -> None:
        if not current:
            return
        text = "".join(ln.text for ln in current).strip()
        if text:
            blocks.append(
                {
                    "kind": "para",
                    "text": text,
                    "page_start": current[0].page,
                    "page_end": current[-1].page,
                }
            )
        current.clear()

    with tempfile.TemporaryDirectory() as tmp:
        tmp_dir = Path(tmp)
        started = time.monotonic()
        for page in range(start, end + 1):
            image = render_page(pdf, page, dpi, tmp_dir)
            boxes = drop_marginalia(ocr_boxes(image))

            # Table rows are located on the plain y-merged lines and kept out of
            # the column analysis: a table has a clear gutter of its own, so
            # letting its rows vote would split it. See `find_columns`.
            skip = {
                id(box)
                for run in _tabular_runs(to_lines(boxes, page))
                for line in run
                for box in line.boxes
            }
            groups = order_page(boxes, page, skip)
            lines = [line for group in groups for line in group]

            body = body_height(lines)
            lead = leading(lines)

            # The indent test is told where each line's own column starts, and
            # where its own measure starts: a two-column page puts the right
            # column far right of the page margin, and a page can carry two
            # measures stacked. The lines opening a column run are marked so the
            # walk below can tell a new flow from a continuation.
            lefts: dict[int, float] = {}
            breaks: set[int] = set()
            for index, group in enumerate(groups):
                lefts.update(column_edges(group))
                if index and group:
                    breaks.add(id(group[0]))

            # Table detection is deliberately conservative: a run of lines whose
            # boxes form several well-separated column centres is a table.
            items: list[Line | dict] = []
            table_run: list[Line] = []
            for line in lines:
                if _looks_tabular(line):
                    table_run.append(line)
                    continue
                if table_run:
                    items.extend(_flush_table(table_run, page, report))
                    table_run = []
                items.append(line)
            if table_run:
                items.extend(_flush_table(table_run, page, report))

            items = _absorb_table_notes(items)

            # Walk the page in reading order so a paragraph broken by a table is
            # closed before the table and reopened after it, and so a paragraph
            # never runs across a column break.
            previous: Line | None = None
            for item in items:
                if isinstance(item, dict):
                    flush_current()
                    blocks.append(item)
                    previous = None
                    continue
                # A line opening a new column run usually continues the flow
                # above it: body text wraps from the full measure into a side
                # column mid-paragraph. Only a jump *upward* means a genuinely
                # separate flow, such as the right column after the left one has
                # been read to its end.
                jumped = id(item) in breaks and previous is not None and item.y <= previous.y
                if jumped or (
                    current and starts_paragraph(item, previous, lefts[id(item)], body, lead)
                ):
                    flush_current()
                current.append(item)
                previous = item

            report["pages"] += 1
            report["boxes"] += len(boxes)
            image.unlink(missing_ok=True)
            _report_progress(page, start, end, report, started)

    flush_current()
    report["blocks"] = len(blocks)
    report["tables"] = sum(1 for b in blocks if b["kind"] == "table")
    return blocks, report


def main() -> int:
    parser = argparse.ArgumentParser(description="OCR a scanned PDF into block JSONL")
    parser.add_argument("--pdf", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--first", type=int, default=None, help="First page (1-based)")
    parser.add_argument("--last", type=int, default=None, help="Last page (1-based)")
    parser.add_argument("--dpi", type=int, default=DEFAULT_DPI)
    args = parser.parse_args()

    if not args.pdf.exists():
        raise SystemExit(f"Missing PDF: {args.pdf}")

    blocks, report = ocr_document(args.pdf, args.first, args.last, args.dpi)

    args.out.parent.mkdir(parents=True, exist_ok=True)
    with args.out.open("w", encoding="utf-8") as handle:
        for block in blocks:
            handle.write(
                json.dumps(
                    {
                        "page_start": block["page_start"],
                        "page_end": block["page_end"],
                        "kind": block["kind"],
                        "text": block["text"],
                    },
                    ensure_ascii=False,
                )
                + "\n"
            )

    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
