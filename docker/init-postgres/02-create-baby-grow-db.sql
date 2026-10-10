-- 业务库：Java 后端独占，与 AI 的向量库 baby_grow_ai 分开。
--
-- 用独立账号隔开是有意的：后端连 babygrow，AI 服务连 postgres/baby_grow_ai。
-- 这样「AI 不碰业务库」这条边界由数据库权限强制执行，而不是靠约定。
--
-- 库内 schema 由后端启动时的 Flyway 迁移创建，这里只负责建库建号。

CREATE ROLE babygrow WITH LOGIN PASSWORD 'babygrow-dev';

CREATE DATABASE baby_grow OWNER babygrow;
