# babyGrowBackend — 宝宝成长记录 Java 后端

承载**全部业务接口与领域模型**。AI 相关能力不在本服务内，而是转发给独立部署的
Python 服务（`babyGrowAi`）。两个服务的边界规则见 `docs/backend-design.md` §1.2。

## 技术栈

- Java 17 + Spring Boot 3.3.6
- PostgreSQL（业务库 `baby_grow`）+ Spring Data JPA
- Flyway 管 schema，Hibernate `ddl-auto=validate`（只校验，绝不改表）
- Spring Security + JWT（微信 `code` 换 `openid` 后签发）
- Maven Wrapper，无需本地安装 Maven

## 当前进度

### P0 — 地基（已完成）

- 分层骨架：`common` / `config` / `auth` / `access` / `domain` / `repository` / `profile`
- 统一响应包 `{code, data, message}`，含全局异常处理
- **被拒绝的请求也返回标准响应包**——Spring Security 默认回空响应体，而前端只认
  响应体里的 `code`，不处理的话 401 在客户端会表现成"解析失败"
- Flyway 迁移 `V1__init_auth_profile.sql`：`users` / `families` / `family_members` /
  `babies` / `baby_preferences` / `baby_allergens`
- 登录与登录态：`POST /api/auth/login`、`GET /api/auth/me`，首次登录自动开号
  （建家庭 + 建宝宝）
- 宝宝档案读写：`GET/PUT /api/baby/profile-detail`、`GET /api/baby/profile`
- `FamilyAccessService`：数据隔离的唯一入口，后续每个域都从这里取"当前用户看哪个宝宝"

### P1 — 记录闭环（已完成）

**录入 → 识别 → 确认 → 时间线**全链路打通。

- 时间线读写：`GET/POST /api/baby/timeline`
- 媒体上传：`POST /api/baby/media`，本地存储 + 能力 URL 读取
- 文本识别：`POST /api/baby/records/extract`（同步，Java 解析宝宝与月龄后转发 Python）
- 图片识别：`POST /api/baby/records/recognize`（异步）+ `GET /api/baby/ai-tasks/{id}`（轮询）
- 落库：`POST /api/baby/records/commit`
- 数据模型：`records`（唯一事实来源）+ `timeline_entries`（读投影）+ `media_assets` + `ai_tasks`

**两个刻意的设计取舍：**

1. **识别与落库分离**（`recognize` ↔ `commit`）。识别会出错，中间必须留一道人工确认，
   否则错误直接污染时间线与后续的分析投影。
2. **一次提交拆成多条记录**。识别出的里程碑/食物/睡眠各成一条 `records`，时间线上只出
   一张卡片。这样 P2 的分析投影就是直接的字段映射，不必再去解析一坨 JSON。

### P2 — 分析可用（已完成）

分析页的数据全部由服务端从投影表聚合，返回**图表就绪**的结构。

- 四张分析投影表：`sleep_sessions` / `feedings` / `growth_measurements` / `mood_entries`
- 里程碑：`milestone_catalog`（12 条常见里程碑）+ `baby_milestones`（实际达成）
- 参考基准：`growth_standards` / `feeding_standards`，接口下发 `referenceRange` 与逐点参考值
- 9 个分析接口（生长 / 睡眠 / 饮食 / 情绪各域）
- `POST /api/baby/projections/rebuild` —— 投影全量重建

**三个刻意的设计取舍：**

1. **投影按宝宝全量重算，不做增量维护**。写入路径与重建路径共用同一段代码，投影永远不会
   与事实来源漂移。代价是每次写入 O(该宝宝的记录数)，在这个量级可以忽略。
2. **参考基准独立成表**，接口下发而非前端写死。这样图表口径与 AI 规则引擎的口径同源，
   不会出现「图里说 600-800、AI 说已经够了」的矛盾。
3. **接口无条件返回完整结构**（空数据给空数组）。分析页会直接解引用
   `trends[range][metric].points` 这类嵌套字段，返回 null 会让页面崩掉而不是显示空态。

> ⚠️ **`growth_standards` 里是占位值，不是权威数据。** 它们只用于把 referenceRange 链路
> 跑通，`source` 列已标明「占位值-待替换为 WHO 标准表」。正式上线前必须替换为真实数值。
> `feeding_standards` 同理（量级取自常见喂养建议，已标注）。

