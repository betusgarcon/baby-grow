# baby-grow 后端设计（框架 / 接口 / 数据结构）

> 状态：草案 v2，待评审
> 日期：2026-10-09
> 架构基线：**Java 承载全部业务接口与领域模型；Python 只承载 AI 逻辑**
> 依据：`babyGrowFrontend`、`babyGrowAi`、`babyGrowBackend`、`docker-compose.yml`、`package.json`、根 `backend.md` / `ai_infra.md`

---

## 0. 现状实据

先把事实钉死——仓库宣称的三服务架构，只有两个真正存在：

| 组件 | 实据 | 结论 |
|---|---|---|
| `babyGrowAi` | 56 个 py 文件；**3 个接口**；Postgres+pgvector；bge-m3(1024)；BM25+向量 RRF；ReAct Agent（3 工具）；模型网关（路由/熔断/限流/成本）；规则引擎；OTEL + 两张审计表；11 个测试 | **AI 基建完备**，但只有 AI，没有业务 |
| `babyGrowBackend` | 仅 3 个 Java 文件：启动类 + `HealthController`（`GET /health`）+ 一个 contextLoads 测试。pom 只有 web/actuator/test；**无 ORM、无数据源、无鉴权、无迁移** | **空骨架**，零业务代码 |
| `babyGrowFrontend` | 23 页 / 8 个 store 文件 / 17 个 api 模块 / 28 条 mock 路由 | 已按 `{code,data,message}` + `/api/baby/*` 固定契约 |
| `babycare` | git 跟踪 **0** 文件；`src/` 下 **0** 源码；`pnpm-workspace.yaml` 未列；compose 与 package.json 均不引用 | **死残留**，待废弃 |

**`docker-compose.yml` 已经写好了目标架构，只是从未实现：**

```
backend (Java, :8080)  ──AI_SERVICE_URL=http://ai-service:8001──►  ai-service (Python, :8001)
   └── mysql + redis                                                  └── postgres / pgvector
```

`babyGrowBackend/.../application.yml` 里的 `AI_SERVICE_URL` 就是为 Java→Python 这一跳预留的。`package.json` 的 `dev:backend`（`mvnw spring-boot:run`）与 `dev:ai`（`uvicorn`）同此。

**三个硬缺口：**

1. **没有任何业务域表。** `babyGrowAi` 只有 `knowledge_*`、`recipes`、`recipe_ingredients`、`ai_decision_logs`、`llm_call_logs`。没有 baby/user/family/timeline/wish/memory。`baby_id` 只是透传字符串。
2. **AI 契约缺两块拼图。** `ExtractRequest` 声明 `source_type: TEXT/IMAGE/VIDEO` 却**只有 `text` 字段**，无任何媒体载荷；`RecipeRecommendRequest` **不接收饮食记录**，`agent/tools.py:125` 的 `get_recent_diet` 是硬编码 mock。即"图片识别"与"按饮食记录推荐"目前都不成立。
3. **前端没有任何鉴权通道。** `request.ts` 无 token、无 Authorization 头，`baseUrl` 为空、`useMock=true`，且无运行时读取环境变量的代码。多家庭/多成员隔离完全不存在。

**AI 服务未接线部分**：前端 `ai.ts` 已定义 `extractRecordText`、`recommendRecipes` 但**零调用点**；`RecordSheet` 的识别结果是本地 `resolveRecognition` 的罐头数据；语音按钮只写占位并 toast「转文字待后端」；首页 `Today's Menu` 是 `mockMenus` 硬编码，无对应接口。

---

## 1. 总体架构

### 1.1 两个服务，职责不重叠

