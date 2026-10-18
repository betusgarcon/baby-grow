#!/usr/bin/env bash
# 重新生成页面主标题的中文展示字体子集。
#
# 当 messages.ts 新增了页面标题类文案，或改了展示字体时运行：
#   ./scripts/build-display-font.sh
#
# 依赖 fonttools（pip install fonttools brotli）。源字体是 OFL 授权的
# ZCOOL QingKe HuangYou，不把 8MB 的全量 TTF 放进仓库。
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MESSAGES="${ROOT}/babyGrowFrontend/src/i18n/messages.ts"
OUT="${ROOT}/babyGrowBackend/src/main/resources/static/fonts/zcool-qingke-huangyou-display.woff2"
TMP="$(mktemp -d)"
trap 'rm -rf "${TMP}"' EXIT

curl -sL --max-time 120 -o "${TMP}/zcool.ttf" \
  "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/zcoolqingkehuangyou/ZCOOLQingKeHuangYou-Regular.ttf"

python3 - "${MESSAGES}" "${TMP}/chars.txt" <<'PY'
import sys
src = open(sys.argv[1], encoding='utf-8').read()
chars = {c for c in src if ord(c) >= 32}
chars.update(chr(c) for c in range(32, 127))
chars.update('，。！？：；、·「」『』（）【】《》…—–-～°%＋+')
open(sys.argv[2], 'w', encoding='utf-8').write(''.join(sorted(chars)))
PY

pyftsubset "${TMP}/zcool.ttf" \
  --text-file="${TMP}/chars.txt" \
  --flavor=woff2 \
  --layout-features='*' --glyph-names --symbol-cmap --legacy-cmap \
  --notdef-glyph --notdef-outline --recommended-glyphs \
  --name-IDs='*' --name-legacy --name-languages='*' \
  --output-file="${OUT}"

echo "已生成 ${OUT}（$(du -h "${OUT}" | cut -f1)）"