### P3 — 首页 AI 食谱推荐（已完成）

**首页加载绝不等待 LLM。**

- `daily_recommendations` 缓存表（每宝宝每天一条）
- `GET /api/baby/menu/today` —— 只读缓存，毫秒级返回
- 生成走异步任务；缓存失效时**先返回上一次的结果并标 `stale`**，页面不会空着
- 每日 05:00 定时预生成（`app.menu.pregenerate-cron` 可覆盖）
- 有新的饮食记录时自动把当天推荐标记为过期

**上下文由 Java 组装后随请求传给 AI**：月龄、过敏原（`baby_allergens`）、
近 3 天的辅食（来自 `feedings` 投影）。AI 服务不连业务库。

**读路径的三种情形：**

| 缓存状态 | 行为 |
|---|---|
| 有且新鲜 | 直出，`stale: false` |
| 有过期结果 | 直出旧结果，`stale: true`，后台重算 |
| 完全没有 | 返回空结构 + `stale: true`，后台生成 |

**顺带修掉了 AI 服务里的两个问题**（详见 `babyGrowAi` 的改动）：

1. **`avoid_items` 可能漏掉家长声明的过敏原**。它原本完全取自模型的最终输出，
   而模型并不总会把声明过的过敏原写进去——家长声明了「鸡蛋过敏」却拿到一个空白的
   避免列表，这是安全信息，不能交给模型的记性。现在声明的过敏原始终并进去，
   并在 `services/rules.py` 里加了测试锁住。
2. **`knowledge_chunks.search_vector` 的索引类型错了**。模型里写的是
   `Column(..., index=True)`，Hibernate 会据此建出 **btree** 索引；tsvector 需要的是
   **GIN**。btree 在行内容较大时会超出约 2704 字节上限，导致插入（以及从备份恢复）
   直接失败。既有库能跑是因为那个 GIN 索引是手工建的、不在代码里——**任何人在全新
   环境里 `create_all` 都会踩到**。已改为显式声明的 GIN 索引，索引名与既有库一致。

### P4 — 家庭与心愿（已完成）

- 家庭成员：列出 / 改角色 / 移除，以及**邀请一位还没有账号的亲友**
- 邀请闭环：签发一次性口令 → 对方凭口令加入，此时才挂上账号
- 心愿清单：勾选式与计数式两种形态的新建、清单替换、进度推进、删除
- 家庭记忆：列表与新增

**三个刻意的设计取舍：**

1. **`family_members` 同时容纳"已注册成员"和"已邀请但还没注册的人"**（后者
   `user_id` 为空、只有展示名与一次性口令）。所以访问控制一律以「`user_id` 有值且
   `status=active`」为准——受邀者在接受之前什么都做不了。
2. **心愿的 `id` 由前端生成**（`wish-<时间戳>`），并且它被前端嵌进了详情页路径
   （`?wish=...`）。接口因此必须原样返回它；数据库另用代理主键 +
   `(baby_id, client_key)` 唯一约束，避免跨宝宝撞车。
3. **管理员的约束是硬的**：不能移除自己，不能把最后一个管理员降级或移除，
   **邀请时也不能授予管理员**——把管理员权限通过一个口令发出去太危险。

### P5 — 收尾（已完成）

至此**全站已脱离 mock**：前端 `REAL_API_PATHS` 覆盖全部接口，mock 层只在
「未配置后端地址」时作为离线演示保留。

- 疫苗详情：单数资源（前端展示的是「当前这一针」）
- 里程碑列表：由 `baby_milestones` 投影而来，带分类标签
- 日历事件：接种计划 + 已达成的里程碑，两类数据投影而成
- 每周小记：由最近七天的数据推导
- 分享海报：由宝宝档案 + 最近一条记录推导

**三个刻意的设计取舍：**

1. **不预置疫苗排期表。** 接种月龄是医学排期结论，凭空造一份比留空更糟。
   `vaccine_catalog` 建表但不填数据，接种记录自带名称，将来接权威排期表时再补。
   （生长基准则不同——那是你确认过要预置、由你复核的。）