```
┌───────────────────────────────┐
│  微信小程序 (Taro)             │
└──────────────┬────────────────┘
               │ HTTPS  {code,data,message}   ← 前端只与 Java 通信
               ▼
┌───────────────────────────────────────────────┐
│  babyGrowBackend   (Java 17 + Spring Boot 3.3) │
│  承载：全部业务接口 + 领域模型                   │
│   ├ api/      控制器，统一响应包、异常、鉴权      │
│   ├ domain/   领域模型与服务（聚合、状态流转）    │
│   ├ repo/     持久化（JPA/MyBatis）              │
│   ├ ai/       AI 客户端 + 异步任务编排            │
│   └ job/      定时任务（预生成食谱/周报/月报）     │
│  鉴权：Spring Security + JWT（微信 code 换 openid）│
│  迁移：Flyway                                    │
└───────┬───────────────────────────┬────────────┘
        │                           │ AI_SERVICE_URL（仅内网）
        ▼                           ▼
┌──────────────────┐   ┌────────────────────────────────┐
│ Postgres         │   │ babyGrowAi  (Python FastAPI)   │
│  db: baby_grow   │   │  只做 AI，无业务表、无鉴权       │
│  业务域表         │   │   ├ extractor / recipe_rag     │
│  （Java 独占）    │   │   ├ agent/ (ReAct, 3 tools)    │
└──────────────────┘   │   ├ services/ (retrieval RRF,  │
                       │   │   model_gateway, rules)     │
┌──────────────────┐   │   └ telemetry                  │
│ Redis            │   └───────────┬────────────────────┘
│ 队列 / 缓存       │               │
└──────────────────┘               ▼
                       ┌────────────────────┐
                       │ Postgres           │
                       │  db: baby_grow_ai  │
                       │  向量 + 知识 + 审计 │
                       │  （Python 独占）    │
                       └────────┬───────────┘
                                ▼
                        Ollama（本地模型）
```

### 1.2 四条边界规则（必须焊死）

拆分只有在边界不被侵蚀时才有收益。以下四条是硬约束：

| 规则 | 原因 | 落地手段 |
|---|---|---|
| AI 服务**只监听内网**，不对公网暴露 | 它没有任何鉴权 | compose 不 publish 8001；生产只在内网 DNS |
| AI **不连业务库**，业务上下文随请求传入 | 否则数据所有权糊掉 | 两库、两账号；AI 的 `PG_DSN` 无 `baby_grow` 权限 |
| AI 产出只是**草稿/建议**，落库由 Java 决定 | 识别有错，不能污染时间线与分析投影 | `recognize` 与 `commit` 分离，中间强制人工确认 |
| 前端**只与 Java 通信** | 单一鉴权边界、单一对外契约 | 前端 `baseUrl` 指向 Java；Java 代理转发 AI |

### 1.3 被放弃的选项与代价

- **单 Python 服务**（业务域并入 `babyGrowAi`）：复用最多、改动最小，但业务侧的鉴权/迁移/校验要全部手写，且慢 AI 与快业务同进程。
- **本方案的真实成本**：约 90% 工作量在 Java 侧，而它是 3 个文件。50 个端点、领域模型、鉴权、迁移、异步编排全是从零；且异步编排要用 Java 写（任务表 + 投递 + 轮询 + 超时/重试/幂等）。这是为边界清晰付的价，值不值取决于你是否要长期维护这套边界。

---

## 2. 模块划分

### 2.1 Java 业务服务

| 层 | 职责 | 落点 |
|---|---|---|
| `api/` | HTTP 边界：DTO 校验、统一响应包、异常映射、鉴权注解 | 每域一个 Controller |
| `domain/` | 领域模型 + 服务：聚合根、状态流转、不变量 | 每域一个聚合 |
| `repo/` | 持久化 | 每聚合一个 Repository |
| `ai/` | AI 客户端（HTTP 到 Python）+ 任务编排 | 单一入口，禁止散落调用 |
| `job/` | 定时预生成 | 食谱、周报、月报、投影重建 |

域清单（对齐前端 9 个 store slice + 4 个分析域）：

`auth` · `baby`(档案/偏好/过敏原) · `timeline`(记录流) · `growth` · `sleep` · `diet` · `mood` · `milestone` · `vaccine` · `calendar` · `insight` · `wish` · `memory` · `family` · `media` · `aitask`

### 2.2 Python AI 服务

保持现有结构不动：`extractor` · `recipe_rag` · `agent/` · `services/`（retrieval / model_gateway / rules / embedding / population_router）· `telemetry` · `models`（仅 AI 侧表）。新增的只有"接收业务上下文"的字段。

---

## 3. 接口设计

### 3.1 统一约定

- **响应包**：`{ code:int, data:T, message:string }`，`code===0` 为成功。与前端 `request.ts` 现有解析一致。
- **前端 mock 按 URL 匹配、忽略 method**，同一路径上 GET 与 POST 并存时语义必须清晰。后端按真实语义实现，不沿用 mock 的"路径优先"行为。
- **路径保持不变**：`/api/baby/*`、`/api/wishes/*`、`/api/family/*`。前端 17 个模块已在用，改路径是纯成本。
- **公开面全部由 Java 提供**。前端 `baseUrl` 指向 Java；Python 的 `/api/baby/records/*` 与 `/api/baby/recipes/*` 属**内网接口**，由 Java 转发，不直接对前端开放。
- **鉴权**：除 `/api/auth/login` 外全部要求 `Authorization: Bearer <jwt>`。Java 从 token 取 `user_id`，再校验该 user ∈ 目标 `baby_id` 所属家庭。

