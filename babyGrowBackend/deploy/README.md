# baby-grow 生产部署手册

部署到与兄弟项目 **dailypawn** 共用的那套基础设施上：ECS 做边缘（Nginx + FRP Server），
NAS 跑业务容器与数据库，两者之间用 FRP 隧道打通。

```
微信小程序
  ↓ HTTPS  api.subetus.top/babygrow/*
ECS Nginx（443，*.subetus.top 通配符证书，acme.sh 自动续期）
  ↓ proxy_pass http://frps:3003
frps（ECS，Docker 内网）
  ↓ FRP 隧道
frpc（NAS，host 网络）
  ↓
babygrow-api（Java，NAS host 127.0.0.1:3003 → 容器 8080）
  ↓ compose 内网
babygrow-ai（Python :8001）── postgres（两个库）── redis
```

与 dailypawn 各用各的 compose 工程、各自的 FRP 隧道与数据目录，互不干扰。

---

## 指令总览

在仓库根目录执行（`pnpm` 脚本只是把下面的脚本包了一层好记的名字）。

| 命令 | 作用 | 频率 |
|---|---|---|
| `pnpm deploy:init-nginx` | 在 ECS 的 nginx 上加 `/babygrow/` 路由 | **一次性** |
| `pnpm deploy:init-data` | 把本地知识库向量库搬到 NAS | **一次性** |
| `pnpm deploy:prod:full` | 全量部署（**会重启 frpc**，外网 SSH 短暂中断） | 首次 / compose 有变 |
| `pnpm deploy:prod` | 增量发布后端与 AI 服务 | **日常改后端** |
| `pnpm dev:weapp:online` | 本地跑前端、后端指线上 | **日常看效果** |
| `pnpm dev:weapp` | 本地跑前端、后端指本地 | 本地联调 |

典型的日常循环：

```bash
pnpm deploy:prod          # 改完后端 → 发到线上
pnpm dev:weapp:online     # 前端本地跑，直接看线上效果
```

纯改前端时不用发版，`pnpm dev:weapp:online` 存盘即生效。

---

## 一、部署前必须改的配置（都是本地开发值）

| 位置 | 当前 | 生产要求 |
|---|---|---|
| `babyGrowFrontend/.env.production` | `http://localhost:8080` | `https://api.subetus.top/babygrow` |
| `APP_AUTH_DEV_MODE` | `true` | **`false`**（true 等于谁都能登进来） |
| `JWT_SECRET` | 占位串 | ≥32 字节随机值 |
| `WX_APPID` / `WX_SECRET` | 空 | 小程序凭据（公众平台 → 开发管理 → 开发设置） |
| `MEDIA_PUBLIC_BASE` | `http://localhost:8080` | `https://api.subetus.top/babygrow` |
| `DEMO_DATA_ENABLED` | `true` | **`false`** |
| `AI_MODEL_SOURCE` | 无 | `gateway` |
| `EXTERNAL_MODEL_*` | 空 | DeepSeek 的 key / base_url / model |
| `WISH_COVER_ENABLED` | 无（默认关） | 想要 AI 心愿头图时设 `true` |
| `IMAGE_MODEL_*` | 空 | 硅基流动的 key / model，见下节 |
| `project.config.json` 的 `urlCheck` | `false` | **保持 `false`**（见下） |

> `urlCheck` 只影响**开发者工具本地**是否校验域名——上传后由微信平台强制校验，
> 所以它对生产没有影响。保持 `false` 是为了本地联调时 localhost 能被放行；
> 真机连生产域名时，平台侧的校验照常生效。

### 本地到底是连哪个后端

Taro 的 `--mode` 决定读哪个 `.env` 文件，`mode` 默认跟着 `--watch` 走。两条 watch 命令的区别只在这里：

| 命令 | mode | 读 | 连 |
|---|---|---|---|
| `pnpm dev:weapp` | development | `.env.development` | 本地 `localhost:8080` |
| `pnpm dev:weapp:online` | production | `.env.production` | 线上 `api.subetus.top/babygrow` |
| `pnpm build:weapp` | production | `.env.production` | 线上（发布构建，压缩混淆） |

