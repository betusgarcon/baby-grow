#!/usr/bin/env bash
# 把本地的 AI 向量库（baby_grow_ai）整库搬到 NAS 上。**只需执行一次。**
#
# 用法（仓库根目录执行）：
#   pnpm deploy:init-data
#   或  ./babyGrowBackend/deploy/nas/init-vector-db.sh
#
# 为什么需要它：`baby_grow` 业务库由后端启动时的 Flyway 自动建，不用管；
# 但 `baby_grow_ai` 里的知识库分块是 RAG 检索的全部依据——食谱推荐要拿它做
# 向量召回，缺了它推荐会静默降级成「纯规则」（不报错，只是不再引用任何指南）。
# 那批数据是本地灌进去的，只能这样带过去。
#
# 走流式管道而不是 scp 中转：本地 dump 直接喂给远端 pg_restore 的 stdin，
# 不在任何一边落临时文件（这份 dump 有几十 MB，落盘容易忘了删）。
#
# 目标库已有数据时会拒绝执行——重跑一次就等于把线上的向量库覆盖掉。
# 确认要重灌时：FORCE=1 pnpm deploy:init-data

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./_lib.sh
source "${SCRIPT_DIR}/_lib.sh"

# 本地那个跑着 baby_grow_ai 的 postgres 容器
LOCAL_PG="${LOCAL_PG:-baby-grow-postgres}"
# NAS 上的 postgres 容器（compose 里定的名字）
NAS_PG="${NAS_PG:-babygrow-postgres}"
DB="baby_grow_ai"
FORCE="${FORCE:-0}"

echo "==> 本地：${LOCAL_PG} / ${DB}"
if ! docker exec "${LOCAL_PG}" pg_isready -U postgres -d "${DB}" >/dev/null 2>&1; then
  echo "❌ 本地容器 ${LOCAL_PG} 里的 ${DB} 连不上。"
  echo "   先确认本地 postgres 在跑：docker ps | grep postgres"
  echo "   容器名不同时：LOCAL_PG=<名字> $0"
  exit 1
fi

LOCAL_COUNT="$(docker exec "${LOCAL_PG}" \
  psql -U postgres -d "${DB}" -tAc 'select count(*) from knowledge_chunks')"
echo "    本地 knowledge_chunks: ${LOCAL_COUNT} 行"

if [ "${LOCAL_COUNT}" = "0" ]; then
  echo "❌ 本地知识库是空的，没有可搬的内容。"
  echo "   先在本地灌库（见 babyGrowAi/README 的知识库导入步骤）再执行本脚本。"
  exit 1
fi

echo "==> NAS：${NAS_HOST} / ${NAS_PG} / ${DB}"
REMOTE_COUNT="$(ssh "${NAS_HOST}" \
  "docker exec ${NAS_PG} psql -U postgres -d ${DB} -tAc 'select count(*) from knowledge_chunks'" 2>/dev/null || echo "MISSING")"

if [ "${REMOTE_COUNT}" = "MISSING" ]; then
  echo "❌ NAS 上 ${NAS_PG} 容器或 ${DB} 库还不存在。"
  echo "   先跑一次全量部署把 postgres 起起来：pnpm deploy:prod:full"
  exit 1
fi

echo "    远端 knowledge_chunks: ${REMOTE_COUNT} 行"
if [ "${REMOTE_COUNT}" != "0" ] && [ "${FORCE}" != "1" ]; then
  echo
  echo "❌ 远端已有 ${REMOTE_COUNT} 行数据，拒绝覆盖。"
  echo "   确认要重灌（会用本地的库整个替换线上那份）：FORCE=1 $0"
  exit 1
fi

echo "==> 迁移 ${DB}（流式，本地 dump → 远端 restore）"
docker exec "${LOCAL_PG}" pg_dump -U postgres -d "${DB}" -Fc \
  | ssh "${NAS_HOST}" "docker exec -i ${NAS_PG} pg_restore -U postgres -d ${DB} --clean --if-exists --no-owner"

echo "==> 校验"
VERIFY="$(ssh "${NAS_HOST}" \
  "docker exec ${NAS_PG} psql -U postgres -d ${DB} -tAc 'select count(*) from knowledge_chunks'")"

if [ "${VERIFY}" = "${LOCAL_COUNT}" ]; then
  echo "✅ 迁移完成：knowledge_chunks ${VERIFY} 行，与本地一致"
else
  echo "❌ 行数不一致：本地 ${LOCAL_COUNT}，远端 ${VERIFY}"
  echo "   看远端日志：ssh ${NAS_HOST} 'docker logs ${NAS_PG} --tail 30'"
  exit 1
fi
