#!/usr/bin/env bash
# 往本地/staging 灌一套 5 月龄、150 天的完整测试数据。
#
# 前置条件：
#   后端以 APP_AUTH_DEV_MODE=true（本地）或 DEV_SEED_ENABLED=true + DEV_SEED_TOKEN=...（staging）启动
#
# 用法：
#   ./scripts/seed-dev-data.sh
#   BASE_URL=https://staging.example.com DEV_SEED_TOKEN=xxx SEED_JWT=xxx ./scripts/seed-dev-data.sh
#
# 参数（环境变量）：
#   BASE_URL      默认 http://localhost:8080
#   DAYS          分析数据天数，默认 150
#   AGE_MONTHS    宝宝月龄，默认 5
#   TIMELINE      时间线条数，默认 DAYS*3
#   MEMORIES      记忆条数，默认 40
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8080}"
DAYS="${DAYS:-150}"
AGE_MONTHS="${AGE_MONTHS:-5}"
TIMELINE="${TIMELINE:-}"
MEMORIES="${MEMORIES:-40}"

if [ -n "${SEED_JWT:-}" ]; then
  TOKEN="${SEED_JWT}"
else
  TOKEN="$(curl -sS -X POST "${BASE_URL}/api/auth/login" \
    -H 'Content-Type: application/json' \
    -d '{"code":"dev-seed"}' \
    | python3 -c 'import sys,json; print(json.load(sys.stdin)["data"]["token"])')"
fi

if [ -z "${TOKEN}" ]; then
  echo "无法获取登录 token：本地请确认 APP_AUTH_DEV_MODE=true；staging 请传 SEED_JWT" >&2
  exit 1
fi

BODY="$(python3 -c '
import json, sys
days, age, memories = int(sys.argv[1]), int(sys.argv[2]), int(sys.argv[3])
timeline = sys.argv[4]
payload = {"days": days, "ageMonths": age, "memories": memories, "reset": True}
if timeline:
    payload["timelineCount"] = int(timeline)
print(json.dumps(payload))
' "${DAYS}" "${AGE_MONTHS}" "${MEMORIES}" "${TIMELINE}")"

curl -sS -X POST "${BASE_URL}/api/dev/seed" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "X-Dev-Seed-Token: ${DEV_SEED_TOKEN:-}" \
  -H 'Content-Type: application/json' \
  -d "${BODY}" \
  | python3 -m json.tool
