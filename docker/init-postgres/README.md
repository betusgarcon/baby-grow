# PostgreSQL 初始化

本目录的 `*.sql` 由官方镜像的 entrypoint 在**数据目录为空时**按文件名顺序执行一次。

| 脚本 | 作用 |
|---|---|
| `01-enable-vector.sql` | 给 `baby_grow_ai` 启用 pgvector 扩展 |
| `02-create-baby-grow-db.sql` | 建业务库 `baby_grow` 与账号 `babygrow` |

## 已有数据卷时怎么办

若你已经跑过数据库（数据卷 `postgres-data` 已存在），**新增的脚本不会自动执行**。

> ⚠️ **不要用 `docker compose down -v`**。那会连数据卷一起删除，而 `baby_grow_ai` 里存着
> RAG 知识库（全部已入库的育儿资料分块与向量）——重建要重跑整条入库流水线。

正确的做法是手动补建，一次性、非破坏性：

```bash
docker exec -i baby-grow-postgres psql -U postgres -d postgres < docker/init-postgres/02-create-baby-grow-db.sql
```

验证：

```bash
docker exec -it baby-grow-postgres psql -U postgres -c "\l" | grep baby_grow
```

应当同时看到 `baby_grow` 与 `baby_grow_ai` 两个库。业务库里的表由后端启动时的
Flyway 迁移创建，不需要手工建。
