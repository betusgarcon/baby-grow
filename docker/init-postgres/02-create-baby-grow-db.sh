#!/usr/bin/env bash
# 业务库：Java 后端独占，与 AI 的向量库 baby_grow_ai 分开。
#
# 用独立账号隔开是有意的：后端连 babygrow，AI 服务连 postgres/baby_grow_ai。
# 这样「AI 不碰业务库」这条边界由数据库权限强制执行，而不是靠约定。
#
# 库内 schema 由后端启动时的 Flyway 迁移创建，这里只负责建库建号。
#
# **密码从环境变量取，不写死在脚本里。**
# 原先这是个 .sql，里面写死 PASSWORD 'babygrow-dev'，而生产的 .env 用的是随机
# DB_PASSWORD，于是后端一连就是
#   FATAL: password authentication failed for user "babygrow"
# （实测 2026-10-15 首次部署踩到）。生产用已知弱口令本来也不该发生。
#
# 本地开发不设 DB_PASSWORD 时退回同一个默认值，与仓库根 compose 的
# ${DB_PASSWORD:-babygrow-dev} 保持一致，所以本地行为不变。
#
# 注意：本文件由官方 postgres 镜像的 entrypoint 执行，**只在数据目录为空时跑一次**。
# 已有数据卷要改密码得手工 ALTER ROLE，见 README.md。

set -e

: "${POSTGRES_USER:?缺少 POSTGRES_USER}"
: "${POSTGRES_DB:?缺少 POSTGRES_DB}"
DB_PASSWORD="${DB_PASSWORD:-babygrow-dev}"

psql -v ON_ERROR_STOP=1 --username "${POSTGRES_USER}" --dbname "${POSTGRES_DB}" <<SQL
CREATE ROLE babygrow WITH LOGIN PASSWORD '${DB_PASSWORD}';
CREATE DATABASE baby_grow OWNER babygrow;
SQL