### 3.2 全量接口表

图例：**[现]** 前端已调用且有 mock · **[缺]** 前端零调用或不存在但业务必需 · **[legacy]** 前端已定义、无调用点，保留兼容。全部由 Java 提供。

#### 认证
| # | 方法 | 路径 | 说明 |
|---|---|---|---|
| 1 | POST | `/api/auth/login` | **[缺]** 微信 `code` → `openid` → 签发 JWT |
| 2 | GET | `/api/auth/me` | **[缺]** 当前用户 + 家庭 + 宝宝列表 |

#### 宝宝档案
| # | 方法 | 路径 | 说明 |
|---|---|---|---|
| 3 | GET | `/api/baby/profile` | **[现]** 精简档案（分析页头部）：id/name/ageLabel/avatar/gender/birthday |
| 4 | GET | `/api/baby/profile-detail` | **[现]** `ProfileState{name,birthday,info[],preferences[]}` |
| 5 | PUT | `/api/baby/profile-detail` | **[现]** 增量更新 |
| 6 | POST | `/api/baby/media` | **[缺]** 媒体上传 → `{media_id,url}` |
| 7 | GET | `/api/baby/allergens` | **[缺]** 过敏原（供 AI `avoid_items`） |

#### 记录与时间线（录入闭环）
| # | 方法 | 路径 | 说明 |
|---|---|---|---|
| 8 | GET | `/api/baby/timeline` | **[现]** `JourneyEntry[]` |
| 9 | POST | `/api/baby/timeline` | **[现]** 新增记录 |
| 10 | POST | `/api/baby/records/extract` | **[现]** 文本识别（同步 ≤5s）→ 草稿；Java 转发 Python |
| 11 | POST | `/api/baby/records/recognize` | **[缺]** 图片/视频识别（**异步**）→ `{task_id}` |
| 12 | GET | `/api/baby/ai-tasks/{id}` | **[缺]** 轮询任务 → `{status,result?,error?}` |
| 13 | POST | `/api/baby/records/commit` | **[缺]** 确认草稿 → 落库为记录 + 时间线 + 分析投影 |
| 14 | GET | `/api/baby/journey` | **[legacy]** 首页聚合包，已被 8+37 取代 |
| 15 | POST | `/api/baby/journey-logs` | **[legacy]** |
| 16 | POST | `/api/baby/milestones` | **[legacy]** |
| 17 | POST | `/api/baby/menu` | **[legacy]** |

#### 分析（可拿到 / 可用 / 可展示）
| # | 方法 | 路径 | 说明 |
|---|---|---|---|
| 18 | GET | `/api/baby/growth` | **[现]** 生长页聚合包（含 `referenceRange`，见 §6） |
| 19 | GET | `/api/baby/growth/trend` | **[legacy]** 趋势对比 |
| 20 | GET | `/api/baby/sleep/circadian` | **[现]** 昼夜节律 |
| 21 | GET | `/api/baby/sleep/logs` | **[现]** 日睡眠明细 |
| 22 | POST | `/api/baby/sleep/logs` | **[legacy]** 补录睡眠 |
| 23 | GET | `/api/baby/sleep/evolution` | **[现]** 睡眠演变 |
| 24 | GET | `/api/baby/diet/weekly` | **[现]** 周饮食柱状 |
| 25 | GET | `/api/baby/diet/monthly` | **[现]** 月饮食构成 |
| 26 | POST | `/api/baby/diet/ingredients` | **[legacy]** 食材耐受增删 |
| 27 | GET | `/api/baby/mood/calendar` | **[现]** 情绪日历 |
| 28 | GET | `/api/baby/mood/checkin-options` | **[现]** 打卡选项 |
| 29 | POST | `/api/baby/mood/checkin` | **[legacy]** 情绪打卡 |
| 30 | GET | `/api/baby/mood/journal` | **[legacy]** 情绪手账 |
| 31 | GET | `/api/baby/calendar-events` | **[现]** 日历事件（疫苗+里程碑投影） |
| 32 | GET | `/api/baby/weekly-insight` | **[现]** 每周小记（AI 预生成） |
| 33 | GET | `/api/baby/menu/today` | **[缺]** 首页 Today's Menu（见 §5.2） |

