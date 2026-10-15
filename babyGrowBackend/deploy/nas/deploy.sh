#!/usr/bin/env bash
# baby-grow 全量部署到 NAS。首次部署，或 compose / frpc 配置有变更时用。
#
# 用法（仓库根目录执行）：
#   pnpm deploy:prod:full
#   或  ./babyGrowBackend/deploy/nas/deploy.sh
#
# 可覆盖：NAS_HOST（SSH 别名，默认 nas）、NAS_DEPLOY_DIR、NAS_POSTGRES_DIR、
#         NAS_REDIS_DIR、NAS_UPLOADS_DIR
#
# ⚠️ 本脚本会 recreate 全部服务，**包括 frpc**——执行期间外网 SSH 隧道会短暂中断。
#    日常只改代码请用 update-backend.sh，它不碰 frpc。

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./_lib.sh
source "${SCRIPT_DIR}/_lib.sh"

require_local_env
sync_code
render_configs

echo "==> 构建并启动全部服务（会重启 frpc，外网 SSH 可能短暂中断）"
ssh "${NAS_HOST}" "cd ${NAS_DEPLOY_DIR} && docker compose -f ${COMPOSE_RENDERED} --env-file ${ENV_FILE} up -d --build"

wait_ready

echo
echo "下一步：确认 ECS 侧 nginx 已加载 babygrow.conf（只需一次），然后"
echo "  curl -I https://api.subetus.top/babygrow/health"
