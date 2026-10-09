#!/usr/bin/env bash
#
# 拉取 Figma 节点源数据与节点截图。
#
# 用法:
#   scripts/figma-pull.sh <node-id> <输出名> [depth]
#
# 例:
#   scripts/figma-pull.sh 2-448 journey-milestones
#
# 产物落在 design_sources/figma/<输出名>/ 下：node.json + node.png
# 令牌从 ~/.claude.json 的 MCP 配置里读，可用 FIGMA_TOKEN 覆盖，避免写进仓库。
#
# 注意 depth：Figma 的截断方式是把超出深度的节点保留在树里、但清空其 children，
# 于是深层文字节点会「静默消失」，看树时极易误判成设计稿本身没有文字。
# 因此默认不传 depth，一次拿全；确需压缩响应体积时再显式指定，且不要小于 12。

set -euo pipefail

FILE_KEY="eSQCng0EIvfDG7Kh7yPLOq"

NODE_ID="${1:?用法: scripts/figma-pull.sh <node-id> <输出名> [depth]}"
OUT_NAME="${2:?请给一个输出目录名，例如 journey-milestones}"
DEPTH="${3:-}"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="$REPO_ROOT/design_sources/figma/$OUT_NAME"
IDS="${NODE_ID//-/:}"

NODES_URL="https://api.figma.com/v1/files/$FILE_KEY/nodes?ids=$IDS"
if [ -n "$DEPTH" ]; then
  NODES_URL="$NODES_URL&depth=$DEPTH"
fi

if [ -z "${FIGMA_TOKEN:-}" ]; then
  FIGMA_TOKEN="$(python3 -c "import json,os;print(json.load(open(os.path.expanduser('~/.claude.json')))['mcpServers']['figma-mcp-free']['env']['FIGMA_TOKEN'])")"
fi

mkdir -p "$OUT_DIR"

# 读取 429 的 Retry-After 再决定要不要重试。
#
# Figma 的 Tier 1 端点（GET file / file nodes / image）在文件所属计划为 Starter 时，
# 即便 token 主人是 Full seat，也是「每月 6 次」的月配额，而不是每分钟限流。
# 配额耗尽时 Retry-After 会给到几天量级，此时重试纯属白等，必须直接失败并说明原因。
# 官方依据：developers.figma.com/docs/rest-api/rate-limits
RETRY_AFTER_CEILING=300

fetch_json() {
  local url="$1" out="$2" headers status retry_after plan_tier attempt

  headers="$(mktemp)"

  for attempt in 1 2 3; do
    curl -sS --max-time 180 -D "$headers" -H "X-Figma-Token: $FIGMA_TOKEN" "$url" -o "$out"

    status="$(awk 'NR==1{print $2}' "$headers")"

    if [ "$status" != "429" ]; then
      rm -f "$headers"
      return 0
    fi

    retry_after="$(awk 'tolower($1)=="retry-after:"{print $2}' "$headers" | tr -d '\r')"
    retry_after="${retry_after:-0}"
    plan_tier="$(awk 'tolower($1)=="x-figma-plan-tier:"{print $2}' "$headers" | tr -d '\r')"

    if [ "$retry_after" -gt "$RETRY_AFTER_CEILING" ]; then
      echo "Figma 配额已耗尽，需等待 ${retry_after}s（约 $((retry_after / 3600)) 小时）。" >&2
      echo "文件所属计划: ${plan_tier:-unknown}。这是月配额而非瞬时限流，重试无意义。" >&2
      echo "批量化调用或升级计划后再继续：developers.figma.com/docs/rest-api/rate-limits" >&2
      rm -f "$headers"
      return 1
    fi

    echo "  命中瞬时限流，${retry_after}s 后重试（第 ${attempt} 次）..." >&2
    sleep "$retry_after"
  done

  echo "连续 3 次被限流，放弃。" >&2
  rm -f "$headers"
  return 1
}

fetch_json "$NODES_URL" "$OUT_DIR/node.json"

if python3 -c "import json,sys;sys.exit(0 if 'err' in json.load(open('$OUT_DIR/node.json')) else 1)" 2>/dev/null; then
  echo "拉取失败: $(python3 -c "import json;print(json.load(open('$OUT_DIR/node.json'))['err'])")" >&2
  exit 1
fi

IMAGE_URL="$(curl -sS --max-time 90 -H "X-Figma-Token: $FIGMA_TOKEN" \
  "https://api.figma.com/v1/images/$FILE_KEY?ids=$IDS&format=png&scale=2" \
  | python3 -c "import json,sys;d=json.load(sys.stdin);print(next(iter(d.get('images',{}).values())) or '')" 2>/dev/null || echo '')"

if [ -n "$IMAGE_URL" ]; then
  curl -sS --max-time 180 "$IMAGE_URL" -o "$OUT_DIR/node.png"
fi

JSON_SIZE="$(wc -c < "$OUT_DIR/node.json" | tr -d ' ')"
PNG_SIZE=0
[ -f "$OUT_DIR/node.png" ] && PNG_SIZE="$(wc -c < "$OUT_DIR/node.png" | tr -d ' ')"

echo "$OUT_NAME: node.json ${JSON_SIZE}B, node.png ${PNG_SIZE}B"