2. **每周小记的建议文案从数据里读出来**，不是让模型自由发挥：说的是「这周记录了几天
   睡眠、平均几小时、新尝试了什么、达成了几个里程碑」，并明确标注不构成建议。
   AI 撰写的叙述是后续增强，不是现在这一版的半成品。
3. **疫苗的 `datetime` / `nextAppointment` 是自由文本输入框**，所以后端同时负责格式化
   与解析，且两者互为逆运算——用户不动默认值就一定往返成功；手输无法解析的值得到一条
   明确的报错，而不是被静默吞掉。

### 分期完成情况

P0 地基 → P1 记录闭环 → P2 分析可用 → P3 首页 AI → P4 家庭与心愿 → **P5 收尾**，六期全部完成。

两处按设计文档属于 P2、但**有意推迟**的工作（仍保持推迟）：

- **`analysis_snapshots` 预计算**：当前按需从投影聚合。单个宝宝的图表数据量下这远快于
  维护快照的一致性成本；等记录量真的上来再加。
- **Python 侧 Alembic 迁移**：尚未引入。要改 AI 服务的表结构时再引入。

**遗留待办（不在代码里，需要你操作）：**

- `babycare/` 目录只存在于主 checkout（它未被 git 跟踪，不会进 worktree），
  **删除需要你在主目录执行**。它的文档指向已在本轮修正。

## 启动

### 1. 起数据库

```bash
pnpm db:up
```

首次启动会由 `docker/init-postgres/` 下的脚本建出业务库 `baby_grow` 与账号 `babygrow`。
**若数据卷已存在，脚本不会重跑**，需手动补建一次——见 `docker/init-postgres/README.md`。
（切勿用 `docker compose down -v`，那会连 RAG 向量库一起删掉。）

### 2. 起服务

```bash
pnpm dev:backend
```

或在本目录：

```bash
./mvnw spring-boot:run
```

监听 `http://localhost:8080`。首次启动时 Flyway 会自动建表。

### 3. 验证

```bash
curl http://localhost:8080/health
```

未带 token 访问业务接口应当得到 401 且响应体是标准包：

```bash
curl -s http://localhost:8080/api/baby/profile-detail
# {"code":40100,"data":null,"message":"未登录或登录已过期"}
```

## 环境变量

全部只从环境变量读，源码与仓库里没有任何真实凭据（本仓库是公开仓库）。
本地开发可复制 `.env.example` 为 `.env`（已被 gitignore），服务启动时会自动加载。

| 变量 | 默认 | 说明 |
|---|---|---|
| `DB_URL` | `jdbc:postgresql://localhost:5432/baby_grow` | 业务库 |
| `DB_USER` / `DB_PASSWORD` | `babygrow` / `babygrow-dev` | 业务库账号 |
| `AI_SERVICE_URL` | `http://localhost:8001` | Python AI 服务，仅内网 |
| `APP_AUTH_DEV_MODE` | `true` | **为 true 时跳过微信校验**，为固定 dev 用户签发 token。生产必须设 false |
| `JWT_SECRET` | 占位串 | HS256 要求 ≥32 字节，生产必须换成随机值 |
| `JWT_TTL_HOURS` | `720` | 令牌有效期 |
| `WX_APPID` / `WX_SECRET` | 空 | 仅 `APP_AUTH_DEV_MODE=false` 时需要 |

## 接口

### 已实现

