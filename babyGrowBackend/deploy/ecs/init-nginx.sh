#!/usr/bin/env bash
# 在 ECS 的 api.subetus.top server 块里加上 /babygrow/ 路由。**只需执行一次。**
#
# 用法（仓库根目录执行）：
#   pnpm deploy:init-nginx
#   或  ./babyGrowBackend/deploy/ecs/init-nginx.sh
#
# 为什么单独一个脚本、而不并进 deploy.sh：
# 这台 ECS 同时服务 dailypawn，nginx 改坏会连带影响线上另一个项目。
# 所以这一步只在你显式调用时执行，且只做一次——检测到 location 已存在就空转退出。
#
# **改的是宿主机上的文件，不是容器里的。** /opt/apps/nginx/conf.d 以
# **只读** bind mount 挂进容器（RW=false），在容器内 cp / 重定向都会报
# "Read-only file system"。容器 reload 时会重新读挂载点，所以改宿主机侧即可。
#
# 做法是「取回配置 → 本地拼接 → 推回」，而不是在远端用多层引号的 sed/awk 直接改。
# 嵌套引号（ssh 一层、sh -c 一层）几乎必然出岔子，而配置文件改错一行就是线上事故。
# 本地拼接还有个好处：拼接逻辑可以先在本地用真实配置验证一遍再推。
#
# 安全措施：
#   1. 幂等：已有 /babygrow/ 就直接退出
#   2. 先备份到宿主机；nginx -t 不通过就把备份还原回去，**不 reload**
#   3. 插入点选 `location /dailypawn/ {` 之前——那个锚点只在 api.subetus.top
#      这个 server 块里出现，且两者是同块兄弟节点，插在前面语法上必然成立

set -euo pipefail

ECS_HOST="${ECS_HOST:-ecs-gateway}"
NGINX_CONTAINER="${NGINX_CONTAINER:-nginx}"
# 宿主机路径。容器的 /etc/nginx/conf.d 是它的只读挂载。
CONF_PATH="${CONF_PATH:-/opt/apps/nginx/conf.d/default.conf}"

# 插入锚点。值里带 `{`，**不能**直接写成 ${ANCHOR:-location /dailypawn/ {} ——
# 那个 `{` 会让 bash 的引号/花括号配对错乱，报的是后面某一行「unexpected EOF」，
# 极难定位。拆成两步写就没有这个问题。
ANCHOR="${ANCHOR:-}"
if [ -z "${ANCHOR}" ]; then
  ANCHOR='location /dailypawn/ {'
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRAGMENT="${SCRIPT_DIR}/nginx/babygrow.conf"
[ -f "${FRAGMENT}" ] || { echo "❌ 找不到 ${FRAGMENT}"; exit 1; }

ORIG="$(mktemp)"; NEW="$(mktemp)"
trap 'rm -f "${ORIG}" "${NEW}"' EXIT

echo "==> 目标：${ECS_HOST}:${CONF_PATH}（容器 ${NGINX_CONTAINER} reload）"

if ! ssh "${ECS_HOST}" "test -f ${CONF_PATH}"; then
  echo "❌ 宿主机上读不到 ${CONF_PATH}"
  echo "   确认路径：ssh ${ECS_HOST} 'docker inspect ${NGINX_CONTAINER} --format \"{{range .Mounts}}{{.Source}} -> {{.Destination}}{{println}}{{end}}\"'"
  exit 1
fi

if ssh "${ECS_HOST}" "grep -q 'location /babygrow/' ${CONF_PATH}"; then
  echo "✅ /babygrow/ 已经配好了，无需改动"
  exit 0
fi

echo "==> 取回当前配置"
ssh "${ECS_HOST}" "cat ${CONF_PATH}" > "${ORIG}"

if ! grep -qF "${ANCHOR}" "${ORIG}"; then
  echo "❌ 取回的配置里找不到锚点「${ANCHOR}」"
  echo "   手动把 nginx/babygrow.conf 追加进 api.subetus.top 的 server 块，"
  echo "   然后 docker exec ${NGINX_CONTAINER} nginx -t && docker exec ${NGINX_CONTAINER} nginx -s reload"
  exit 1
fi

echo "==> 本地拼接"
python3 - "${ORIG}" "${FRAGMENT}" "${NEW}" "${ANCHOR}" <<'PY'
import sys

orig_path, frag_path, out_path, anchor = sys.argv[1:5]

with open(orig_path, encoding="utf-8") as handle:
    lines = handle.readlines()
with open(frag_path, encoding="utf-8") as handle:
    fragment = handle.read()
if not fragment.endswith("\n"):
    fragment += "\n"

# 只插一次，插在第一个锚点行之前
index = next((i for i, line in enumerate(lines) if anchor in line), None)
if index is None:
    sys.exit("anchor not found")

# 锚点行上面若紧跟着注释，那是属于 dailypawn 的说明，要留在它自己头上——
# 插到注释之前，否则那几行注释会看起来像是描述 baby-grow 的。
insert_at = index
while insert_at > 0 and lines[insert_at - 1].lstrip().startswith("#"):
    insert_at -= 1

out = lines[:insert_at] + [fragment] + lines[insert_at:]
with open(out_path, "w", encoding="utf-8") as handle:
    handle.writelines(out)

print(f"    在第 {insert_at + 1} 行之前插入 {fragment.count(chr(10))} 行")
PY

if ! grep -q 'location /babygrow/' "${NEW}"; then
  echo "❌ 拼接结果里没有 /babygrow/，中止"
  exit 1
fi
if [ "$(wc -l < "${NEW}")" -le "$(wc -l < "${ORIG}")" ]; then
  echo "❌ 拼接后行数没有增加，中止"
  exit 1
fi

STAMP="$(date +%Y%m%d-%H%M%S)"
echo "==> 备份为 ${CONF_PATH}.bak-${STAMP}"
ssh "${ECS_HOST}" "cp ${CONF_PATH} ${CONF_PATH}.bak-${STAMP}"

echo "==> 写回宿主机"
ssh "${ECS_HOST}" "cat > ${CONF_PATH}" < "${NEW}"

echo "==> nginx -t 验证"
if ssh "${ECS_HOST}" "docker exec ${NGINX_CONTAINER} nginx -t" 2>&1 | sed 's/^/    /'; then
  ssh "${ECS_HOST}" "docker exec ${NGINX_CONTAINER} nginx -s reload"
  echo "✅ 完成。验证：curl -I https://api.subetus.top/babygrow/health"
  echo "   回滚：ssh ${ECS_HOST} 'cp ${CONF_PATH}.bak-${STAMP} ${CONF_PATH} && docker exec ${NGINX_CONTAINER} nginx -s reload'"
else
  echo "❌ 配置校验未通过，**没有 reload**，正在还原备份"
  ssh "${ECS_HOST}" "cp ${CONF_PATH}.bak-${STAMP} ${CONF_PATH}"
  echo "   已还原，nginx 仍按改动前的配置运行。"
  exit 1
fi
