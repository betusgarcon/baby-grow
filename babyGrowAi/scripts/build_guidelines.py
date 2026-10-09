#!/usr/bin/env python3
"""Stage 2: reflowed blocks (JSONL) -> structured Markdown with front matter.

Why this intermediate layer exists
    Stage 1 produces a flat stream of paragraphs: correct words, no structure.
    Everything downstream needs structure, and the PDF cannot supply it -- the
    heading hierarchy of a book lives in its printed table of contents, and
    that of a standard lives in its clause numbering.

    Doing that recovery once, here, buys three things:

    * The chunker (`ingest_guidelines.build_chunks`) can cut on `#` headings
      instead of guessing where sections begin, so chunks align with meaning.
    * Heading levels become the breadcrumb prefix on every chunk, which is how
      a passage retrieved out of context still says where it came from.
    * Front matter becomes chunk metadata, which is what the age and population
      filters at retrieval time run on.

    Markdown is the format for one reason: it is the only thing in this
    pipeline that a human can read and review. When a chapter is missing or a
    heading is wrong, it is visible here -- and the conversion is re-runnable,
    so the fix is a profile edit, not a re-OCR.

Each source document has a profile describing how to recover its heading
hierarchy, because the two families of source need different treatment:

* ``standard`` -- national/industry standards use numbered clauses
  (``1 范围``, ``3.2 辅食种类``), so the hierarchy is read straight off the
  numbering.
* ``book``     -- prose books have no such numbering, so chapters are located
  from the printed table of contents and subheadings from a conservative
  short-line heuristic.

Output layout
    data/guidelines/<slug>/<NN>-<part-or-section>.md

Usage
    python scripts/build_guidelines.py                # all profiles
    python scripts/build_guidelines.py --only postpartum_diet

Lifespan:
    Stable tooling. Add one entry to `PROFILES` per new source.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass, field, replace
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from rag_paths import guidelines_dir, work_dir  # noqa: E402

# A numbered clause heading: "1 范围", "3.2 辅食种类", "5.1.1 术语".
CLAUSE_RE = re.compile(r"^(\d+(?:\.\d+)*)\s+(\S.*)$")
# A clause number with no title on the same line (definition style: "2.1" then "婴儿 infant").
ORPHAN_NUMBER_RE = re.compile(r"^\d+(?:\.\d+)*$")
# A nested clause number appearing mid-text, e.g. "总体原则5.1.1.1 产褥期膳食…".
# `pdftotext` emits these on separate lines but the reflow step rejoins them,
# because neither line is indented and neither is preceded by a blank line.
EMBEDDED_CLAUSE_RE = re.compile(r"(?<![.\d])(?=\d+(?:\.\d+)+\s)")

# Text after a clause number longer than this is clause *content*, not a label.
CLAUSE_LABEL_MAX_LEN = 24

# Characters that mean a short line is prose, not a subheading.
NOT_HEADING_END = "。！？!?：:；;、，,……—"

MAX_SUBHEADING_LEN = 22


@dataclass
class Block:
    text: str
    page_start: int
    page_end: int
    kind: str = "para"


@dataclass
class Section:
    """A heading node with the body text directly under it."""

    level: int
    title: str
    paragraphs: list[str] = field(default_factory=list)
    page_start: int = 0
    page_end: int = 0


def load_blocks(path: Path) -> list[Block]:
    blocks: list[Block] = []
    with path.open(encoding="utf-8") as fh:
        for line in fh:
            if not line.strip():
                continue
            rec = json.loads(line)
            blocks.append(
                Block(rec["text"], rec["page_start"], rec["page_end"], rec.get("kind", "para"))
            )
    return blocks


def write_markdown(path: Path, front: dict, body: str) -> None:
    """Write a Markdown file with a simple YAML front matter block.

    Front matter is not decoration: the loader copies it verbatim into every
    chunk's metadata, and that metadata is what the age/population filters at
    retrieval time run on. Adding a source means deciding these values.
    """
    path.parent.mkdir(parents=True, exist_ok=True)
    lines = ["---"]
    for key, value in front.items():
        if isinstance(value, list):
            rendered = "[" + ", ".join(str(v) for v in value) + "]"
        else:
            rendered = str(value)
        lines.append(f"{key}: {rendered}")
    lines.append("---")
    lines.append("")
    lines.append(body.rstrip())
    lines.append("")
    path.write_text("\n".join(lines), encoding="utf-8")


def render_section(section: Section, *, heading_prefix: str = "") -> str:
    """Render a section and its body as Markdown.

    The page span is written as an HTML comment so a chunk can be traced back
    to the PDF. It is invisible wherever the Markdown is rendered, and the
    ingestion loader strips it out of the chunk text.
    """
    hashes = "#" * min(section.level, 6)
    out = [f"{hashes} {heading_prefix}{section.title}".rstrip()]
    if section.page_start > 0:
        pages = f"{section.page_start}" if section.page_start == section.page_end else f"{section.page_start}-{section.page_end}"
        out.append(f"<!-- page: {pages} -->")
    for para in section.paragraphs:
        out.append("")
        out.append(para)
    return "\n".join(out)


# ------------------------------------------------------------------ standards


def _expand_clause_blocks(blocks: list[Block]) -> list[Block]:
    """Split blocks that pack several numbered clauses onto one line.

    Table blocks are passed through untouched: their cells are full of numbers
    that read like clause numbers, and the pipe syntax must stay intact.
    """
    expanded: list[Block] = []
    for block in blocks:
        if block.kind == "table":
            expanded.append(block)
            continue
        parts = [p.strip() for p in EMBEDDED_CLAUSE_RE.split(block.text) if p.strip()]
        for part in parts or [block.text.strip()]:
            expanded.append(Block(part, block.page_start, block.page_end))
    return expanded


def _classify_clause(text: str) -> tuple[str, str, str]:
    """Classify a standard's line as an orphan number, a label, or clause content.

    Returns ``(kind, number, rest)`` where kind is one of ``orphan`` (a bare
    "2.1"), ``label`` (a short numbered heading), ``content`` (a numbered
    paragraph, where the number is only a lead-in), or ``none``.
    """
    if ORPHAN_NUMBER_RE.match(text):
        return "orphan", text, ""
    match = CLAUSE_RE.match(text)
    if match:
        number, rest = match.group(1), match.group(2).strip()
        if len(rest) <= CLAUSE_LABEL_MAX_LEN:
            return "label", number, rest
        return "content", number, rest
    return "none", "", text


def build_standard(blocks: list[Block], profile: dict) -> list[tuple[dict, str, str]]:
    """Return [(front_matter, body, filename_stem)] for a numbered-clause standard.

    Front matter (cover, table of contents, drafting note) is skipped: the body
    starts at the first numbered clause, which is where nutrition content begins.
    """
    body_start = profile["body_starts_at"]
    start = next(
        (i for i, b in enumerate(blocks) if re.match(body_start, b.text.strip())),
        None,
    )
    if start is None:
        raise ValueError(f"No body start matching {body_start!r} in {profile['slug']}")
    blocks = _expand_clause_blocks(blocks[start:])

    sections: list[Section] = []
    pending_number: str | None = None

    for block in blocks:
        text = block.text.strip()
        if not text:
            continue

        kind, number, rest = _classify_clause(text)

        if kind == "orphan":
            # A bare "2.1" introduces the definition on the following line.
            pending_number = number
            continue

        if pending_number is not None:
            sections.append(
                Section(
                    level=3,
                    title=f"{pending_number} {text}",
                    page_start=block.page_start,
                    page_end=block.page_end,
                )
            )
            pending_number = None
            continue

        if kind == "label":
            sections.append(
                Section(
                    level=min(2 + number.count("."), 6),
                    title=f"{number} {rest}",
                    page_start=block.page_start,
                    page_end=block.page_end,
                )
            )
            continue

        if not sections:
            continue

        paragraph = f"**{number}** {rest}" if kind == "content" else text
        target = sections[-1]
        target.paragraphs.append(paragraph)
        target.page_end = block.page_end

    return [(profile["front"], _render_document(profile, sections), profile["slug"])]


def _render_document(profile: dict, sections: list[Section]) -> str:
    out = [f"# {profile['title']}"]
    for section in sections:
        out.append("")
        out.append(render_section(section))
    return "\n".join(out)


# ----------------------------------------------------------------------- book


def build_book(blocks: list[Block], profile: dict) -> list[tuple[dict, str, str]]:
    """Return [(front_matter, body, filename_stem)] per part of a prose book.

    Chapters are located by matching their printed titles from the table of
    contents. A chapter owns every block from its own heading up to the next
    chapter's heading.
    """
    toc_until = profile["toc_pages"]
    searchable = [b for b in blocks if b.page_start > toc_until]

    # (part, title, candidates), where each candidate is
    # (block_index, heading_start, heading_end). The offsets say where inside
    # the block the title sits, so the text before it can be left with the
    # chapter that owns it and the text after it with this one.
    found = [
        (part, chapter["title"], _find_headings(searchable, chapter["title"]))
        for part in profile["parts"]
        for chapter in part["chapters"]
    ]

    # A part's opening page often lists the chapters under it, so one block can
    # carry several titles. That block is a contents list rather than a heading,
    # and starting a chapter there would give it the piece of the list between
    # two titles, so occurrences on such a block are only a last resort.
    seen: dict[int, int] = {}
    for _part, _title, candidates in found:
        for idx in {candidate[0] for candidate in candidates}:
            seen[idx] = seen.get(idx, 0) + 1
    lists = {idx for idx, count in seen.items() if count > 1}

    located: list[tuple[int, int, int, dict, str]] = []
    for part, title, candidates in found:
        if not candidates:
            raise ValueError(f"Chapter not found in {profile['slug']}: {title!r}")
        own = [candidate for candidate in candidates if candidate[0] not in lists]
        idx, start, end = (own or candidates)[0]
        located.append((idx, start, end, part, title))

    located.sort(key=lambda item: (item[0], item[1]))
    results: list[tuple[dict, str, str]] = []

    for pos, (idx, _start, cut, part, title) in enumerate(located):
        if pos + 1 < len(located):
            next_idx, next_start = located[pos + 1][0], located[pos + 1][1]
        else:
            next_idx, next_start = len(searchable), 0

        chunk_blocks = _chapter_blocks(searchable, idx, cut, next_idx, next_start, title)
        sections = _blocks_to_sections(chunk_blocks, chapter_title=title)
        front = dict(profile["front"])
        front["part"] = part["title"]
        front["pdf_page_start"] = chunk_blocks[0].page_start
        front["pdf_page_end"] = chunk_blocks[-1].page_end

        body = _render_book_part(part["title"], sections)
        stem = f"{part['order']:02d}-{_slugify(title)}"
        results.append((front, body, stem))

    return results


def _chapter_blocks(
    blocks: list[Block], first: int, cut: int, end: int, end_cut: int, title: str
) -> list[Block]:
    """The blocks of one chapter, split out of the headings glued to them.

    `cut` is where this chapter's heading ends inside block `first`: whatever
    precedes it belongs to the previous chapter. `end` is the block holding the
    next chapter's heading and `end_cut` is where that heading starts inside it:
    whatever precedes it belongs to this chapter, and block `end` belongs
    entirely to the next chapter when `end_cut` is 0.
    """
    last = end if end_cut == 0 else end + 1
    pieces: list[Block] = []
    for i in range(first, last):
        text = blocks[i].text
        if i == first == end:
            text = text[cut:end_cut]
        elif i == first:
            text = text[cut:]
        elif i == end:
            text = text[:end_cut]
        pieces.append(replace(blocks[i], text=text.strip()))
    pieces = [piece for piece in pieces if piece.text]
    # A chapter whose heading is all it has keeps a block carrying just the
    # title: the page range comes from it, and `_blocks_to_sections` drops it.
    return pieces or [replace(blocks[first], text=title)]


def _find_headings(blocks: list[Block], title: str) -> list[tuple[int, int, int]]:
    """Every place `title` appears, likeliest heading first.

    Returns (block index, start, end) for each occurrence, where start and end
    delimit the title inside that block's text.

    A title can appear more than once, because a part's opening page often lists
    the chapters under it: the heading both opens its chapter and sits in a list
    before it. Candidates are therefore ordered by how much the occurrence looks
    like a heading -- the whole block, then the start of one, then anywhere
    inside one, which is what a heading glued to the end of the previous page's
    paragraph looks like. See docs/rag-ocr-b-tier.md.
    """
    needle = _normalize(title)
    pattern = re.compile(r"\s*".join(map(re.escape, needle)))
    exact: list[tuple[int, int, int]] = []
    at_start: list[tuple[int, int, int]] = []
    inside: list[tuple[int, int, int]] = []
    for idx, block in enumerate(blocks):
        match = pattern.search(block.text)
        if match is None:
            continue
        found = (idx, match.start(), match.end())
        if _normalize(block.text) == needle:
            exact.append(found)
        elif match.start() == 0:
            at_start.append(found)
        else:
            inside.append(found)
    return exact + at_start + inside


def _normalize(text: str) -> str:
    return re.sub(r"\s+", "", text)


def _slugify(title: str) -> str:
    return re.sub(r"[^\w一-鿿]+", "-", title).strip("-")


def _is_subheading(text: str) -> bool:
    """Heuristic: short lines without sentence punctuation are subheadings."""
    stripped = text.strip()
    if not stripped or len(stripped) > MAX_SUBHEADING_LEN:
        return False
    if stripped[-1] in NOT_HEADING_END:
        return False
    if stripped[0] in "■-•·":
        return False
    return True


def _blocks_to_sections(blocks: list[Block], *, chapter_title: str) -> list[Section]:
    """Turn a chapter's blocks into a chapter section plus its subheadings."""
    chapter = Section(level=2, title=chapter_title, page_start=blocks[0].page_start)
    sections = [chapter]

    for block in blocks:
        text = block.text.strip()
        if not text:
            continue
        # Skip the chapter heading block itself; it becomes the section title.
        if _normalize(text) == _normalize(chapter_title):
            continue
        if _is_subheading(text):
            sections.append(
                Section(level=3, title=text, page_start=block.page_start, page_end=block.page_end)
            )
            continue
        target = sections[-1]
        target.paragraphs.append(text)
        target.page_end = block.page_end

    chapter.page_end = blocks[-1].page_end
    return sections