| 方法 | 路径 | 鉴权 | 说明 |
|---|---|---|---|
| GET | `/health` | 否 | 存活检查 |
| POST | `/api/auth/login` | 否 | 微信 `code` → JWT |
| GET | `/api/auth/me` | 是 | 当前用户 + 家庭 + 宝宝 + 角色 |
| GET | `/api/baby/profile` | 是 | 精简档案（分析页头部用） |
| GET | `/api/baby/profile-detail` | 是 | 完整档案 |
| PUT | `/api/baby/profile-detail` | 是 | 增量更新（只传要改的字段） |
| POST | `/api/baby/media` | 是 | 上传图片/视频，返回 `mediaId` 与可直读的 `url` |
| GET | `/api/media/{key}` | **否** | 读取媒体。见下方说明 |
| GET | `/api/baby/timeline` | 是 | 时间线（前端 `JourneyEntry[]`） |
| POST | `/api/baby/timeline` | 是 | 直接追加一条（不经 AI 识别） |
| POST | `/api/baby/records/extract` | 是 | 文本识别，同步 |
| POST | `/api/baby/records/recognize` | 是 | 图片/视频识别，异步，返回 `taskId` |
| GET | `/api/baby/ai-tasks/{id}` | 是 | 轮询识别结果 |
| POST | `/api/baby/records/commit` | 是 | 确认后的草稿落库，返回时间线条目 |
| GET | `/api/baby/growth` | 是 | 生长页聚合包（含完整 3 区间 × 3 指标趋势） |
| GET | `/api/baby/growth/trend` | 是 | 单指标趋势对比 |
| GET | `/api/baby/sleep/circadian` | 是 | 昼夜节律（按天） |
| GET | `/api/baby/sleep/logs` | 是 | 当日睡眠明细 |
| GET | `/api/baby/sleep/evolution` | 是 | 睡眠演变（按月龄的典型一天） |
| GET | `/api/baby/diet/weekly` | 是 | 周奶量与建议区间 |
| GET | `/api/baby/diet/monthly` | 是 | 月度辅食构成 |
| GET | `/api/baby/mood/calendar` | 是 | 情绪日历（含前导补位格） |
| GET | `/api/baby/mood/checkin-options` | 是 | 情绪打卡选项 |
| POST | `/api/baby/projections/rebuild` | 是 | 重建当前宝宝的分析投影 |
| GET | `/api/baby/menu/today` | 是 | 首页今日菜单（读缓存，不等 AI） |
| GET | `/api/family/members` | 是 | 家庭成员（含待接受的受邀者） |
| PUT | `/api/family/members` | 是 | 改角色（仅管理员） |
| DELETE | `/api/family/members` | 是 | 移除成员（仅管理员） |
| POST | `/api/family/invite` | 是 | 邀请亲友，返回带一次性口令的待接受成员 |
| POST | `/api/family/invite/accept` | 是 | 凭口令加入家庭 |
| GET | `/api/family/memories` | 是 | 家庭记忆列表 |
| POST | `/api/family/memories` | 是 | 新增记忆 |
| GET | `/api/wishes` | 是 | 心愿列表 |
| POST | `/api/wishes` | 是 | 新建（按前端 id 覆盖式写入） |
| DELETE | `/api/wishes` | 是 | 删除 |
| PUT | `/api/wishes/checklist` | 是 | 整份替换清单 |
| PUT | `/api/wishes/counter` | 是 | 推进计数进度 |
| GET/PUT/DELETE | `/api/baby/vaccine` | 是 | 疫苗详情（单数资源） |
| GET | `/api/baby/milestones-list` | 是 | 已达成的里程碑 |
| GET | `/api/baby/calendar-events` | 是 | 日历事件（疫苗 + 里程碑投影） |
| GET | `/api/baby/weekly-insight` | 是 | 每周小记（由最近七天数据推导） |
| GET | `/api/family/poster` | 是 | 分享海报内容 |
| POST | `/api/baby/recipes/recommend` | 是 | 食谱推荐（服务端在生成缓存时调用；前端不直连） |

**请求体里没有 `baby_id`。** 宝宝一律由服务端从登录态解析——客户端既不必知道内部 id，
也无法伪造别的宝宝。

### 关于 `/api/media/{key}` 不鉴权

小程序的 `<Image src>` **不会携带 Authorization 头**，把媒体读取放在鉴权后面图片就渲染
不出来。安全性由「对象键不可猜测」保证：32 位十六进制随机串本身就是访问凭据，与对象
存储的预签名 URL 是同一思路。读取前会校验键的形状，`../` 之类的路径穿越会被拒。

将来若要求更严，应改成带过期时间的签名 URL，而不是把这个接口挪到鉴权后面。

## 测试

```bash
./mvnw test
```

- `AgeLabelCalculatorTest` — 年龄文案口径，须与前端 `store/profile.ts` 完全一致
- `BabyGrowBackendApplicationTests` — bean 图装配（用内存库，不跑 Flyway）

数据库连通性由上面的「验证」一节手工覆盖。