**注意 `--watch --mode production` 这个组合**：webpack 仍是开发模式（不压缩，便于调试），
但后端地址取自 `.env.production` —— 看起来在本地开发，请求却打到线上。
这是最容易踩的坑（现象是本地请求打到生产域名、返回 404），所以 `config/index.ts` 在每次
构建开头会打一行 `[taro] mode=... → 读取 .env.xxx`，这个组合还会额外 `console.warn` 一次。

另：`pnpm build:weapp` 会把 `dist/` 覆盖成生产构建。本地要退回连 localhost，
重新 `pnpm dev:weapp` 即可（`dist/` 是构建产物，每次都会整体重写）。

---

## 二、首次部署（六步）

### 1. ECS：加 nginx 路由

```bash
pnpm deploy:init-nginx
```

一次性的初始化。脚本会：检测 `/babygrow/` 是否已存在（幂等）→ 备份 nginx 配置 →
把 `deploy/ecs/nginx/babygrow.conf` 插到 **api.subetus.top 的 server 块**内 →
`nginx -t` 验证通过才 reload；**验证不通过就还原备份、不 reload**。

之所以单独成一个显式调用的脚本而不是并进发布流程：这台 ECS 同时服务 dailypawn，
nginx 改坏会连带影响另一个线上项目，不适合让它跟着每次发版自动跑。

默认走 `ecs-gateway` 这个 SSH 别名（`~/.ssh/config` 里已有）。别名不同时：

```bash
ECS_HOST=<别名> pnpm deploy:init-nginx
```

只加 location、不动整块 server——那一块里还有 dailypawn 的路由。

### 1b. ECS：把 3003 加进 frps 的端口白名单（**容易漏，漏了隧道必失败**）

`frps.toml` 里有一份 `allowPorts` 白名单，客户端只能绑列出的端口：

```toml
allowPorts = [
  { start = 2222, end = 2222 },   # dailypawn 的 SSH
  { start = 3002, end = 3002 },   # dailypawn 的 API
]
```

**里面没有 3003 时，frpc 能登录成功、但建隧道会被拒绝**，日志长这样：

```
login to server success, get run id [...]
proxy added: [babygrow-api]
[babygrow-api] start error: port not allowed
```

而表现只是公网一律 **502**，很容易一路去怀疑 nginx / frpc / 端口映射（实际排查时就绕了一圈）。
补一行即可：

```toml
  { start = 3003, end = 3003 },   # baby-grow 的 API
```

改的是 ECS 上的 `/opt/apps/frps.toml`（容器里是只读挂载的 `/etc/frp/frps.toml`）。
**注意这一步会短暂影响 dailypawn**：重载或重启 frps 期间它那两条隧道（2222 / 3002）也会断几秒。
能接受就 `docker restart frps`；想尽量不断线可先试 `docker kill -s HUP frps`（frp 支持 HUP 重载，
但 `allowPorts` 是否随之生效未实测），不行再重启。

### 2. NAS：准备目录与环境变量

```bash
ssh nas 'mkdir -p /vol1/babygrow /vol2/1000/{postgres,redis,uploads}/babygrow'
```

复制 `deploy/nas/.env.example` 为 `.env` 并填真实值。`.env` 已被 gitignore，**不要提交**。
除了 `{{}}` 占位符，还要补两个部署脚本会读的变量：

```
FRP_TOKEN=<与 ECS frps.toml 里的 auth.token 一致>
ECS_PUBLIC_IP=<ECS 公网 IP>
```

### 3. 迁移向量库（**不要跳过**）

`baby_grow` 业务库由后端启动时的 Flyway 自动建，不用管。
但 `baby_grow_ai` 里的**知识库分块**必须带过去——那是 RAG 检索的全部依据，
缺了它食谱推荐会静默降级成「纯规则」（不报错，只是不再引用任何指南）。
那批数据是本地灌进去的，只能这样搬：

```bash
pnpm deploy:init-data
```

它做三件事：本地 `baby_grow_ai` 流式 dump（不落临时文件）→ 远端 `pg_restore`
→ 比对两边行数。**目标库非空时会拒绝执行**，避免误把线上覆盖掉；
确认要重灌时用 `FORCE=1 pnpm deploy:init-data`。

先起 postgres 才能迁移，所以本步骤与下一步的顺序是：先跑全量部署把容器拉起来，
再回来执行本步骤。（或者：本步骤报「容器不存在」时照它提示先跑全量。）

