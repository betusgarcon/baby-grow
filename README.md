# 宝宝成长记录 · baby-grow（monorepo）

宝宝成长记录微信小程序 + Java 后端 + Python AI 服务。pnpm workspace 单仓管理，方便在一个会话里跨端同步开发。

## 目录结构

```
baby-grow/
├── babyGrowFrontend/       # Taro 3.6 + React 18 + TypeScript 小程序（@baby-grow/frontend）
├── babyGrowBackend/        # Java 17 + Spring Boot 3.2 后端
├── babyGrowAi/             # Python FastAPI AI 服务
├── docs/                   # 项目文档
├── design_sources/         # 设计稿与原型
├── icons/                  # 图标资源
├── tech-summary/           # 技术总结
├── package.json            # workspace 根（聚合脚本）
├── pnpm-workspace.yaml
├── .npmrc                  # shamefully-hoist（Taro 必须）
└── pnpm-lock.yaml          # 唯一 lockfile，位于根目录
```

## 常用命令

在**仓库根目录**执行：

| 命令 | 说明 |
|------|------|
| `pnpm install` | 安装全部 workspace 依赖 |
| `pnpm dev:weapp` | 前端小程序 watch 开发 |
| `pnpm build:weapp` | 前端小程序构建 |
| `pnpm type-check` | 全仓类型检查 |
| `pnpm lint` | 全仓代码规范检查 |
| `pnpm dev:backend` | Java 后端开发（`./mvnw spring-boot:run`） |
| `pnpm ai:setup` | AI 服务初始化（创建 venv + 安装依赖） |
| `pnpm dev:ai` | AI 服务开发（uvicorn hot-reload） |
| `pnpm db:up` | 启动本地数据库（MySQL + Redis） |
| `pnpm db:down` | 停止本地数据库 |
| `pnpm db:logs` | 查看数据库日志 |

## 前端小程序在微信开发者工具中的打开方式

微信开发者工具导入项目时，目录选择 **`babyGrowFrontend/`**（不是仓库根），因为 `project.config.json` 在该子目录内，`miniprogramRoot` 指向 `dist/`。

## 技术栈

- **前端**：Taro 3.6 + React 18 + TypeScript + Tailwind CSS + ECharts
- **后端**：Java 17 + Spring Boot 3.2 + Maven（详见 `docs/backend.md`）
- **AI 服务**：Python 3.11+ + FastAPI + Ollama（详见 `docs/ai_infra.md`）
- **工程**：pnpm workspace + Docker Compose（本地 MySQL + Redis）