#### 疫苗
| # | 方法 | 路径 |
|---|---|---|
| 34 | GET | `/api/baby/vaccine` | **[现]** |
| 35 | PUT | `/api/baby/vaccine` | **[现]** |
| 36 | DELETE | `/api/baby/vaccine` | **[现]** |

#### 里程碑
| # | 方法 | 路径 |
|---|---|---|
| 37 | GET | `/api/baby/milestones-list` | **[现]** |

#### 心愿清单
| # | 方法 | 路径 |
|---|---|---|
| 38 | GET | `/api/wishes` | **[现]** |
| 39 | POST | `/api/wishes` | **[现]** |
| 40 | DELETE | `/api/wishes` | **[现]** |
| 41 | PUT | `/api/wishes/checklist` | **[现]** |
| 42 | PUT | `/api/wishes/counter` | **[现]** |

#### 家庭分享
| # | 方法 | 路径 |
|---|---|---|
| 43 | GET | `/api/family/members` | **[现]** |
| 44 | PUT | `/api/family/members` | **[现]** |
| 45 | DELETE | `/api/family/members` | **[现]** |
| 46 | POST | `/api/family/invite` | **[现]** |
| 47 | POST | `/api/family/invite/accept` | **[缺]** |
| 48 | GET | `/api/family/memories` | **[现]** |
| 49 | POST | `/api/family/memories` | **[缺]** |
| 50 | GET | `/api/family/poster` | **[缺]** |

**共 50 个端点**：21 个前端已调用、14 个 legacy 保留、15 个新增。

#### Python 侧内网接口（不对前端开放）

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/health` | 存活 + Ollama 可达性 |
| POST | `/api/baby/records/extract` | 既有，**新增 `media_id` 字段** |
| POST | `/api/baby/recipes/recommend` | 既有，**新增 `recent_diet` 字段** |
| POST | `/api/baby/records/recognize` | **新增**，媒体识别（返回结构化结果，非任务） |

任务状态机由 **Java** 持有（`ai_tasks` 在业务库）；Python 只负责"给输入、出结果"。

### 3.3 关键接口的请求/响应

**`POST /api/baby/records/recognize`（由 Java 提供，异步）**
```jsonc
// 请求
{ "baby_id": "baby-001", "source_type": "IMAGE", "media_id": "m_8f2c...", "note": "午餐" }
// 响应（立即返回，不阻塞）
{ "code": 0, "data": { "task_id": "t_91ab...", "status": "pending" }, "message": "ok" }
```

**`GET /api/baby/ai-tasks/{id}`**
```jsonc
{ "code": 0, "data": {
    "task_id": "t_91ab...", "status": "succeeded",   // pending|running|succeeded|failed
    "result": { /* ExtractionResult */ }, "error": null }, "message": "ok" }
```

**`POST /api/baby/records/commit`** — 把用户确认后的草稿落库
```jsonc
{ "baby_id": "baby-001", "source": "IMAGE", "media_id": "m_8f2c...",
  "occurred_at": "2026-10-09T12:30:00+08:00",
  "milestones": [], "food": [{"name":"南瓜粥","category":"谷物","is_first":false}],
  "milk": [], "sleep": [], "mood": [] }
// → { "code":0, "data": { /* JourneyEntry */ }, "message":"ok" }
```

**`GET /api/baby/menu/today`**
```jsonc
{ "code": 0, "data": {
    "date": "2026-10-09", "generated_at": "2026-10-09T06:00:12+08:00", "stale": false,
    "items": [ { "id":"1","mealType":"Breakfast","title":"燕麦香蕉糊",
                 "description":"口感顺滑，富含钾。","icon":"breakfast",
                 "source_chunk_ids":[812,834] } ],
    "reason": "本周已引入谷物与水果，蛋白质偏少。",
    "avoid_items": ["整颗坚果","蜂蜜"] }, "message": "ok" }