### 4. 全量部署业务容器

```bash
pnpm deploy:prod:full
```

它会：同步代码到 NAS（`rsync --delete` + 一份共享排除清单）→ 渲染 compose 与
frpc 配置 → `docker compose up -d --build` 全部服务 → 轮询健康检查。

### 5. 打通隧道

第 4 步已把 `frpc.toml.template` 渲染成实际的 `frpc.toml`（替换 ECS 地址与 token）。
确认 frpc 容器起来了：

```bash
ssh nas 'docker logs babygrow-frpc --tail 20'
```

### 6. 端到端验证

```bash
curl -I https://api.subetus.top/babygrow/health     # 期望 200
curl -s https://api.subetus.top/babygrow/api/baby/profile-detail   # 期望 40100（未登录，说明鉴权在生效）
```

最后一步跑不通时，**按顺序**排查：nginx 配置加载了没 → frps 收到隧道没 →
NAS 上 `curl 127.0.0.1:3003/health` 通不通 → 再看容器日志。

---

## 三、日常发版

### 发布

```bash
pnpm deploy:prod
```

一条命令完成：同步代码 → 重建 `babygrow-api` 与 `babygrow-ai` → 等健康检查通过。
**不碰 frpc / postgres / redis**——重启 frpc 会切断外网 SSH、把自己关在门外，
所以全量脚本只用于首次部署或 compose 配置有变更时。

只更新其中一个服务：

```bash
SERVICES=babygrow-api pnpm deploy:prod
```

数据库迁移不用手工执行：`babygrow-api` 启动时 Flyway 会自动应用
`db/migration/` 下新增的脚本。

### 发布后在本地看着线上效果

```bash
pnpm dev:weapp:online
```

这是 `--watch` 构建（不压缩、带 sourcemap，便于调试），但后端地址取自
`.env.production`，也就是直接对着线上 API 跑。改前端代码即时生效，改后端代码
重新 `pnpm deploy:prod` 即可，不需要把小程序传到微信。

本地连本地仍用 `pnpm dev:weapp`（读 `.env.development`）。两者的区别与那个
`--watch --mode production` 的坑，见第一节末尾的表格。

---

## 四、模型后端开关

`AI_MODEL_SOURCE` 决定文本类任务（识别、食谱）走哪一侧：

| 值 | 文本提取 / 食谱生成 | embedding | 本机不可达时 |
|---|---|---|---|
| `gateway`（默认） | 云端（DeepSeek） | 本机 `bge-m3` | RAG 降级到规则引擎 |
| `local` | 本机 Ollama | 本机 `bge-m3` | 自动降级到云端 |

**embedding 在两种模式下都指向本机**，这是硬约束：知识库向量是用 `bge-m3` 生成的，
换 embedding 模型等于换了一个向量空间，检索会**静默失准**（不报错，只是召回全错）。
要换必须先整库重新向量化。

本机不可达时，`recipe_rag.py` 会跳过检索、带着空的 knowledge context 继续走模型，
而不是让整个推荐失败——规则引擎（月龄、过敏原、质地）本身就能给出安全可用的建议。

切换只需改 `.env` 里的这一个值，然后 `update-backend.sh` 重建 `babygrow-ai`。

### 云端模型：接推理模型必须关 thinking

用 DeepSeek 的 `deepseek-flash` 时，`.env` 里 **`EXTERNAL_MODEL_DISABLE_THINKING` 必须是 `true`**。

实测（2026-10-15，首次真打云端）：`deepseek-flash` 是推理模型，每次调用先烧两百多个
推理 token；抽取的提示词很长（system + 6 组 few-shot），推理量随之涨到把
`AI_MAX_TOKENS=1024` 吃光，`content` 返回空——前端看到的是整条抽取 503，
日志里只有一句 `Empty model response`。

关掉之后：同一个请求 36 个 token、零推理，**从 27s 降到 0.9s**，也不再有空响应。

```
EXTERNAL_MODEL_NAME=deepseek-flash
EXTERNAL_MODEL_DISABLE_THINKING=true
```

换成非推理模型、或指向原生 OpenAI 端点时置回 `false`——`thinking` 是 DeepSeek 的
私有参数，别家会以「未知字段」拒绝。