def _render_book_part(part_title: str, sections: list[Section]) -> str:
    out = [f"# {part_title}"]
    for section in sections:
        out.append("")
        out.append(render_section(section))
    return "\n".join(out)


# ------------------------------------------------------------------ profiles

# One entry per knowledge source. Adding a document means adding a profile --
# this dict is the only place that knows how a given PDF's structure works.
#
# Per profile:
#   kind          "standard" (numbered clauses) or "book" (prose + TOC)
#   body_starts_at  regex for the first clause, so cover/TOC/drafting notes are
#                   skipped instead of being ingested as content
#   toc_pages     for books: how many pages are table of contents, so chapter
#                   titles are searched for only past it
#   parts         for books: the printed structure, used to locate chapters
#   front         becomes the YAML front matter -> chunk metadata. `population`
#                   and the age range are the two fields retrieval filters on,
#                   so they decide who can ever see this source.
PROFILES: dict[str, dict] = {
    "postpartum_diet": {
        "slug": "postpartum_diet",
        "title": "产褥期妇女膳食指导",
        "kind": "standard",
        "body_starts_at": r"^1\s",
        "front": {
            "source": "产褥期妇女膳食指导",
            "doc_id": "T/CNSS 014—2022",
            "publisher": "中国营养学会",
            "edition": "2022",
            "doc_type": "guideline",
            "population": ["postpartum", "lactating"],
            "age_min_month": 0,
            "age_max_month": 60,
        },
    },
    "complementary_feeding": {
        "slug": "complementary_feeding",
        "title": "婴幼儿辅食添加营养指南",
        "kind": "standard",
        "body_starts_at": r"^1\s",
        "front": {
            "source": "婴幼儿辅食添加营养指南",
            "doc_id": "WS/T 678—2020",
            "publisher": "中华人民共和国国家卫生健康委员会",
            "edition": "2020",
            "doc_type": "guideline",
            "population": ["infant", "toddler"],
            "age_min_month": 6,
            "age_max_month": 24,
        },
    },
    "cuiyutao_natural_parenting": {
        "slug": "cuiyutao_natural_parenting",
        "title": "崔玉涛自然养育法",
        "kind": "book",
        "toc_pages": 6,
        "front": {
            "source": "崔玉涛自然养育法",
            "author": "崔玉涛（口述）/ 刘子君（执笔）",
            "publisher": "中信出版集团",
            "doc_type": "guideline",
            "population": ["baby", "toddler", "preschool"],
            "age_min_month": 0,
            "age_max_month": 72,
        },
        "parts": [
            {
                "order": 1,
                "title": "第一部分 坚持了十余年的理念",
                "chapters": [
                    {"title": "01 什么是自然养育？"},
                    {"title": "02 怎么会想到自然养育？"},
                ],
            },
            {
                "order": 2,
                "title": "第二部分 如何养",
                "chapters": [
                    {"title": "01 孩子并非缩小版的成人"},
                    {"title": "02 早产儿出院只是个开始"},
                    {"title": "03 不要做婴儿大便的奴隶"},
                    {"title": "04 我的妈呀！孩子便血了！"},
                    {"title": "05 趴着真的不会压迫心肺"},
                    {"title": "06 为何孩子这么容易“缺钙”？"},
                    {"title": "07 “吃”这件事可不简单"},
                    {"title": "08 养孩子不是求自我满足"},
                    {"title": "09 快停手，孩子不是试验品"},
                    {"title": "10 频繁“消毒”，消掉了健康"},
                    {"title": "11 益生菌制剂不是万能药"},
                    {"title": "12 为何总能碰见“庸医”"},
                    {"title": "13 没有起跑线，只有生长曲线"},
                ],
            },
            {
                "order": 3,
                "title": "第三部分 如何育",
                "chapters": [
                    {"title": "01 家长别当孩子的第一任老师"},
                    {"title": "02 孩子不需要天天都快乐"},
                    {"title": "03 早教其实不等于早教班"},
                    {"title": "04 真的是贵人语迟吗？"},
                    {"title": "05 这孩子是不是有心理疾病？"},
                    {"title": "06 电子设备到底能不能看？"},
                    {"title": "07 夸孩子，原来也有这么多门道"},
                    {"title": "08 孩子真的会越挫越勇吗？"},
                    {"title": "09 要求孩子“听话”，会抹杀独立性吗？"},
                    {"title": "10 天啊，我的孩子说谎了！"},
                    {"title": "11 孩子不想写作业？那就不写吧！"},
                    {"title": "12 别借人家的，爸爸送你个游戏机"},
                ],
            },
            {
                "order": 4,
                "title": "第四部分 写给新手父母",
                "chapters": [
                    {"title": "01 父母是孩子的第一监护人"},
                    {"title": "02 从“丧偶式育儿”到“模范爸爸”"},
                    {"title": "03 一切都是为了孩子"},
                    {"title": "04 大医治未病"},
                ],
            },
            {
                "order": 5,
                "title": "附录",
                "chapters": [
                    {"title": "辅食专题"},
                    {"title": "视力专题"},
                    {"title": "口腔专题"},
                ],
            },
        ],
    },
    "zhongguo_dietary_guidelines": {
        "slug": "zhongguo_dietary_guidelines",
        "title": "中国居民膳食指南（2022）",
        "kind": "book",
        "toc_pages": 15,
        "front": {
            "source": "中国居民膳食指南（2022）",
            "author": "中国营养学会",
            "publisher": "人民卫生出版社",
            "edition": "2022",
            "doc_type": "guideline",
            "population": [
                "infant",
                "toddler",
                "baby",
                "preschool",
                "child",
                "adolescent",
                "adult",
                "pregnant",
                "lactating",
                "postpartum",
                "elderly",
            ],
            "age_min_month": 0,
            "age_max_month": 1200,
        },
        "parts": [
            {
                "order": 1,
                "title": "第一部分 一般人群膳食指南",
                "chapters": [
                    {"title": "准则一 食物多样，合理搭配"},
                    {"title": "准则二 吃动平衡，健康体重"},
                    {"title": "准则三 多吃蔬果、奶类、全谷、大豆"},
                    {"title": "准则四 适量吃鱼、禽、蛋、瘦肉"},
                    {"title": "准则五 少盐少油，控糖限酒"},
                    {"title": "准则六 规律进餐，足量饮水"},
                    {"title": "准则七 会烹会选，会看标签"},
                    {"title": "准则八公筷分餐，杜绝浪费"},
                ],
            },
            {
                "order": 2,
                "title": "第二部分 特定人群膳食指南",
                "chapters": [
                    {"title": "一、孕妇、乳母膳食指南"},
                    {"title": "（一）备孕和孕期妇女膳食指南"},
                    {"title": "（二）哺乳期妇女膳食指南"},
                    {"title": "二、婴幼儿喂养指南"},
                    {"title": "（一）0~6 月龄婴儿母乳喂养指南"},
                    {"title": "（二）7~24月龄婴幼儿喂养指南"},
                    {"title": "三、儿童膳食指南"},
                    {"title": "（一）学龄前儿童膳食指南"},
                    {"title": "（二）学龄儿童膳食指南"},
                    {"title": "四、老年人膳食指南"},
                    {"title": "（一）一般老年人膳食指南"},
                    {"title": "（二）高龄老年人膳食指南"},
                    {"title": "五、素食人群膳食指南"},
                ],
            },
            {
                "order": 3,
                "title": "第三部分 平衡膳食模式和膳食指南编写说明",
                "chapters": [
                    {"title": "一、膳食指南修订指导思想和概况"},
                    {"title": "二、平衡膳食模式研究"},
                    {"title": "三、平衡膳食模式的应用"},
                ],
            },
            {
                "order": 4,
                "title": "附录",
                "chapters": [
                    {"title": "附录一常见食物的份量"},
                    {"title": "附录二 中国居民膳食营养素参考摄入量"},
                    {"title": "附录三 常见身体活动强度和能量消耗表"},
                    # The heading is fused with the chart label underneath it
                    # ("...2~5岁儿童Weight-for-height BOYs"), so the printed
                    # tail "生长曲线" is not in the OCR text to match on.
                    {"title": "附录四 世界卫生组织（WHO）2~5岁儿童"},
                    {"title": "附录五 我国儿童青少年体格发育标准"},
                    {"title": "附录六 中国成人 BMI 与健康体重对应关系表"},
                ],
            },
        ],
    },
    "cuiyutao_parenting_encyclopedia": {
        "slug": "cuiyutao_parenting_encyclopedia",
        "title": "崔玉涛育儿百科",
        "kind": "book",
        "toc_pages": 32,
        "front": {
            "source": "崔玉涛育儿百科",
            "author": "崔玉涛",
            "publisher": "中信出版集团",
            "doc_type": "guideline",
            "population": [
                "pregnant",
                "postpartum",
                "lactating",
                "baby",
                "toddler",
                "preschool",
            ],
            "age_min_month": 0,
            "age_max_month": 72,
        },
        "parts": [
            {
                "order": 1,
                "title": "第1部分 迎接宝宝的到来",
                "chapters": [
                    {"title": "第1章 准备好做妈妈"},
                    {"title": "第2章 宝宝出生之后"},
                ],
            },
            {
                "order": 2,
                "title": "第2部分 和宝宝一起长大",
                "chapters": [
                    {"title": "第1章 1~2周的宝宝"},
                    {"title": "第2章 3~4周的宝宝"},
                    {"title": "第3章 1~2个月的宝宝"},
                    {"title": "第4章 2~3个月的宝宝"},
                    {"title": "第5章 3~4个月的宝宝"},
                    {"title": "第6章 4~5个月的宝宝"},
                    {"title": "第7章 5~6个月的宝宝"},
                    {"title": "第8章 6~7个月的宝宝"},
                    {"title": "第9章 7~8个月的宝宝"},
                    {"title": "第10章 8~9个月的宝宝"},
                    {"title": "第11章 9~10个月的宝宝"},
                    {"title": "第12章 10~11个月的宝宝"},
                    {"title": "第13章 11～12个月的宝宝"},
                    {"title": "第14章 12～14个月的宝宝"},
                    {"title": "第15章 15～17个月的宝宝"},
                    {"title": "第16章 18~20个月的宝宝"},
                    {"title": "第17章 21～23个月的宝宝"},
                    {"title": "第18章 2~2.5岁的宝宝"},
                    {"title": "第19章 2.5~3岁的宝宝"},
                    {"title": "第20章 3~4岁的孩子"},
                    {"title": "第21章 4~5岁的孩子"},
                    {"title": "第22章 5~6岁的孩子"},
                    {"title": "第 23 章 关于早产宝宝"},
                ],
            },
            {
                "order": 3,
                "title": "第3部分 孩子的健康与安全",
                "chapters": [
                    {"title": "第1章 保健常识"},
                    {"title": "第2章 常见症状和疾病"},
                    {"title": "第3章 意外伤害处理常识"},
                ],
            },
            {
                "order": 4,
                "title": "附录",
                "chapters": [
                    {"title": "常见疫苗简介及推荐注射时间"},
                    # The running header carries it as "附录20~5岁宝宝生长曲线图":
                    # the printed "0~5" is OCR'd with a leading 2.
                    {"title": "0~5岁宝宝生长曲线图"},
                ],
            },
        ],
    },
    # A flat book: nineteen top-level sections and no printed 篇/部分 divider, so
    # each is modelled as a one-chapter part rather than inventing a hierarchy.
    #
    # Part titles are the printed month names; chapter titles are each section's
    # unique subtitle. The subtitles are the anchors because the month names are
    # useless as ones: they are set in decorated type the scan mangles ("第亻个月"
    # on page 45, "第②个月", "第了个月"), and the book also repeats five fixed
    # topic headings -- 宝宝发育状况, 饮食与营养指导, 日常保健与护理,
    # 不适与疾病的防治, 体能训练与智能培养 -- about eighteen times each, so a
    # global search for one of those always lands in the first section.
    "feeding_sync_guidance": {
        "slug": "feeding_sync_guidance",
        "title": "0~3岁宝宝喂养同步指导",
        "kind": "book",
        "toc_pages": 34,
        "front": {
            "source": "0~3岁宝宝喂养同步指导",
            "author": "郑国权",
            "publisher": "中国纺织出版社",
            "edition": "2017.2",
            "doc_type": "guideline",
            "population": ["baby", "toddler", "lactating"],
            "age_min_month": 0,
            "age_max_month": 36,
        },
        "parts": [
            {
                "order": 1,
                "title": "出生前 做好充分准备，迎接宝宝的到来",
                "chapters": [{"title": "做好充分准备，迎接宝宝的到来"}],
            },
            {
                "order": 2,
                "title": "第1个月 给宝宝精心细致的呵护",
                "chapters": [{"title": "给宝宝精心细致的呵护"}],
            },
            {
                "order": 3,
                "title": "第2个月 让宝宝在父母的微笑中成长",
                "chapters": [{"title": "让宝宝在父母的微笑中成长"}],
            },
            {
                "order": 4,
                "title": "第3个月 给宝宝爱的抚摸",
                "chapters": [{"title": "给宝宝爱的抚摸"}],
            },
            {
                "order": 5,
                "title": "第4个月 注重与宝宝的情感交流",
                "chapters": [{"title": "注重与宝宝的情感交流"}],
            },
            {
                "order": 6,
                "title": "第5个月 让宝宝在快乐中成长",
                "chapters": [{"title": "让宝宝在快乐中成长"}],
            },
            {
                "order": 7,
                "title": "第6个月 注重良好习惯的培养",
                "chapters": [{"title": "注重良好习惯的培养"}],
            },
            {
                "order": 8,
                "title": "第7个月 给宝宝细致的关怀与照料",
                "chapters": [{"title": "给宝宝细致的关怀与照料"}],
            },
            {
                "order": 9,
                "title": "第8个月 确保宝宝“探险”中的安全",
                "chapters": [{"title": "确保宝宝“探险”中的安全"}],
            },
            {
                "order": 10,
                "title": "第9个月 做宝宝的好榜样",
                "chapters": [{"title": "做宝宝的好榜样"}],
            },
            {
                "order": 11,
                "title": "第10个月 营造良好的语言环境",
                "chapters": [{"title": "营造良好的语言环境"}],
            },
            {
                "order": 12,
                "title": "第11个月 重视与宝宝的双向交流",
                "chapters": [{"title": "重视与宝宝的双向交流"}],
            },
            {
                "order": 13,
                "title": "第12个月 助宝宝迈出人生第一步",
                "chapters": [{"title": "助宝宝迈出人生第一步"}],
            },
            {
                "order": 14,
                "title": "第13~15个月 给予宝宝与人交往的勇气",
                "chapters": [{"title": "给予宝宝与人交往的勇气"}],
            },
            {
                "order": 15,
                "title": "第16~18个月 让宝宝有规律的生活",
                "chapters": [{"title": "让宝宝有规律的生活"}],
            },
            {
                "order": 16,
                "title": "第19~21个月 开启宝宝的智慧之门",
                "chapters": [{"title": "开启宝宝的智慧之门"}],
            },
            {
                "order": 17,
                "title": "第22~24个月 让宝宝懂得更多的道理",
                "chapters": [{"title": "让宝宝懂得更多的道理"}],
            },
            {
                "order": 18,
                "title": "第25~30个月 在学习中促进人格完善",
                "chapters": [{"title": "在学习中促进人格完善"}],
            },
            {
                "order": 19,
                "title": "第31~36个月 有了超强的记忆力",
                "chapters": [{"title": "有了超强的记忆力"}],
            },
        ],
    },
}