```

---

## 4. 数据结构设计

### 4.1 库与所有权

**一个 Postgres 实例，两个数据库，两套账号**——这是"统一 Postgres"与"AI 不碰业务库"同时成立的唯一解：

| 库 | 归属 | 内容 | 迁移 |
|---|---|---|---|
| `baby_grow` | **Java 独占** | 全部业务域表 | Flyway |
| `baby_grow_ai` | **Python 独占** | 向量、知识库、食谱、AI 审计 | 现有 `create_all` → 本期引入 Alembic |

`docker-compose.yml` 的 `mysql` 服务**下线**（业务改走 Postgres）；`redis` 保留（Java 的异步任务队列与缓存）。`postgres` 服务需补一条初始化：建 `baby_grow` 库与业务账号（现有 `./docker/init-postgres` 挂载点已就位，加脚本即可）。

### 4.2 核心取舍：事件表 + 读投影

前端有两类彼此冲突的消费方式：

- **时间线**（`JourneyEntry`）是去规范化事件流，按天分组，混装喂食/睡眠/记忆；
- **分析**（growth/sleep/diet/mood）需按类型聚合，JSON 堆在一起无法高效查询。

因此：`records` 为**唯一事实来源**（append-only，`kind` + `payload JSONB`），四个**分析投影表**在同事务内写入，`timeline_entries` 为首页/时间线的投影。投影可从 `records` 重建。

### 4.3 表清单（库 `baby_grow`，Java 独占）

**身份与家庭**

| 表 | 关键字段 |
|---|---|
| `users` | id, wx_openid(uniq), wx_unionid, nickname, avatar_url, created_at |
| `families` | id, name, owner_user_id, created_at |
| `family_members` | id, family_id, user_id, role(`admin`\|`contributor`\|`viewer`), status(`active`\|`pending`), invite_token, invited_by, joined_at · uniq(family_id,user_id) |
| `babies` | id, family_id, name, birthday, gender, avatar_url, badge |
| `baby_preferences` | id, baby_id, kind(`food`\|`activity`), label, value, icon, sort |
| `baby_allergens` | id, baby_id, allergen, severity, note · ← 供 AI `avoid_items` |

**记录与时间线**

| 表 | 关键字段 |
|---|---|
| `records` | id, baby_id, kind(`feeding`\|`sleep`\|`mood`\|`growth`\|`milestone`\|`memory`), occurred_at(tz), source(`TEXT`\|`IMAGE`\|`VIDEO`\|`MANUAL`), payload(JSONB), media_id, ai_task_id, created_by, created_at |
| `timeline_entries` | id, baby_id, record_id, date, type, filter_key, time, badge, title, description, amount, method, duration, progress, waking_count, image_url, sort_key · idx(baby_id,date desc) |
| `media_assets` | id, owner_user_id, baby_id, kind(`image`\|`video`\|`audio`), object_key, url, mime, bytes, width, height, duration_ms |

**分析投影**

| 表 | 关键字段 |
|---|---|
| `sleep_sessions` | id, baby_id, record_id, start_at, end_at, duration_min, session_type(`night`\|`nap`\|`awake`), quality · idx(baby_id,start_at) |
| `feedings` | id, baby_id, record_id, occurred_at, kind(`milk`\|`solid`), food_name, food_category, amount_ml, is_first |
| `growth_measurements` | id, baby_id, record_id, measured_at, height_cm, weight_kg, head_cm |
| `mood_entries` | id, baby_id, record_id, occurred_at, mood, trigger, note |
| `baby_milestones` | id, baby_id, milestone_key, title, description, unlocked_at, tier, icon, tags(JSONB) |
| `milestone_catalog` | key, title, description, icon, tier, expected_age_min_month, expected_age_max_month, tags(JSONB) |

**参考基准（§6 的服务端来源）**

| 表 | 关键字段 |
|---|---|
| `growth_standards` | id, metric(`height`\|`weight`\|`head`), gender, age_month, p3, p50, p97, source, version |
| `feeding_standards` | id, kind(`milk`\|`solid`), age_month, recommended_min, recommended_max, unit, source, version |

**疫苗 / 心愿 / 记忆**

| 表 | 关键字段 |
|---|---|
| `vaccine_catalog` | id, name, dose_no, recommended_age_month, is_required |
| `baby_vaccinations` | id, baby_id, vaccine_id, status, administered_at, location, administered_by, dose_label, dose_progress, next_appointment, next_note, notes, attachment_media_id |
| `wishes` | id, baby_id, kind(`checklist`\|`counter`), title, description, detail_subtitle, goal, unit_label, icon, circle_class, path, badge, expert_tip, counter_current, counter_target, counter_unit, sort |
| `wish_checklist_items` | id, wish_id, title, note, done, sort |
| `memories` | id, family_id, baby_id, category, title, memory_date, tone, tags(JSONB), media(`Media`\|`Text`), media_id, tags_text · ← 关键词搜索目标 |

**AI 任务与派生**

| 表 | 关键字段 |
|---|---|
| `ai_tasks` | id, baby_id, task_type(`extract_text`\|`recognize_media`\|`weekly_insight`\|`monthly_summary`\|`menu_today`), status(`pending`\|`running`\|`succeeded`\|`failed`), input_ref, result(JSONB), error, attempt, created_at, started_at, finished_at · idx(status,created_at) |
| `daily_recommendations` | id, baby_id, date, payload(JSONB), reason, avoid_items(JSONB), source_refs(JSONB), generator_model, generated_at, invalidated_at · uniq(baby_id,date) |
| `analysis_snapshots` | id, baby_id, scope, period_start, period_end, payload(JSONB), computed_at · uniq(baby_id,scope,period_start) |
| `weekly_insights` | id, baby_id, week_start, range_label, metrics(JSONB), sleep(JSONB), highlights(JSONB), advice(JSONB), generated_at |

### 4.4 库 `baby_grow_ai`（Python 独占，既有不动）

`knowledge_documents` · `knowledge_chunks`(vector 1024) · `recipes` · `recipe_ingredients` · `ai_decision_logs` · `llm_call_logs`。

### 4.5 一致性与重建

- **写路径**：`POST /api/baby/records/commit` → Java 单事务内写 `records` + 分析投影 + `timeline_entries`，并把 `daily_recommendations` 当日记录置 `invalidated_at`。
- **读路径**：分析接口优先读投影；`analysis_snapshots` 命中直出。
- **重建**：Java 侧提供 `POST /api/admin/rebuild-projections?babyId=`（或 CLI），从 `records` 重算全部投影与快照。
- **跨服务一致性**：AI 结果只落在 `baby_grow_ai` 的审计表与 `ai_tasks.result`；**业务表的最终写入永远在 Java 事务内**，不受 AI 服务可用性影响（AI 挂掉时任务标记 failed，业务数据不脏）。

### 4.6 迁移

- Java：**Flyway**，从第一天就有版本化迁移。
- Python：现有 `Base.metadata.create_all` **必须换 Alembic**——AI 侧表已上线，靠 `create_all` 无法演进。

---

## 5. AI 集成设计

### 5.1 录入识别链路

```
用户在 RecordSheet 输入
 ├ 文本 ──► POST /api/baby/records/extract（Java 转发 Python，同步 ≤5s）──► 草稿
 └ 图片/视频 ─► POST /api/baby/media（上传）─► POST /api/baby/records/recognize（Java 建 ai_task）
        │                                   │
        │                          Java → Python 异步调用
        │                                   ▼
        │                     Python: extractor / Qwen2.5-VL ─► 结果回写 ai_task
        ▼                                   │
  前端轮询 GET /api/baby/ai-tasks/{id} ◄────┘
        │
   展示识别结果（可编辑）
        │
   POST /api/baby/records/commit ─► Java 事务落库 + 投影