---

## 五、心愿头图的图像生成

心愿的头图由文生图模型生成，走**硅基流动**，与上面那套文本路由完全独立：

- Ollama **不支持出图**，所以这一路**没有本机退路**，`AI_MODEL_SOURCE` 对它不起作用；
- 它也不进 `model_gateway` 那套抽象——那是 chat 形状的，套不进「入参是 prompt、返回是图片字节」。

两处开关，都在 NAS 的 `.env` 里：

| 变量 | 作用 | 默认 |
|---|---|---|
| `IMAGE_MODEL_API_KEY` | 硅基流动的 API Key（AI 服务侧） | 空 = 能力整体关闭 |
| `WISH_COVER_ENABLED` | 新建心愿后是否排队出图（后端侧） | `false` |

**默认是关闭的，这不是偷懒而是必要的**：出图打的是外部付费接口，没配 key 就打开，只会让
每条新心愿静默变成 `failed`。关闭时头图位置显示渐变占位，心愿的勾选/计数/删除全部照常。

开启步骤：

```bash
# NAS 上的 .env 补这两行，然后重建 ai 与 api 两个服务
IMAGE_MODEL_API_KEY=sk-xxxxxxxx
WISH_COVER_ENABLED=true

./babyGrowBackend/deploy/nas/update-backend.sh
```

**首次开启前必须先实测接口形状。** `image_gateway.py` 里的请求字段名（`image_size`、
`batch_size`）与响应结构（`images[].url`）是按硅基流动公开文档的约定写的，但**没有用真实
key 打过**。先用真实 key 打一次：

```bash
curl -s https://api.siliconflow.cn/v1/images/generations \
  -H "Authorization: Bearer $IMAGE_MODEL_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"model":"Kwai-Kolors/Kolors","prompt":"a warm picture book illustration","
       image_size":"1024x1024","batch_size":1}' | head -c 400
```

返回里若有 `images[0].url` 就与代码一致；若字段名不同（比如是 OpenAI 的 `data[].url`
或 `size`），只需改 `image_gateway.py` 的 `_request_body()` 与 `_first_image_url()` 两处。

出图发生在**创建之后**（异步）：心愿立刻创建成功，头图位置先显示「生成中…」，
好了自动替换。失败则保留上一次能用的图并给出重试入口——重试失败不会把好图抹掉。

---

## 六、小程序体验版

1. `.env.production` 填 `https://api.subetus.top/babygrow` 后 `pnpm build:weapp`
2. 微信开发者工具 → 上传（填版本号与备注）
3. 微信公众平台 → 服务器域名 → `request` 合法域名填 `https://api.subetus.top`
   （**修改有次数限制，谨慎操作**）
4. 平台 → 成员管理 → 添加体验成员
5. 平台 → 版本管理 → 开发版本 → 选为体验版 → 生成二维码

### 隐私协议（容易漏，会直接卡住功能）

小程序用了 `saveImageToPhotosAlbum`（存海报到相册），从 2023-09 起必须在
「设置 → 服务内容声明 → 用户隐私保护指引」里声明，否则该接口**直接失败**。
当前 `app.config.ts` 里没有任何隐私相关声明，需要补 `__usePrivacyCheck__`
并在调用前处理授权流程。

### 本阶段不做的

**拍照识别**：DeepSeek 没有视觉 API，而视觉任务用的 `qwen3-vl:8b` 只能跑在本机。
体验版里前端应隐藏拍照入口。后端 `/records/recognize` 与 AI 的 `vision` 路由都保留着，
将来有常开机器时把 `AI_MODEL_SOURCE` 切到 `local` 就能直接启用。

---

## 七、与手册 V4 的差异

`dailyPawnBackend/deploy-guide/deploy-guide.html` 里对 baby-grow 的规划已经滞后：

| 手册 V4 | 实际 |
|---|---|
| 端口 3001 | **3003**（3001 与 dailypawn 的 AI 服务默认端口重叠） |
| 数据库 MySQL | **PostgreSQL + pgvector**（架构定案时已换，MySQL 下线） |
| 路径 `/baby-grow/` | **`/babygrow/`**（与仓库名一致） |

以本手册为准。
