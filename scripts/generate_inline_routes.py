from pathlib import Path
import json
import re


ROOT = Path("/Users/betus/Documents/trae_projects/baby-grow-mini")
PROTOTYPE_ROOT = ROOT / "prototype_demo"
ROUTES_PATH = PROTOTYPE_ROOT / "routes.js"


def collect_route_sources():
    routes_text = ROUTES_PATH.read_text(encoding="utf-8")
    pattern = re.compile(r'id:\s*"([^"]+)"[\s\S]*?src:\s*"([^"]+)"', re.M)
    pairs = pattern.findall(routes_text)
    inline = {}
    for route_id, src in pairs:
        abs_path = (PROTOTYPE_ROOT / src).resolve()
        inline[route_id] = abs_path.read_text(encoding="utf-8")
    return inline


def write_inline_routes_file(inline):
    out_path = PROTOTYPE_ROOT / "inline-routes.js"
    out_path.write_text(
        "window.PROTOTYPE_INLINE_HTML = " + json.dumps(inline, ensure_ascii=False) + ";\n",
        encoding="utf-8"
    )


def patch_entry_files():
    old = '<script src="./routes.js"></script>\n  <script src="./app.js"></script>'
    new = '<script src="./routes.js"></script>\n  <script src="./inline-routes.js"></script>\n  <script src="./app.js"></script>'
    updated = 0
    for path in PROTOTYPE_ROOT.glob("*.html"):
        html = path.read_text(encoding="utf-8")
        if old in html:
            path.write_text(html.replace(old, new), encoding="utf-8")
            updated += 1
    return updated


def main():
    inline = collect_route_sources()
    write_inline_routes_file(inline)
    updated = patch_entry_files()
    print(f"routes={len(inline)}")
    print(f"updated={updated}")


if __name__ == "__main__":
    main()