```

- **文本**同步：沿用 `extractor.extract`，满足 5s 指标。
- **图片/视频必须异步**：VLM 约 10s，视频抽帧约 25-30s。Java 建 `ai_task` 立即返回，前端轮询。
- **Python 侧契约需扩展**：`ExtractRequest` 增加 `media_id: Optional[str]`（**字段新增，向后兼容**，不破坏 `ai.ts`）；新增 `POST /api/baby/records/recognize` 接收 `media_id` 并返回结构化结果。媒体本身由 Java 的 `media_assets` 管理，Python 按 URL 取图，**不共享文件系统**。
- **语音**：等同音频 → `media_id` → `recognize`（需 ASR/VLM 支持，放后期）。
- **草稿不可信。** `confidence` 目前在 `extractor.py` 里硬编码 `1.0`。`recognize`/`extract` 与 `commit` 分离就是为了强制人工确认，否则识别错误会直接污染时间线与分析投影。

### 5.2 首页主数据 → AI 食谱推荐

**核心约束：首页加载不能等 AI。** `recommend` 实测 14-15s，同步塞进首屏会拖死加载。

设计为**预生成 + 缓存读取**：

```
触发（Java 定时任务 / 事件）                    读路径（同步，毫秒级）
 ├ 每日 05:00 定时                   ┐
 ├ feeding 记录落库后失效            ├──► GET /api/baby/menu/today
 └ daily_recommendations 被置失效    ┘      └─► 命中直出
                                            └─► 未命中 → 返回上次结果 + stale:true
                                                并投递异步生成任务
