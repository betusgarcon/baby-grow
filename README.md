# baby-grow-mini/README.md
# Baby Grow Mini

宝宝成长记录小程序。

## 技术栈
- 前端：Taro + TypeScript + Tailwind CSS
- 后端：Node.js + Express
- CI/CD：GitHub Actions
- 安全：CodeQL + Dependabot

## 项目结构
- `babycare/` — Taro 小程序本体
- `server/` — 后端 API
- `docs/` — 项目文档
- `design_sources/` — 设计稿

## 快速开始
```bash
cd babycare
npm install
npm run dev:weapp
```

## CI/CD
- 前端 CI：lint + 类型检查 + 构建
- 后端 CI：lint + 单元测试 + 集成测试
- 安全：CodeQL 扫描 + Dependabot
