# babyGrowBackend — 宝宝成长记录 Java 后端

## 技术栈

- Java 17 + Spring Boot 3.3
- Maven（Maven Wrapper，无需本地安装 Maven）

## 启动

```bash
# 在仓库根目录
pnpm dev:backend

# 或直接进入本目录
cd babyGrowBackend
./mvnw spring-boot:run
```

服务默认监听 `http://localhost:8080`。

## 健康检查

```bash
curl http://localhost:8080/health
# {"status":"ok","service":"baby-grow-backend"}
```

## 架构规划

详见 `docs/backend.md`。当前为骨架阶段，后续按以下分层推进：

- `gateway-bff/` — 网关与 BFF 层
- `core-service/` — 核心业务服务（宝宝档案、成长记录、家庭协作）
- `job-service/` — 异步任务与后台作业
- `common/` — 通用模块（BOM、工具类）