#!/usr/bin/env python3
"""
把 Figma node.json 打印成可读的布局树，用于页面还原前的结构分析。

用法:
    python3 scripts/figma-tree.py <node.json> [选项]

选项:
    --depth N        只展开到第 N 层（默认 8）
    --node ID        只打印指定节点（如 2:449）
    --no-text        不打印文本内容
    --ids            每行带上节点 id

输出每行的格式:
    缩进 TYPE 名称  宽x高  布局信息  视觉信息

设计意图：把 Figma 的自动布局属性直接映射成 flex 语义，
这样看树就能直接写出 flex 结构，不必再对着截图猜。
"""

import argparse
import json
import sys


def hex_color(color):
    if not color:
        return None

    r = round(color.get("r", 0) * 255)
    g = round(color.get("g", 0) * 255)
    b = round(color.get("b", 0) * 255)
    a = color.get("a", 1)

    if a < 1:
        return f"rgba({r},{g},{b},{round(a, 2)})"

    return f"#{r:02x}{g:02x}{b:02x}"


def first_solid_fill(node):
    for fill in node.get("fills") or []:
        if fill.get("visible") is False:
            continue
        if fill.get("type") == "SOLID":
            return hex_color(fill.get("color"))
        if fill.get("type", "").startswith("GRADIENT"):
            return "gradient"
        if fill.get("type") == "IMAGE":
            return "image"

    return None


def stroke_color(node):
    for stroke in node.get("strokes") or []:
        if stroke.get("type") == "SOLID":
            return hex_color(stroke.get("color"))

    return None


def layout_info(node):
    parts = []

    mode = node.get("layoutMode")
    if mode in ("VERTICAL", "HORIZONTAL"):
        parts.append(mode[:3].lower())

        gap = node.get("itemSpacing")
        if gap:
            parts.append(f"gap={round(gap)}")

        if node.get("layoutWrap") == "WRAP":
            parts.append("wrap")

    padding = [
        node.get("paddingTop"),
        node.get("paddingRight"),
        node.get("paddingBottom"),
        node.get("paddingLeft"),
    ]
    if any(padding):
        rendered = "/".join(str(round(v)) if v else "0" for v in padding)
        parts.append(f"pad={rendered}")

    if node.get("layoutGrow"):
        parts.append("grow")
    if node.get("layoutAlign") == "STRETCH":
        parts.append("stretch")

    primary = node.get("primaryAxisAlignItems")
    if primary and primary != "MIN":
        parts.append(f"main={primary.lower()}")

    counter = node.get("counterAxisAlignItems")
    if counter and counter != "MIN":
        parts.append(f"cross={counter.lower()}")

    return " ".join(parts)


def visual_info(node):
    parts = []

    fill = first_solid_fill(node)
    if fill:
        parts.append(fill)

    stroke = stroke_color(node)
    if stroke:
        width = node.get("strokeWeight")
        parts.append(f"border={stroke}" + (f"/{round(width)}" if width else ""))

    radii = node.get("rectangleCornerRadii")
    radius = node.get("cornerRadius")
    if radii and len(set(radii)) > 1:
        parts.append("r=" + "/".join(str(round(v)) for v in radii))
    elif radius:
        parts.append(f"r={round(radius)}")

    style = node.get("style") or {}
    if style:
        font = style.get("fontSize")
        weight = style.get("fontWeight")
        line = style.get("lineHeightPx")
        segment = "font="
        if font:
            segment += f"{round(font)}"
        if line:
            segment += f"/{round(line)}"
        if weight:
            segment += f" w{weight}"
        if style.get("fontFamily"):
            segment += f" {style['fontFamily'].split(',')[0]}"
        parts.append(segment)

    for effect in node.get("effects") or []:
        if effect.get("visible") is False:
            continue
        if effect.get("type") in ("DROP_SHADOW", "INNER_SHADOW"):
            offset = effect.get("offset") or {}
            parts.append(
                f"shadow={hex_color(effect.get('color'))} "
                f"{round(offset.get('x', 0))},{round(offset.get('y', 0))} "
                f"b{round(effect.get('radius', 0))}"
            )

    opacity = node.get("opacity")
    if opacity is not None and opacity < 1:
        parts.append(f"opacity={round(opacity, 2)}")

    return " ".join(parts)


def size_info(node):
    box = node.get("absoluteBoundingBox")
    if not box:
        return ""

    return f"{round(box['width'])}x{round(box['height'])}"


def render(node, depth, max_depth, show_text, show_ids):
    label = f"{node.get('type', '?')} {node.get('name', '')}".rstrip()
    if show_ids:
        label += f" [{node.get('id')}]"

    line = "  " * depth + label

    size = size_info(node)
    if size:
        line += f"  {size}"

    info = layout_info(node)
    if info:
        line += f"  {info}"

    visual = visual_info(node)
    if visual:
        line += f"  {visual}"

    text = node.get("characters")
    if show_text and text:
        line += f'  "{text}"'

    print(line)

    if depth >= max_depth:
        children = node.get("children") or []
        if children:
            print("  " * (depth + 1) + f"... 还有 {len(children)} 个子节点未展开")
        return

    for child in node.get("children") or []:
        render(child, depth + 1, max_depth, show_text, show_ids)


def find_node(node, target_id):
    if node.get("id") == target_id:
        return node

    for child in node.get("children") or []:
        found = find_node(child, target_id)
        if found:
            return found

    return None


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("path")
    parser.add_argument("--depth", type=int, default=8)
    parser.add_argument("--node")
    parser.add_argument("--no-text", action="store_true")
    parser.add_argument("--ids", action="store_true")
    args = parser.parse_args()

    with open(args.path) as handle:
        data = json.load(handle)

    documents = [entry["document"] for entry in (data.get("nodes") or {}).values()]

    if not documents:
        print("这个文件里没有 nodes 字段，可能拉取失败", file=sys.stderr)
        return 1

    if args.node:
        root = find_node(documents[0], args.node)
        if not root:
            print(f"找不到节点 {args.node}", file=sys.stderr)
            return 1
        documents = [root]

    for document in documents:
        render(document, 0, args.depth, not args.no_text, args.ids)

    return 0


if __name__ == "__main__":
    sys.exit(main())
