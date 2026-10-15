#!/usr/bin/env bash
# 增量更新 NAS 上的业务容器。**日常发版用这个。**
#
# 用法（仓库根目录执行）：
#   pnpm deploy:prod
#   或  ./babyGrowBackend/deploy/nas/update-backend.sh
#
# 只重建其中一个服务：
#   SERVICES=babygrow-api pnpm deploy:prod
#
# 只重建 babygrow-api 与 babygrow-ai，**不动 frpc / postgres / redis**——
# 重启 frpc 会切断外网 SSH 隧道，把自己关在门外。

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./_lib.sh
source "${SCRIPT_DIR}/_lib.sh"

SERVICES="${SERVICES:-babygrow-api babygrow-ai}"

require_local_env
sync_code

# 这里也渲染一次。frpc.toml 由脚本在 NAS 上生成、本地并不存在，万一它被删掉
# 或首次部署时漏了，增量路径的 `up` 不会把它补回来——而 frpc 容器一旦重启
# （restart: always，NAS 重启也会触发）就挂不上配置，隧道直接断掉。
# 渲染是幂等的，代价只有两条 sed，换掉一类很难排查的故障。
render_configs

echo "==> 只重建：${SERVICES}（不碰 frpc / postgres / redis）"
ssh "${NAS_HOST}" "cd ${NAS_DEPLOY_DIR} && docker compose -f ${COMPOSE_RENDERED} --env-file ${ENV_FILE} up -d --build ${SERVICES}"

wait_ready