```

- `GET /api/baby/menu/today` **永不阻塞在 LLM 上**，只读 `daily_recommendations`。
- 生成由 Java `job/` 驱动：取该宝宝近 N 天 `feedings` + `baby_allergens` + 月龄 + `baby_preferences`，组装后调 Python。
- **必须补齐 Python 侧缺口**：`RecipeRecommendRequest` 增加 `recent_diet` 字段（或让 `get_recent_diet` 工具改为由请求注入），替换 `agent/tools.py:125` 的硬编码 mock。**这是"按宝宝饮食记录推荐"成立的前提。**
- 响应带 `source_refs`（现有 `SourceRef{document_id,chunk_id,title,content,similarity}`），首页可展开"依据来自哪本指南"。

### 5.3 每周小记 / 月度总结

同走异步预生成，落 `weekly_insights` / `analysis_snapshots`；`GET /api/baby/weekly-insight` 只读库。`getWeeklyInsight` 已是 **[现]** 接口，接线即可。

### 5.4 AI 服务稳定性

模型网关已具备路由/回退/熔断/限流/成本追踪。Java 侧需对应实现：**调用超时、重试上限、降级**（AI 不可用时 `menu/today` 返回上次结果并置 `stale`，识别任务置 `failed` 并允许用户手动补录）。

---

## 6. 分析模块的数据供给

要求是"可拿到、可用、可展示"：

| 要求 | 手段 |
|---|---|
| **可拿到** | 每个分析端点声明响应模型，与前端 `src/types/{growth,sleep,diet,mood}.ts` 既有类型**逐字段对齐**——那批类型是上一轮定好的契约，后端按它实现，前端不改 |
| **可用** | 数据来自 §4.3 投影表，聚合下推 SQL（`date_trunc` 分组），不在应用层拉全量再算；周/月粒度落 `analysis_snapshots` |
| **可展示** | 返回**图表就绪**结构（`{bars[],averageLabel,standardLabel,insight}`），直接喂 ECharts，`analysisChartOptions.ts` 无需改动 |

**参考基准改为后端下发。** 前端 `analysisChartOptions.ts` 里现在写死了 `y-max 850`、`markLine y=680`、`standardRange [600,800]`。改为：

- 基准存 `growth_standards` / `feeding_standards`（按性别 + 月龄 + 指标，带 `source` / `version`），便于随指南更新。
- `GET /api/baby/growth`、`/api/baby/diet/weekly` 等响应**新增 `referenceRange` 字段**（如 `{min:600,max:800,axisMax:850,source:"婴幼儿辅食添加营养指南",version:"2026-1"}`）。
- 前端把写死的常量换成读取该字段；缺省时回退旧常量，保证平滑切换。
- 好处：图表口径与 AI 推荐的规则口径**同源**（`services/rules.py` 的月龄→质地映射也读同一套标准），不会出现"图里说 600-800、AI 说已经够了"的矛盾。

---

## 7. 认证与安全

- **登录**：`wx.login()` → `code` → `POST /api/auth/login` → Java 用 `code` 换 `openid`（`jscode2session`）→ 建/查 `users` → 签发 JWT（含 `user_id`）→ 前端 `Taro.setStorageSync` 存储，`request.ts` 注入 `Authorization`。
- **隔离**：所有 `baby_id` / `wish_id` / `memory_id` 读写都要经"user ∈ baby 所属 family"校验。**这是当前完全缺失的一环**，也正是 `family` 模块（admin/contributor/viewer）的真正意义。建议在 `repo` 层用统一的 `@RequireFamilyAccess` 拦截，避免逐接口手写。
- **AI 服务**：无鉴权，靠**网络隔离**兜底（仅内网、不 publish 端口）。Java→Python 调用走内网地址。
- **凭据**：延续现有做法——只读环境变量，`.env` 永不入库，`.env.example` 只有占位符。新增的微信 `APPID`/`SECRET`、对象存储密钥、JWT 签名密钥同理。**仓库是公开的。**
- **媒体**：`POST /api/baby/media` 服务端校验 MIME/大小，落对象存储，DB 只存 `object_key`。

---

## 8. 分期交付

工期主体在 Java 侧。

| 阶段 | 内容 | 产出 | 关键前置 |
|---|---|---|---|
| **P0 地基** | Spring 骨架（api/domain/repo 分层）、统一响应包与全局异常、Flyway、`baby_grow` 库与账号、Spring Security + `/auth/login`、`/api/baby/profile[-detail]` 读写 | 前端可关 mock 登录并读到真实档案 | 先稳住 `babyGrowAi`；compose 下线 mysql、建 `baby_grow` |
| **P1 记录闭环** | `timeline` 读写、`media` 上传、`extract` 转发、`recognize`+`ai-tasks` 异步、`records/commit` 落库与投影；Python 侧补 `media_id` 与 `recognize` | **录入 → 识别 → 确认 → 时间线**全链路真实 | P0 |
| **P2 分析可用** | 四个分析域的投影表 + 聚合接口 + `analysis_snapshots` + `referenceRange` 下发；Python 侧 Alembic | 分析页脱离 mock，基准后端下发 | P1（依赖记录数据） |
| **P3 首页 AI** | `daily_recommendations`、生成 job、`menu/today`；Python 侧补 `recent_diet` | 首页主数据真实且带 AI 推荐 | P2 |
| **P4 家庭与心愿** | family/members/invite、wishes、memories（含关键词搜索） | 家庭分享模块真实 | P0 |
| **P5 收尾** | 疫苗、日历投影、weekly-insight、poster；`babycare` 清理与 `tech-summary/token_design.md` 改指向 | 全站脱离 mock | P4 |

每阶段收尾跑 `tsc --noEmit` + `pnpm build:weapp`，并在真机连一遍该阶段跳转链路。

---

## 9. 已定决策与遗留

**已定：**

1. 架构：Java 承载业务与领域模型；Python 只承载 AI。（§1）
2. 存储：统一 Postgres，一实例两库两账号。（§4.1）
3. `docker-compose.yml` 的 `mysql` 服务**下线**，业务改走 Postgres；`backend` 服务的 `depends_on` 相应调整。（§4.1）
4. 分析基准：后端下发，新增 `referenceRange`；**种子数据由我预置、交你复核**——生长基准取 WHO 儿童生长标准，膳食基准从已入库 6 本资料抽取，逐条标注 `source` / `version`。（§6）
5. 首期：P0 地基。（§8）
6. `babycare` 废弃。（§10）

**遗留（不阻塞 P0）：**

1. `babyGrowAi` 在**主 checkout** 处于暂存删除状态（125 文件 / 21k 行）。本 worktree 内容完整、不受影响，P0 可正常推进；但主 checkout 那处状态需你在那边决断——**不要直接 `git commit`**，否则会把这 2.1 万行一次性提交。
2. 需你提供：微信小程序 `APPID` / `SECRET`、JWT 签名密钥、对象存储凭据。一律走 `.env`，不入库（仓库公开）。

---

## 10. babycare 废弃

实据：git 跟踪 **0** 文件；`src/` 下 **0** 源码；`pnpm-workspace.yaml` 未列；compose 与 package.json 均不引用。它是 `babyGrowFrontend` 的旧编译残留。

- **不可从版本库恢复**（本就未入库），但源码早已丢失，无价值可失。
- **必须同时处理**：`tech-summary/token_design.md:13-15` 仍把 `babycare/tailwind.config.js` 与 `babycare/src/.../analysisTokens.ts` 标为"全局/模块 Token"的权威出处——删目录的同时改指向 `babyGrowFrontend/tailwind.config.js`，否则后续每个按 token 表干活的人都会被误导。
- `docs/common-pitfalls.md:350` 与 `babyGrowFrontend/project.tt.json` 的 `projectname:"babycare"` 是文本残留，无功能影响，可一并清理。

---

## 附：证据出处

- 前端端点与 store：`babyGrowFrontend/src/{api,store,mock,utils,types}`
- AI 契约：`babyGrowAi/src/app/models.py`、`routers/{extract,recipe}.py`
- AI 集成缺口：`babyGrowAi/src/app/agent/tools.py:125`（`get_recent_diet` mock）、`models.py`（`ExtractRequest` 无媒体字段）
- 架构与基础设施：`docker-compose.yml`、`package.json`、`babyGrowBackend/src/main/resources/application.yml`
- 早期规划（未落地）：根 `backend.md`、`ai_infra.md`
