#!/usr/bin/env bash
# deploy.sh 与 update-backend.sh 的公共部分。
#
# 为什么抽出来：两个脚本的「同步代码」与「渲染配置」两段必须逐字一致。
# 之前各写一遍，排除清单就是各写一遍的——结果 update-backend.sh 漏了排除
# frpc.toml，它的 rsync --delete 会把 NAS 上那个文件删掉。两处合并成一个来源，
# 这类漂移就不会再发生。
#
# 之所以仍然保留两个入口脚本而不是加一个 --incremental 参数：
# 「全量会重启 frpc、外网 SSH 会短暂断开」这件事必须在**文件名**上就看得出来，
# 藏在一个参数后面太容易点错。

# shellcheck shell=bash

NAS_HOST="${NAS_HOST:-nas}"
NAS_DEPLOY_DIR="${NAS_DEPLOY_DIR:-/vol1/babygrow}"
NAS_POSTGRES_DIR="${NAS_POSTGRES_DIR:-/vol2/1000/postgres/babygrow}"
NAS_REDIS_DIR="${NAS_REDIS_DIR:-/vol2/1000/redis/babygrow}"
NAS_UPLOADS_DIR="${NAS_UPLOADS_DIR:-/vol2/1000/uploads/babygrow}"

NAS_DIR="babyGrowBackend/deploy/nas"
COMPOSE_FILE="${NAS_DIR}/docker-compose.nas.yml"
COMPOSE_RENDERED="${COMPOSE_FILE}.rendered.yml"
FRPC_TEMPLATE="${NAS_DIR}/frpc.toml.template"
FRPC_RENDERED="${NAS_DIR}/frpc.toml"
ENV_FILE="${NAS_DIR}/.env"
EXCLUDES="${NAS_DIR}/rsync-excludes.txt"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"

# 本地这份 .env 是唯一来源：既同步给 NAS 的容器用，渲染阶段也用它取
# FRP_TOKEN / ECS_PUBLIC_IP，省得再维护第二份变量表。
require_local_env() {
  if [ ! -f "${REPO_ROOT}/${ENV_FILE}" ]; then
    echo "❌ 找不到 ${ENV_FILE}"
    echo "   先复制 .env.example 并填好真实值（该文件已被 gitignore，不会入库）"
    exit 1
  fi
}

sync_code() {
  echo "==> 同步代码到 ${NAS_HOST}:${NAS_DEPLOY_DIR}"
  ssh "${NAS_HOST}" "mkdir -p ${NAS_DEPLOY_DIR}"
  # --delete 配合一份共享的排除清单。清单里锚定排除了 NAS 上生成、本地不存在的
  # 文件（frpc.toml 等），否则它们会在每次同步时被删掉。
  rsync -a --delete \
    --exclude-from="${REPO_ROOT}/${EXCLUDES}" \
    "${REPO_ROOT}/" "${NAS_HOST}:${NAS_DEPLOY_DIR}/"
}

render_configs() {
  echo "==> 渲染 compose 与 frpc 配置（替换 {{}} 占位符）"
  set +u
  # shellcheck disable=SC1090
  source "${REPO_ROOT}/${ENV_FILE}"
  set -u
  : "${FRP_TOKEN:?缺少 FRP_TOKEN，请在 .env 里补上}"
  : "${ECS_PUBLIC_IP:?缺少 ECS_PUBLIC_IP，请在 .env 里补上}"

  ssh "${NAS_HOST}" "cd ${NAS_DEPLOY_DIR} \
    && sed -e 's|{{NAS_POSTGRES_DIR}}|${NAS_POSTGRES_DIR}|g' \
           -e 's|{{NAS_REDIS_DIR}}|${NAS_REDIS_DIR}|g' \
           -e 's|{{NAS_UPLOADS_DIR}}|${NAS_UPLOADS_DIR}|g' \
           ${COMPOSE_FILE} > ${COMPOSE_RENDERED} \
    && sed -e 's|{{ECS_PUBLIC_IP}}|${ECS_PUBLIC_IP}|g' \
           -e 's|{{FRP_TOKEN}}|${FRP_TOKEN}|g' \
           ${FRPC_TEMPLATE} > ${FRPC_RENDERED}"
}

# 等后端就绪。两个脚本都靠它判定成功，所以判定条件是同一个——
# 只是「本地 3003 通」不代表「外网能访问」，外网那一段要 ECS 的 nginx 配合。
wait_ready() {
  echo "==> 等待后端就绪（最多 120s）"
  for _ in $(seq 1 24); do
    if ssh "${NAS_HOST}" 'curl -sf http://127.0.0.1:3003/health' >/dev/null 2>&1; then
      echo "✅ 就绪：$(ssh "${NAS_HOST}" 'curl -s http://127.0.0.1:3003/health')"
      return 0
    fi
    sleep 5
  done

  echo "❌ 120s 内未就绪"
  echo "   看日志：ssh ${NAS_HOST} 'docker logs babygrow-api --tail 50'"
  echo "           ssh ${NAS_HOST} 'docker logs babygrow-ai --tail 50'"
  return 1
}