def build(slug: str) -> list[Path]:
    profile = PROFILES[slug]
    source = work_dir() / "extract" / f"{slug}.jsonl"
    if not source.exists():
        raise SystemExit(f"Missing extraction output: {source}. Run scripts/pdf_extract.py first.")

    blocks = load_blocks(source)
    out_dir = guidelines_dir() / slug
    if out_dir.exists():
        for old in out_dir.glob("*.md"):
            old.unlink()

    if profile["kind"] == "standard":
        results = build_standard(blocks, profile)
    else:
        results = build_book(blocks, profile)

    written: list[Path] = []
    for front, body, stem in results:
        path = out_dir / f"{stem}.md"
        write_markdown(path, front, body)
        written.append(path)
    return written


def main() -> int:
    parser = argparse.ArgumentParser(description="Build structured Markdown from extracted blocks")
    parser.add_argument("--only", action="append", default=[], help="Restrict to these slugs")
    args = parser.parse_args()

    slugs = args.only or list(PROFILES)
    for slug in slugs:
        if slug not in PROFILES:
            parser.error(f"Unknown profile: {slug}")
        written = build(slug)
        total = sum(p.stat().st_size for p in written)
        print(f"{slug}: {len(written)} file(s), {total} bytes")
        for path in written:
            print(f"  - {path.relative_to(guidelines_dir().parent.parent)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
