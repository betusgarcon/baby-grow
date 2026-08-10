# Baby Growth 小程序后端架构建议

## 1. 设计稿反推的核心业务

基于 Figma 中可识别的页面与文案，当前产品至少包含以下业务域：

- `Journey`：成长旅程、时间线、手账、事件沉淀、分享
- `Analysis`：成长分析、睡眠/饮食/情绪/发育等数据聚合
- `Wishes`：成长愿望、清单、进度追踪、提醒
- `Family`：家庭成员协作、权限、内容共享
- `Baby Profile`：宝宝画像、年龄、性别、偏好、喂养阶段、过敏原等
- `AI 配餐建议`：基于月龄、牙齿发育、过敏原、口味偏好、辅食阶段生成建议
- `AI 文本识别/分类`：将自然语言成长记录识别为普通事件、重要里程碑、饮食记录等

这说明后端不是一个单纯的 CRUD 系统，而是一个：

- 以宝宝成长档案为中心的领域系统
- 同时包含事务数据、家庭协作、媒体内容、AI 分类、知识推荐能力
- 需要兼顾稳定性、可扩展性、可解释性与隐私安全

---

## 2. 推荐技术路线

### 2.1 最推荐的组合

我建议采用：

- `Java` 承担核心业务后端
- `Python` 承担本地模型交互与知识检索编排

即：

- `Java = 主业务域 + 强事务 + 通用基础能力`
- `Python = AI 服务层 + RAG + 本地 LLM 推理编排`

### 2.2 为什么不建议全 Python

如果系统后续要具备你提到的这些能力：

- 幂等
- 鉴权
- 风控
- 高并发
- 缓存
- 限流
- 线程池治理
- RPC 调用
- 微服务治理
- AOP 通用能力沉淀

那么 Java 生态在成熟度、团队协作规范、可维护性、服务治理和大规模场景的“工程化下限”更高，尤其适合做：

- 账号体系
- 家庭关系
- 宝宝画像
- 事件/里程碑存储
- 时间线查询
- 审计日志
- 配置中心
- 后台管理

### 2.3 为什么不建议全 Java 处理 AI

本地模型交互、Embedding、向量检索、Prompt 编排、模型路由，这类能力用 Python 落地更自然：

- 本地 LLM 与 Embedding 生态更集中在 Python
- RAG、向量检索、文档切片、推理调试成本更低
- 后续替换模型、调 Prompt、做实验的效率更高

### 2.4 最终结论

推荐采用：

- `轻量服务化架构`
- `Java 主服务 + Python AI 服务`
- `前期控制服务数量，后期按领域拆分`

这比一开始上十几个微服务更合理，也比单体硬扛所有能力更稳。

---

## 3. 总体架构主张

### 3.1 架构原则

- 优先稳定，不追新
- 优先领域边界清晰，不盲目拆服务
- 优先规则引擎 + AI 组合，不让 AI 直接决定高风险业务
- 优先可追溯，所有 AI 决策都保留输入、输出、版本、置信度
- 优先可演进，先满足小程序稳定上线，再逐步增强分析和推荐

### 3.2 推荐部署形态

第一阶段不建议“超细粒度微服务”，建议 4 个核心部署单元：

1. `gateway-bff`：统一网关/BFF
2. `core-service`：核心业务服务，Java
3. `ai-service`：AI 服务，Python
4. `job-service`：异步任务与后台作业，Java 或 Python Worker

### 3.3 总体拓扑

```text
微信小程序
   |
   v
API Gateway / BFF
   |
   +--> Auth & Family & User
   |
   +--> Baby Profile & Journey & Timeline & Wishes
   |
   +--> Analysis Aggregator
   |
   +--> Event Bus (RabbitMQ)
            |
            +--> AI Service (Python, 本地模型/RAG)
            |
            +--> Job Service

存储层:
- MySQL: 核心事务数据
- Redis: 缓存/限流/幂等/会话
- MinIO/OSS: 图片/媒体
- PostgreSQL + pgvector: 本地知识库/RAG 检索
- Elasticsearch(可选): 全文搜索与复杂检索
```

---

## 4. 具体技术栈建议

## 4.1 Java 主业务栈

- `JDK 21`
- `Spring Boot 3.2+`
- `Spring Cloud Gateway`
- `Spring Security`
- `Spring Validation`
- `MyBatis`
- `Redisson`
- `Spring AMQP`
- `OpenFeign`
- `Micrometer + Prometheus`
- `Logback + JSON Log`

可选治理组件：

- `Nacos`：配置中心 + 服务注册发现
- `Sentinel`：限流、熔断、降级

说明：

- 如果团队对 Spring Cloud Alibaba 更熟，可以直接采用
- 如果项目初期实例数不多，也可以先不启用注册中心，走固定服务地址 + 配置中心

## 4.2 Python AI 栈

- `Python 3.11`
- `FastAPI`
- `Pydantic`
- `Uvicorn/Gunicorn`
- `SQLAlchemy`
- `Celery` 或 `RQ`
- `pgvector`

模型侧建议：

- `Ollama` 作为本地模型统一接入层，降低替换模型成本
- 文本分类/标签抽取模型：本地中文能力较强的小模型
- Embedding 模型：稳定成熟的中文向量模型

不建议一开始引入复杂 Agent 框架。优先：

- 规则模板
- Prompt 模板
- 检索编排
- 结构化输出

---

## 5. 服务划分建议

### 5.1 gateway-bff

职责：

- 小程序统一入口
- JWT 校验
- 设备指纹、IP、用户维度限流
- 灰度发布、接口路由
- 聚合部分页面接口，减少小程序端多次请求

不要在 BFF 中堆业务逻辑，只做：

- 鉴权
- 聚合
- 协议适配
- 限流
- 灰度

### 5.2 core-service

建议先做成 `单应用多模块`，按领域组织代码，但以一个 Java 服务部署：

- `user-domain`
- `family-domain`
- `baby-domain`
- `journey-domain`
- `timeline-domain`
- `wish-domain`
- `analysis-domain`
- `media-domain`
- `audit-domain`

这样做的好处：

- 保留微服务化边界
- 避免一开始运维复杂度过高
- 后续可以把热点模块拆出去

### 5.3 ai-service

职责：

- 文本分类
- 标签抽取
- 里程碑候选识别
- 配餐建议生成
- 本地知识检索
- AI 输出结构化结果
- 返回置信度和解释依据

### 5.4 job-service

职责：

- 异步重试
- 定时分析任务
- 周报/月报生成
- 图片处理
- 分享海报生成
- 低优先级 AI 任务

---

## 6. 领域模型建议

建议围绕 `家庭 -> 宝宝 -> 成长记录` 建模。

### 6.1 核心实体

- `User`：用户
- `Family`：家庭空间
- `FamilyMember`：家庭成员关系与角色
- `BabyProfile`：宝宝主档案
- `BabyPreference`：喜好
- `BabyAllergen`：过敏原
- `BabyFeedingProfile`：喂养阶段、辅食习惯、忌口
- `BabyDentalProfile`：牙齿发育情况
- `GrowthEvent`：成长事件
- `MilestoneEvent`：里程碑事件
- `TimelineEntry`：时间线展示实体
- `MediaAsset`：图片/视频/附件
- `GrowthWish`：成长愿望/清单
- `WishItem`：愿望项
- `AnalysisSnapshot`：分析快照
- `RecommendationRecord`：推荐结果快照
- `KnowledgeDocument`：知识文档
- `Recipe`：食谱
- `RecipeIngredient`：食材
- `RecipeSuitabilityRule`：适配规则
- `AiTaskRecord`：AI 任务
- `AiDecisionLog`：AI 决策日志

### 6.2 特别建议

不要让 `GrowthEvent` 一张表承载所有语义，建议最少做以下区分：

- 原始输入事件
- AI 分类结果
- 业务确认后的标准事件
- 里程碑事件

这样后续便于：

- 纠错
- 回溯
- 重跑模型
- 审计

---

## 7. AI 场景设计

## 7.1 文本成长记录识别

用户输入：

> 今天宝宝学会了爬行

推荐处理链路：

1. 小程序提交原始文本
2. `core-service` 先落库原始事件，状态为 `PENDING_AI`
3. 发布 `GrowthEventCreated` 事件到 MQ
4. `ai-service` 消费事件
5. 执行 `规则初判 + LLM 分类 + 标签抽取`
6. 输出结构化结果：
   - 事件类型：成长/饮食/睡眠/情绪/健康
   - 是否里程碑：是/否
   - 标签：爬行、大运动、发育进步
   - 置信度
   - 推荐是否需要人工确认
7. `core-service` 回写分类结果
8. 若命中里程碑规则，生成 `MilestoneEvent`
9. 同步刷新时间线与分析快照

### 7.1.1 为什么要“规则 + AI”双轨

儿童成长场景不能完全依赖模型自由发挥，建议：

- 先用规则做基础兜底
- 再用 AI 做细分类和语义增强

例如：

- “会爬了”
- “叫妈妈了”
- “第一次吃胡萝卜泥”

这些都可以先通过关键词、年龄阶段规则做粗判，再由 AI 完成语义细化。

### 7.1.2 低置信度处理

当 AI 置信度不足时：

- 不直接写死为里程碑
- 打上 `AI_CANDIDATE` 状态
- 交给用户二次确认或后台运营校验

---

## 7.2 配餐建议与辅食推荐

这个场景一定不要只做“问模型给答案”，建议采用三层决策：

1. `硬规则层`
2. `知识检索层`
3. `AI 生成层`

### 7.2.1 硬规则层

先排除高风险情况：

- 月龄是否适配
- 已知过敏原是否冲突
- 当前牙齿/咀嚼能力是否适配
- 是否处于辅食引入早期
- 是否与医生禁忌冲突

这部分必须是确定性规则，不应交给模型决定。

### 7.2.2 知识检索层

从本地知识库召回：

- 指南类文档
- 月龄适配食谱
- 食材引入建议
- 过敏原说明
- 喂养注意事项

### 7.2.3 AI 生成层

将以下内容一起输入模型：

- 宝宝画像
- 规则过滤结果
- 检索到的知识片段
- 最近饮食历史
- 家长偏好

输出：

- 今日/本周建议
- 推荐原因
- 避免项
- 食材替代项
- 烹饪形态建议

### 7.2.4 关键原则

AI 负责：

- 总结
- 组织语言
- 个性化排序

规则与知识库负责：

- 安全底线
- 事实依据
- 推荐边界

---

## 8. 知识库与本地模型建议

### 8.1 知识库技术选型

推荐：

- `PostgreSQL + pgvector`

原因：

- 成熟
- 成本可控
- 部署简单
- 既能存结构化知识，也能做向量检索

知识内容建议拆为两类：

- `结构化知识`
  - 月龄阶段
  - 食材
  - 过敏原
  - 牙齿阶段
  - 喂养方式
  - 食谱适用范围
- `非结构化知识`
  - 育儿建议文档
  - 辅食指南
  - 注意事项
  - FAQ

### 8.2 检索策略

建议采用 `结构化过滤 + 向量召回` 的混合检索：

- 先按月龄、过敏原、牙齿阶段过滤
- 再做向量召回
- 最后交给模型生成

### 8.3 本地模型部署建议

建议分两类模型：

- `分类/抽取模型`
- `生成/总结模型`

理由：

- 分类任务用小模型即可，成本低、延迟低
- 生成任务再调用更强的本地模型

如果 GPU 紧张，可以做：

- 高频任务走轻量模型
- 低频高价值任务走大一点的模型

---

## 9. 数据库与中间件设计

## 9.1 数据存储建议

### MySQL 8

用于：

- 用户
- 家庭
- 宝宝档案
- 成长事件
- 里程碑
- 愿望清单
- AI 结果快照
- 审计日志索引

### Redis

用于：

- 接口缓存
- 热点查询缓存
- 幂等键
- 分布式锁
- 限流计数
- 短期会话态

### MinIO 或云 OSS

用于：

- 图片
- 视频
- 海报
- 手账素材

### PostgreSQL + pgvector

用于：

- 食谱知识库
- 育儿知识文档
- 向量索引

### Elasticsearch（可选）

只有在以下场景明显出现后再引入：

- 大规模全文搜索
- 时间线复杂筛选
- 多字段聚合检索

如果当前需求主要是固定筛选，不建议第一版就上 ES。

## 9.2 消息队列建议

推荐：

- `RabbitMQ`

原因：

- 成熟
- 学习成本低
- 运维复杂度低
- 足够覆盖当前事件驱动需求

用于：

- AI 分类任务
- 时间线异步刷新
- 周报生成
- 通知推送
- 海报生成
- 数据修正重跑

---

## 10. 核心通用能力设计

## 10.1 幂等

必须覆盖：

- 创建成长记录
- 上传媒体
- 生成分享海报
- AI 推荐提交

建议方案：

- 前端请求头传 `Idempotency-Key`
- 网关或业务层基于 Redis 做短期去重
- 数据库关键业务表增加唯一约束兜底

## 10.2 异常处理

统一做：

- 业务异常
- 参数异常
- 鉴权异常
- 限流异常
- 下游超时异常
- AI 服务异常

返回统一错误码：

- `BIZ_xxx`
- `AUTH_xxx`
- `RISK_xxx`
- `AI_xxx`
- `SYS_xxx`

## 10.3 代码分层

建议采用：

- `controller`
- `application`
- `domain`
- `infrastructure`

避免：

- Controller 直接写 SQL
- Service 里又有业务又有 RPC 又有拼装
- 到处复制 AI 调用逻辑

## 10.4 鉴权

建议：

- 小程序登录态换取业务 JWT
- `Access Token + Refresh Token`
- 家庭空间内做角色权限控制

角色建议：

- `OWNER`
- `PARENT`
- `GRANDPARENT`
- `VIEWER`
- `ADMIN`

## 10.5 风控

至少做以下维度：

- IP
- 设备
- 用户
- 家庭空间
- 接口维度

重点关注：

- 分享接口滥用
- AI 接口刷量
- 短时间大量内容提交
- 异常媒体上传

## 10.6 缓存

缓存重点对象：

- 宝宝画像摘要
- 首页卡片聚合结果
- 分析页快照
- AI 推荐结果
- 知识库热命中片段

策略：

- 读多写少接口优先缓存
- 变更后精准失效
- 不做粗暴全量清缓存

## 10.7 高并发与限流

推荐分层限流：

- 网关限流
- 服务方法限流
- AI 接口单独限流

AI 接口必须独立隔离，避免挤占核心事务接口资源。

## 10.8 线程池

必须禁止业务代码随意 `new Thread`

统一线程池管理：

- 核心事务线程池
- IO 线程池
- AI 回调处理线程池
- 定时任务线程池

并为每个线程池配置：

- 队列长度
- 拒绝策略
- 监控指标

## 10.9 RPC 调用

服务间调用建议：

- 初期 `HTTP + OpenFeign`
- 流式 AI 输出或高性能需求再考虑 `gRPC`

不建议第一版同时混用太多 RPC 方案。

## 10.10 AOP 与抽象

建议沉淀统一切面：

- 请求日志
- TraceId
- 幂等
- 权限校验
- 接口耗时
- 审计埋点
- AI 调用埋点

---

## 11. 接口设计建议

接口应围绕页面和领域对象设计，而不是围绕数据库表。

示例：

- `POST /api/v1/events`
- `GET /api/v1/timeline`
- `GET /api/v1/babies/{babyId}/profile`
- `PATCH /api/v1/babies/{babyId}/preferences`
- `POST /api/v1/ai/classify-event`
- `POST /api/v1/ai/meal-recommendations`
- `GET /api/v1/analysis/dashboard`
- `POST /api/v1/wishes`
- `POST /api/v1/share/posters`

建议：

- 对外 REST
- 内部保持领域 DTO
- 所有 AI 返回结果带 `source`, `confidence`, `modelVersion`

---

## 12. 可观测性与审计

必须从第一版开始建设：

- 结构化日志
- TraceId
- 业务审计日志
- AI 调用日志
- MQ 消费日志
- 慢 SQL 监控

AI 相关额外审计字段建议保留：

- 输入摘要
- Prompt 版本
- 模型版本
- 检索片段 ID
- 输出摘要
- 置信度
- 决策类型

---

## 13. 发布、部署与包管理

## 13.1 代码仓组织建议

推荐 `monorepo`：

```text
backend/
  java/
    gateway-bff/
    core-service/
    job-service/
    common-bom/
  python/
    ai-service/
    ai-worker/
  deploy/
    docker-compose/
    k8s/
    scripts/
  docs/
```

原因：

- 需求还在稳定期
- Java 与 Python 强相关
- 统一版本管理更容易

## 13.2 包管理

Java：

- `Maven`

Python：

- `poetry` 或 `pip-tools`

建议：

- 锁定依赖版本
- 统一私服或镜像源
- 镜像构建走多阶段 Dockerfile

## 13.3 部署建议

### 本地/测试环境

- `Docker Compose` 一键启动

包含：

- gateway-bff
- core-service
- ai-service
- mysql
- redis
- rabbitmq
- postgres
- minio

### 生产环境

建议：

- `Kubernetes + Helm`

如果团队目前没有 K8s 运维能力，也可以先：

- 服务器 + Docker Compose / Docker Swarm

但要预留：

- 健康检查
- 滚动发布
- 配置外置化
- 日志采集

## 13.4 一键部署

建议提供：

- `make up`
- `make down`
- `make init-db`
- `make seed-knowledge`
- `make smoke-test`

让开发、测试、演示环境都能快速起起来。

---

## 14. CI/CD 建议

流水线建议：

1. 代码检查
2. 单元测试
3. 集成测试
4. 安全扫描
5. 构建 Docker 镜像
6. 推送镜像仓库
7. 部署测试环境
8. Smoke Test
9. 人工审批后发布生产

工具可选：

- `GitLab CI`
- `Jenkins`
- `GitHub Actions`

如果你们更偏企业内网，通常：

- `GitLab CI + Harbor` 会比较稳

---

## 15. 测试策略建议

Java：

- `JUnit 5`
- `Mockito`
- `Testcontainers`

Python：

- `pytest`

重点测试：

- 里程碑判定规则
- 配餐规则过滤
- 过敏原冲突逻辑
- 幂等逻辑
- MQ 重试与死信
- 鉴权与权限边界
- AI 结构化输出解析

不建议一开始追求非常重的 E2E 自动化，先把：

- 领域规则测试
- 接口集成测试
- AI 回归样本测试

做扎实。

---

## 16. 推荐的阶段性演进

### Phase 1：可上线版本

- Java 核心服务
- Python AI 服务
- MySQL + Redis + RabbitMQ + MinIO
- PostgreSQL + pgvector 知识库
- Docker Compose 一键部署

### Phase 2：增长与优化

- 分析服务拆分
- AI 任务独立 Worker 池
- 搜索能力增强
- 灰度与限流治理完善
- 周报/月报生成

### Phase 3：规模化

- 热点服务独立拆分
- K8s 部署
- 更细的资源隔离
- A/B 测试与推荐策略中心

---

## 17. 最终推荐结论

如果让我现在替这个项目拍板，我会选：

- `Java + Python` 双栈
- `Java 做核心事务域`
- `Python 做本地模型与知识编排`
- `轻量服务化，而不是过度微服务`
- `MySQL + Redis + RabbitMQ + MinIO + PostgreSQL/pgvector`
- `规则引擎 + RAG + 本地 LLM` 组合，而不是纯模型直出

这是当前这个项目里“成熟、稳妥、可扩展、不过度设计”的最优平衡点。

---

## 18. 下一步我建议你确认的 5 个问题

1. 你们更偏向 `快速上线`，还是一开始就要 `明显的服务化治理能力`？
2. 本地大模型是部署在 `同机房 GPU 服务器`、`办公内网机器`，还是 `用户私有化环境`？
3. 对儿童数据是否有更严格的 `隐私合规/本地化部署` 要求？
4. 第一阶段是否就需要 `后台管理端` 和 `运营知识库维护端`？
5. 未来 1 年的目标规模，大概是 `几千家庭`、`几万家庭` 还是更高？

如果这些信息明确后，可以进一步细化出：

- 服务清单
- 表设计
- API 清单
- MQ 事件清单
- 部署拓扑图
- AI Prompt/RAG 设计

---

## 19. 基于最新约束的落地拍板

结合你最新补充的前提：

- 一期目标是 `快速上线`
- 项目是 `全栈学习 + AI 创意大赛参赛项目`
- 本地模型部署在 `内网个人苹果电脑 M1 / 64G`
- 儿童数据要求 `全链路本地化`
- 一期 `不做后台管理端`
- 一年内规模先按 `几万家庭以内` 预估

我对一期落地做如下收敛：

### 19.1 一期部署单元收敛

一期建议只保留 5 个运行单元：

1. `gateway-bff`
2. `core-service`
3. `ai-service`
4. `mysql + redis + rabbitmq + postgres + minio`
5. `ollama`

说明：

- `job-service` 一期不单独部署
- 异步任务先收敛到 `core-service` 的消费者线程 + `ai-service` 的后台任务
- 后期如果异步任务变重，再拆 `job-service`

### 19.2 一期工程策略

- 架构先按服务化边界设计
- 部署先按最少单元上线
- 所有核心数据只在内网机器和本地存储中流转
- 先不引入后台端，由数据库初始化脚本和本地知识库文件完成知识导入
- AI 以“结构化输出 + 审计记录”为第一优先级，不追求复杂 Agent

### 19.3 一期最小可用闭环

一期至少跑通这 5 条链路：

1. 小程序登录 -> 家庭空间 -> 宝宝档案创建
2. 成长文本记录 -> AI 分类 -> 时间线展示
3. 里程碑识别 -> 里程碑卡片展示
4. 宝宝画像 + 知识库 -> AI 配餐建议
5. 成长手账/分享内容生成

---

## 20. 服务拆分清单

## 20.1 一期实际部署清单

### `gateway-bff`

职责：

- 小程序统一接入层
- 微信登录态换业务 JWT
- 聚合首页、Journey、Analysis 等页面数据
- 限流、幂等入口校验、统一错误码

一期是否必须独立部署：

- `建议独立`

原因：

- 接口网关与业务逻辑边界更清晰
- 后期升级鉴权、灰度、限流更方便

### `core-service`

职责：

- 用户与家庭空间
- 宝宝档案
- 成长记录
- 时间线
- 愿望清单
- 分享手账元数据
- 审计日志
- MQ 事件生产与消费

一期是否必须独立部署：

- `必须`

### `ai-service`

职责：

- 文本分类
- 标签抽取
- 里程碑候选识别
- 配餐建议生成
- 知识库检索
- AI 决策日志落库

一期是否必须独立部署：

- `必须`

原因：

- 与 Java 事务域解耦
- 后续模型替换和性能隔离更容易

### `ollama`

职责：

- 承接本地模型推理
- 暴露统一模型调用接口给 `ai-service`

一期是否必须独立部署：

- `建议独立`

### 基础组件

- `mysql`
- `redis`
- `rabbitmq`
- `postgres`
- `minio`

---

## 20.2 一期代码模块拆分

虽然一期只部署少量服务，但代码层面建议保持清晰模块化。

### `gateway-bff` 模块

- `auth-api`
- `journey-page-api`
- `analysis-page-api`
- `wish-page-api`
- `share-page-api`
- `common-web`

### `core-service` 模块

- `user-domain`
- `family-domain`
- `baby-domain`
- `event-domain`
- `timeline-domain`
- `milestone-domain`
- `wish-domain`
- `analysis-domain`
- `share-domain`
- `media-domain`
- `audit-domain`
- `mq-consumer`
- `common-infra`

### `ai-service` 模块

- `classification-app`
- `meal-recommendation-app`
- `knowledge-retrieval-app`
- `prompt-template`
- `model-gateway`
- `embedding-app`
- `decision-log`

---

## 20.3 二期预留拆分路径

当规模和复杂度上来后，可以从 `core-service` 中按热点拆出：

- `analysis-service`
- `share-service`
- `job-service`
- `search-service`

但一期不建议提前拆。

---

## 21. 表结构草案

以下是一期优先建议落的核心表，不追求一次性全量建模，但要给后续演进留空间。

## 21.1 MySQL 核心事务表

### `users`

用途：

- 平台用户基础信息

核心字段：

```sql
id BIGINT PK
wechat_openid VARCHAR(64) UNIQUE
union_id VARCHAR(64) NULL
nickname VARCHAR(64)
avatar_url VARCHAR(255)
status TINYINT
created_at DATETIME
updated_at DATETIME
```

### `families`

用途：

- 家庭空间

核心字段：

```sql
id BIGINT PK
name VARCHAR(64)
owner_user_id BIGINT
status TINYINT
created_at DATETIME
updated_at DATETIME
```

### `family_members`

用途：

- 家庭成员关系和角色

核心字段：

```sql
id BIGINT PK
family_id BIGINT
user_id BIGINT
role VARCHAR(32)
relation_name VARCHAR(32)
status TINYINT
joined_at DATETIME
created_at DATETIME
updated_at DATETIME
UNIQUE KEY uk_family_user (family_id, user_id)
```

### `baby_profiles`

用途：

- 宝宝主档案

核心字段：

```sql
id BIGINT PK
family_id BIGINT
name VARCHAR(64)
gender VARCHAR(16)
birthday DATE
avatar_url VARCHAR(255)
constellation VARCHAR(32)
blood_type VARCHAR(16) NULL
profile_status TINYINT
created_by BIGINT
created_at DATETIME
updated_at DATETIME
```

### `baby_preferences`

用途：

- 宝宝偏好信息

核心字段：

```sql
id BIGINT PK
baby_id BIGINT
preference_type VARCHAR(32)
preference_key VARCHAR(64)
preference_value VARCHAR(255)
created_at DATETIME
updated_at DATETIME
INDEX idx_baby_type (baby_id, preference_type)
```

建议 `preference_type` 包含：

- `TOY`
- `FOOD`
- `SLEEP`
- `HABIT`
- `CHARACTERISTIC`

### `baby_allergens`

用途：

- 过敏原清单

核心字段：

```sql
id BIGINT PK
baby_id BIGINT
allergen_name VARCHAR(64)
severity VARCHAR(16)
confirmed_by VARCHAR(32)
remark VARCHAR(255)
created_at DATETIME
updated_at DATETIME
UNIQUE KEY uk_baby_allergen (baby_id, allergen_name)
```

### `baby_feeding_profiles`

用途：

- 喂养阶段画像

核心字段：

```sql
id BIGINT PK
baby_id BIGINT UNIQUE
feeding_stage VARCHAR(32)
milk_ml_per_day INT NULL
solid_food_stage VARCHAR(32)
texture_level VARCHAR(32)
taboo_foods JSON
liked_foods JSON
disliked_foods JSON
created_at DATETIME
updated_at DATETIME
```

### `baby_dental_profiles`

用途：

- 牙齿与咀嚼能力画像

核心字段：

```sql
id BIGINT PK
baby_id BIGINT UNIQUE
teeth_count INT
chewing_level VARCHAR(32)
can_handle_texture VARCHAR(32)
remark VARCHAR(255)
created_at DATETIME
updated_at DATETIME
```

### `growth_events`

用途：

- 用户提交的原始成长记录

核心字段：

```sql
id BIGINT PK
family_id BIGINT
baby_id BIGINT
event_time DATETIME
source_type VARCHAR(32)
source_text TEXT
source_media_count INT
event_status VARCHAR(32)
client_request_id VARCHAR(64)
created_by BIGINT
created_at DATETIME
updated_at DATETIME
UNIQUE KEY uk_client_request (baby_id, client_request_id)
INDEX idx_baby_time (baby_id, event_time)
```

建议 `event_status`：

- `PENDING_AI`
- `AI_PROCESSED`
- `CONFIRMED`
- `REJECTED`

### `growth_event_ai_results`

用途：

- AI 对成长记录的结构化结果

核心字段：

```sql
id BIGINT PK
event_id BIGINT UNIQUE
event_type VARCHAR(32)
is_milestone TINYINT
confidence DECIMAL(5,4)
tags JSON
summary VARCHAR(255)
extracted_facts JSON
model_name VARCHAR(64)
model_version VARCHAR(64)
prompt_version VARCHAR(64)
need_user_confirm TINYINT
raw_result_json JSON
created_at DATETIME
updated_at DATETIME
```

### `milestone_events`

用途：

- 里程碑事件

核心字段：

```sql
id BIGINT PK
event_id BIGINT
baby_id BIGINT
milestone_code VARCHAR(64)
milestone_name VARCHAR(64)
milestone_level VARCHAR(32)
confirmed_source VARCHAR(32)
occurred_at DATETIME
created_at DATETIME
updated_at DATETIME
UNIQUE KEY uk_event_milestone (event_id, milestone_code)
```

### `timeline_entries`

用途：

- Journey 时间线展示数据

核心字段：

```sql
id BIGINT PK
family_id BIGINT
baby_id BIGINT
entry_type VARCHAR(32)
entry_ref_id BIGINT
entry_title VARCHAR(128)
entry_summary VARCHAR(255)
entry_time DATETIME
cover_media_url VARCHAR(255) NULL
visibility VARCHAR(16)
created_at DATETIME
updated_at DATETIME
INDEX idx_baby_entry_time (baby_id, entry_time)
```

### `media_assets`

用途：

- 媒体资源元数据

核心字段：

```sql
id BIGINT PK
family_id BIGINT
baby_id BIGINT
event_id BIGINT NULL
media_type VARCHAR(16)
storage_provider VARCHAR(16)
bucket_name VARCHAR(64)
object_key VARCHAR(255)
file_size BIGINT
mime_type VARCHAR(64)
sha256 VARCHAR(64)
created_by BIGINT
created_at DATETIME
updated_at DATETIME
INDEX idx_event_media (event_id)
```

### `growth_wishes`

用途：

- 愿望/目标主表

核心字段：

```sql
id BIGINT PK
family_id BIGINT
baby_id BIGINT
title VARCHAR(128)
description VARCHAR(500)
wish_type VARCHAR(32)
target_value INT NULL
current_value INT DEFAULT 0
status VARCHAR(32)
created_by BIGINT
created_at DATETIME
updated_at DATETIME
```

### `wish_items`

用途：

- 愿望清单项

核心字段：

```sql
id BIGINT PK
wish_id BIGINT
item_title VARCHAR(128)
item_desc VARCHAR(255)
completed TINYINT
completed_at DATETIME NULL
sort_order INT
created_at DATETIME
updated_at DATETIME
```

### `analysis_snapshots`

用途：

- Analysis 页快照

核心字段：

```sql
id BIGINT PK
baby_id BIGINT
snapshot_date DATE
snapshot_type VARCHAR(32)
snapshot_json JSON
created_at DATETIME
updated_at DATETIME
UNIQUE KEY uk_baby_snapshot (baby_id, snapshot_date, snapshot_type)
```

### `meal_recommendation_records`

用途：

- 配餐建议历史记录

核心字段：

```sql
id BIGINT PK
baby_id BIGINT
query_date DATE
age_months INT
input_profile_json JSON
hard_rule_result_json JSON
knowledge_refs JSON
recommendation_json JSON
model_name VARCHAR(64)
model_version VARCHAR(64)
created_by BIGINT
created_at DATETIME
updated_at DATETIME
INDEX idx_baby_query_date (baby_id, query_date)
```

### `share_records`

用途：

- 分享手账/海报记录

核心字段：

```sql
id BIGINT PK
family_id BIGINT
baby_id BIGINT
share_type VARCHAR(32)
source_ref_id BIGINT
poster_media_id BIGINT NULL
share_title VARCHAR(128)
share_status VARCHAR(32)
created_by BIGINT
created_at DATETIME
updated_at DATETIME
```

### `audit_logs`

用途：

- 关键操作审计

核心字段：

```sql
id BIGINT PK
trace_id VARCHAR(64)
user_id BIGINT
family_id BIGINT NULL
biz_type VARCHAR(32)
biz_id BIGINT NULL
action VARCHAR(64)
request_uri VARCHAR(255)
request_method VARCHAR(16)
result_code VARCHAR(32)
detail_json JSON
created_at DATETIME
INDEX idx_trace_id (trace_id)
INDEX idx_biz (biz_type, biz_id)
```

---

## 21.2 PostgreSQL 知识库表

### `knowledge_documents`

用途：

- 育儿知识、辅食指南、FAQ 文档主表

核心字段：

```sql
id BIGSERIAL PRIMARY KEY
doc_type VARCHAR(32)
title VARCHAR(255)
source VARCHAR(128)
language VARCHAR(16)
content TEXT
version VARCHAR(32)
status VARCHAR(16)
created_at TIMESTAMP
updated_at TIMESTAMP
```

### `knowledge_chunks`

用途：

- 文档切片表

核心字段：

```sql
id BIGSERIAL PRIMARY KEY
document_id BIGINT
chunk_no INT
content TEXT
metadata JSONB
embedding VECTOR(1024)
created_at TIMESTAMP
updated_at TIMESTAMP
```

### `recipes`

用途：

- 食谱主表

核心字段：

```sql
id BIGSERIAL PRIMARY KEY
recipe_name VARCHAR(128)
age_min_month INT
age_max_month INT
texture_level VARCHAR(32)
cook_method VARCHAR(64)
ingredient_summary TEXT
nutrition_summary TEXT
instructions TEXT
status VARCHAR(16)
created_at TIMESTAMP
updated_at TIMESTAMP
```

### `recipe_ingredients`

用途：

- 食谱食材明细

核心字段：

```sql
id BIGSERIAL PRIMARY KEY
recipe_id BIGINT
ingredient_name VARCHAR(64)
quantity_desc VARCHAR(64)
is_allergen TINYINT
remark VARCHAR(255)
created_at TIMESTAMP
updated_at TIMESTAMP
```

### `recipe_rules`

用途：

- 食谱适配规则

核心字段：

```sql
id BIGSERIAL PRIMARY KEY
recipe_id BIGINT
rule_type VARCHAR(32)
rule_value VARCHAR(128)
operator VARCHAR(16)
created_at TIMESTAMP
updated_at TIMESTAMP
```

建议 `rule_type`：

- `AGE_MIN_MONTH`
- `AGE_MAX_MONTH`
- `ALLERGEN_EXCLUDE`
- `TEXTURE_LEVEL`
- `CHEWING_LEVEL`
- `DENTAL_STAGE`

---

## 21.3 AI 审计与任务表

一期可放 MySQL，也可后期拆到独立库。

### `ai_task_records`

```sql
id BIGINT PK
task_type VARCHAR(32)
biz_id BIGINT
biz_type VARCHAR(32)
task_status VARCHAR(32)
retry_count INT
next_retry_at DATETIME NULL
created_at DATETIME
updated_at DATETIME
INDEX idx_biz_task (biz_type, biz_id, task_type)
```

### `ai_decision_logs`

```sql
id BIGINT PK
task_id BIGINT NULL
biz_type VARCHAR(32)
biz_id BIGINT
model_name VARCHAR(64)
model_version VARCHAR(64)
prompt_version VARCHAR(64)
input_summary TEXT
retrieved_refs JSON
output_summary TEXT
confidence DECIMAL(5,4) NULL
decision_type VARCHAR(32)
raw_response_json JSON
created_at DATETIME
INDEX idx_biz_decision (biz_type, biz_id)
```

---

## 22. 核心 API 清单

以下按一期优先级给出 REST API 草案。

## 22.1 鉴权与家庭

### 登录

- `POST /api/v1/auth/wechat/login`

请求体：

```json
{
  "code": "wx_login_code"
}
```

响应体：

```json
{
  "accessToken": "jwt",
  "refreshToken": "refresh_token",
  "user": {
    "id": 1,
    "nickname": "Leo Mom"
  }
}
```

### 刷新令牌

- `POST /api/v1/auth/refresh`

### 创建家庭

- `POST /api/v1/families`

### 家庭详情

- `GET /api/v1/families/{familyId}`

### 邀请家庭成员

- `POST /api/v1/families/{familyId}/members`

### 家庭成员列表

- `GET /api/v1/families/{familyId}/members`

---

## 22.2 宝宝档案

### 创建宝宝档案

- `POST /api/v1/babies`

请求体：

```json
{
  "familyId": 1,
  "name": "Leo",
  "gender": "BOY",
  "birthday": "2025-01-12"
}
```

### 宝宝详情

- `GET /api/v1/babies/{babyId}`

### 宝宝画像摘要

- `GET /api/v1/babies/{babyId}/profile`

### 更新宝宝基础信息

- `PATCH /api/v1/babies/{babyId}`

### 更新偏好信息

- `PUT /api/v1/babies/{babyId}/preferences`

### 更新过敏原

- `PUT /api/v1/babies/{babyId}/allergens`

### 更新喂养画像

- `PUT /api/v1/babies/{babyId}/feeding-profile`

### 更新牙齿画像

- `PUT /api/v1/babies/{babyId}/dental-profile`

---

## 22.3 成长记录与时间线

### 创建成长记录

- `POST /api/v1/events`

请求头建议：

```http
Idempotency-Key: 20260622-baby1-001
```

请求体：

```json
{
  "familyId": 1,
  "babyId": 1001,
  "eventTime": "2026-06-22T10:30:00",
  "sourceType": "TEXT",
  "sourceText": "今天宝宝学会了爬行"
}
```

响应体：

```json
{
  "eventId": 90001,
  "status": "PENDING_AI"
}
```

### 成长记录详情

- `GET /api/v1/events/{eventId}`

### 编辑成长记录

- `PATCH /api/v1/events/{eventId}`

### 删除成长记录

- `DELETE /api/v1/events/{eventId}`

### 时间线列表

- `GET /api/v1/timeline?babyId=1001&pageNo=1&pageSize=20`

### 时间线筛选

- `POST /api/v1/timeline/filter`

筛选条件建议支持：

- 时间范围
- 分类
- 是否里程碑
- 媒体类型

### 用户确认 AI 候选结果

- `POST /api/v1/events/{eventId}/confirm-ai-result`

---

## 22.4 分析页

### Analysis 首页

- `GET /api/v1/analysis/dashboard?babyId=1001`

返回建议包含：

- 睡眠摘要
- 饮食摘要
- 情绪摘要
- 发育摘要
- 最新 AI 小建议

### 指定维度分析

- `GET /api/v1/analysis/{type}?babyId=1001&period=30d`

建议 `type`：

- `sleep`
- `diet`
- `mood`
- `growth`

---

## 22.5 Wishes

### 创建愿望

- `POST /api/v1/wishes`

### 愿望列表

- `GET /api/v1/wishes?babyId=1001`

### 愿望详情

- `GET /api/v1/wishes/{wishId}`

### 添加愿望项

- `POST /api/v1/wishes/{wishId}/items`

### 更新愿望项状态

- `PATCH /api/v1/wishes/{wishId}/items/{itemId}`

---

## 22.6 AI 能力

一期建议 `AI API` 仍经过 `gateway-bff -> core-service -> ai-service`，不要直接让小程序连 AI 服务。

### 事件分类结果查询

- `GET /api/v1/ai/event-results/{eventId}`

### 主动触发事件重分类

- `POST /api/v1/ai/events/{eventId}/reclassify`

### 获取配餐建议

- `POST /api/v1/ai/meal-recommendations`

请求体：

```json
{
  "babyId": 1001,
  "recommendationDate": "2026-06-22",
  "scene": "DAILY_MEAL"
}
```

响应体建议：

```json
{
  "recommendationId": 80001,
  "summary": "今日可尝试鸡肉南瓜粥",
  "items": [
    {
      "mealType": "LUNCH",
      "dishName": "鸡肉南瓜粥",
      "reason": "适合当前月龄与咀嚼阶段"
    }
  ],
  "avoidItems": [
    "花生"
  ],
  "confidence": 0.91,
  "modelVersion": "local-llm-v1"
}
```

### 配餐建议历史

- `GET /api/v1/ai/meal-recommendations/history?babyId=1001`

---

## 22.7 分享与媒体

### 获取上传凭证

- `POST /api/v1/media/upload-tokens`

### 创建媒体记录

- `POST /api/v1/media/assets`

### 生成成长手账分享记录

- `POST /api/v1/shares/handbook`

### 生成分享海报

- `POST /api/v1/shares/posters`

### 分享记录列表

- `GET /api/v1/shares?babyId=1001`

---

## 22.8 管理与健康检查

虽然一期不做后台端，但仍建议保留最小内部接口：

- `GET /internal/health`
- `GET /internal/metrics`
- `POST /internal/knowledge/reload`

`/internal/*` 必须只允许内网访问。

---

## 23. MQ 事件清单

一期采用 RabbitMQ，建议使用：

- `topic exchange`
- 队列按业务域命名
- 死信队列单独配置

## 23.1 Exchange 建议

- `event.topic`
- `ai.topic`
- `analysis.topic`
- `share.topic`

---

## 23.2 核心业务事件

### `growth.event.created`

触发时机：

- 创建成长记录成功后

生产者：

- `core-service`

消费者：

- `ai-service`
- `core-service` 内部分析快照刷新消费者

消息体建议：

```json
{
  "eventId": 90001,
  "familyId": 1,
  "babyId": 1001,
  "eventTime": "2026-06-22T10:30:00"
}
```

### `growth.event.updated`

触发时机：

- 用户编辑成长记录后

消费者：

- `ai-service`
- `timeline` 刷新消费者

### `growth.event.deleted`

触发时机：

- 删除成长记录后

消费者：

- `timeline` 刷新消费者
- `analysis` 快照刷新消费者

### `growth.event.ai.completed`

触发时机：

- AI 分类完成后

生产者：

- `ai-service`

消费者：

- `core-service`

消息体建议：

```json
{
  "eventId": 90001,
  "eventType": "GROWTH",
  "isMilestone": true,
  "confidence": 0.95,
  "tags": ["爬行", "大运动"]
}
```

### `growth.event.ai.low-confidence`

触发时机：

- AI 返回低置信度结果

消费者：

- `core-service`

处理动作：

- 标记为 `AI_CANDIDATE`
- 等待用户确认

### `milestone.event.created`

触发时机：

- 里程碑事件生成后

消费者：

- `timeline` 刷新消费者
- `share` 生成素材消费者

### `baby.profile.updated`

触发时机：

- 宝宝画像、偏好、过敏原、牙齿画像、喂养画像更新后

消费者：

- `analysis` 快照刷新消费者
- `meal recommendation` 缓存失效消费者

### `meal.recommendation.requested`

触发时机：

- 用户请求配餐建议

生产者：

- `core-service`

消费者：

- `ai-service`

### `meal.recommendation.generated`

触发时机：

- 配餐建议生成完成

消费者：

- `core-service`

### `share.poster.requested`

触发时机：

- 请求生成分享海报

消费者：

- `core-service` 异步生成器或后续 `job-service`

### `analysis.snapshot.refresh.requested`

触发时机：

- 成长记录或宝宝画像变化后

消费者：

- `core-service` 分析快照任务

---

## 23.3 死信与重试

建议每个关键消费队列配套：

- 主队列
- 重试队列
- 死信队列

例如：

- `q.growth.event.created`
- `q.growth.event.created.retry`
- `q.growth.event.created.dlq`

重试建议：

- 第 1 次失败：30 秒后重试
- 第 2 次失败：5 分钟后重试
- 第 3 次失败：30 分钟后重试
- 超过 3 次进入死信

---

## 24. AI 分类与配餐详细时序图

## 24.1 成长事件 AI 分类时序图

```mermaid
sequenceDiagram
    participant MiniApp as 小程序
    participant Gateway as gateway-bff
    participant Core as core-service
    participant MQ as RabbitMQ
    participant AI as ai-service
    participant LLM as Ollama/Local LLM
    participant MySQL as MySQL

    MiniApp->>Gateway: POST /api/v1/events
    Gateway->>Core: 转发并附带用户身份
    Core->>MySQL: 写入 growth_events(status=PENDING_AI)
    Core->>MQ: 发布 growth.event.created
    Core-->>Gateway: 返回 eventId + PENDING_AI
    Gateway-->>MiniApp: 提交成功

    MQ->>AI: 投递 growth.event.created
    AI->>MySQL: 读取事件原文与宝宝画像摘要
    AI->>AI: 规则粗分类
    AI->>LLM: 调用本地模型进行分类/标签抽取
    LLM-->>AI: 返回结构化结果
    AI->>MySQL: 记录 ai_decision_logs
    AI->>MQ: 发布 growth.event.ai.completed

    MQ->>Core: 投递 growth.event.ai.completed
    Core->>MySQL: 更新 growth_event_ai_results
    Core->>MySQL: 更新 growth_events(status=AI_PROCESSED)
    alt 命中里程碑且高置信度
        Core->>MySQL: 写入 milestone_events
        Core->>MySQL: 写入 timeline_entries
    else 低置信度
        Core->>MySQL: 标记事件为 AI_CANDIDATE
    end
    Core->>MQ: 发布 analysis.snapshot.refresh.requested
```

### 24.1.1 一期实现建议

- 提交事件接口同步返回，不阻塞等待 AI
- 时间线详情页轮询或下拉刷新获取 AI 处理结果
- 若后续体验需要增强，再补 WebSocket/SSE

---

## 24.2 配餐建议时序图

```mermaid
sequenceDiagram
    participant MiniApp as 小程序
    participant Gateway as gateway-bff
    participant Core as core-service
    participant MQ as RabbitMQ
    participant AI as ai-service
    participant PG as Postgres/pgvector
    participant LLM as Ollama/Local LLM
    participant MySQL as MySQL

    MiniApp->>Gateway: POST /api/v1/ai/meal-recommendations
    Gateway->>Core: 转发请求
    Core->>MySQL: 读取宝宝画像/过敏原/牙齿/喂养阶段
    Core->>MQ: 发布 meal.recommendation.requested
    Core-->>Gateway: 返回 request accepted
    Gateway-->>MiniApp: 返回受理状态或短轮询 token

    MQ->>AI: 投递 meal.recommendation.requested
    AI->>MySQL: 获取宝宝画像详细数据
    AI->>AI: 执行硬规则过滤
    AI->>PG: 按月龄/过敏原/质地等级过滤并向量召回知识片段
    PG-->>AI: 返回 recipes + knowledge chunks
    AI->>LLM: 输入画像 + 规则结果 + 检索结果
    LLM-->>AI: 返回结构化配餐建议
    AI->>MySQL: 写入 meal_recommendation_records
    AI->>MySQL: 写入 ai_decision_logs
    AI->>MQ: 发布 meal.recommendation.generated

    MQ->>Core: 投递 meal.recommendation.generated
    Core->>MySQL: 更新推荐记录状态
    Core-->>MiniApp: 后续通过查询接口返回最终建议
```

### 24.2.1 为什么一期建议异步

- 本地模型在 M1 机器上延迟会有波动
- 配餐建议不是强事务接口
- 异步更利于超时控制和体验兜底

### 24.2.2 如果你想一期先做同步

也可以先走：

- `gateway-bff -> core-service -> ai-service` 同步调用

但建议只限：

- 配餐建议
- 简短 AI 小建议

而成长事件分类仍建议异步。

---

## 25. Docker Compose 一键部署草案

由于目标是本地化、快速上线和单机部署，一期推荐使用 `Docker Compose`。

## 25.1 目录建议

```text
deploy/docker-compose/
  compose.yaml
  .env
  init/
    mysql/
    postgres/
  volumes/
    mysql/
    redis/
    rabbitmq/
    postgres/
    minio/
    ollama/
```

## 25.2 环境变量示例

```env
MYSQL_ROOT_PASSWORD=local_root_pwd
MYSQL_DATABASE=baby_growth
MYSQL_USER=baby
MYSQL_PASSWORD=baby_pwd

POSTGRES_DB=baby_knowledge
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres_pwd

REDIS_PASSWORD=redis_pwd

MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin123

JWT_SECRET=replace_with_long_secret
WECHAT_APP_ID=your_app_id
WECHAT_APP_SECRET=your_app_secret

OLLAMA_HOST=http://ollama:11434
AI_MODEL_CLASSIFIER=qwen2.5:7b
AI_MODEL_GENERATOR=qwen2.5:14b
```

## 25.3 `compose.yaml` 草案

```yaml
version: "3.9"

services:
  mysql:
    image: mysql:8.0
    container_name: baby-mysql
    command:
      - --default-authentication-plugin=mysql_native_password
      - --character-set-server=utf8mb4
      - --collation-server=utf8mb4_unicode_ci
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
      MYSQL_DATABASE: ${MYSQL_DATABASE}
      MYSQL_USER: ${MYSQL_USER}
      MYSQL_PASSWORD: ${MYSQL_PASSWORD}
    ports:
      - "3306:3306"
    volumes:
      - ./volumes/mysql:/var/lib/mysql
      - ./init/mysql:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-p${MYSQL_ROOT_PASSWORD}"]
      interval: 10s
      timeout: 5s
      retries: 10

  redis:
    image: redis:7.2
    container_name: baby-redis
    command: ["redis-server", "--appendonly", "yes", "--requirepass", "${REDIS_PASSWORD}"]
    ports:
      - "6379:6379"
    volumes:
      - ./volumes/redis:/data
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]
      interval: 10s
      timeout: 5s
      retries: 10

  rabbitmq:
    image: rabbitmq:3.13-management
    container_name: baby-rabbitmq
    ports:
      - "5672:5672"
      - "15672:15672"
    volumes:
      - ./volumes/rabbitmq:/var/lib/rabbitmq
    healthcheck:
      test: ["CMD", "rabbitmq-diagnostics", "check_port_connectivity"]
      interval: 10s
      timeout: 5s
      retries: 10

  postgres:
    image: pgvector/pgvector:pg16
    container_name: baby-postgres
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    ports:
      - "5432:5432"
    volumes:
      - ./volumes/postgres:/var/lib/postgresql/data
      - ./init/postgres:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 10

  minio:
    image: minio/minio:RELEASE.2025-04-08T15-41-24Z
    container_name: baby-minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD}
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - ./volumes/minio:/data
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 10s
      timeout: 5s
      retries: 10

  ollama:
    image: ollama/ollama:0.9.6
    container_name: baby-ollama
    ports:
      - "11434:11434"
    volumes:
      - ./volumes/ollama:/root/.ollama
    environment:
      OLLAMA_KEEP_ALIVE: 30m
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:11434/api/tags"]
      interval: 15s
      timeout: 10s
      retries: 20

  core-service:
    image: baby-growth/core-service:latest
    container_name: baby-core-service
    depends_on:
      mysql:
        condition: service_healthy
      redis:
        condition: service_healthy
      rabbitmq:
        condition: service_healthy
      minio:
        condition: service_healthy
    environment:
      SPRING_PROFILES_ACTIVE: local
      MYSQL_URL: jdbc:mysql://mysql:3306/${MYSQL_DATABASE}?useUnicode=true&characterEncoding=utf8&serverTimezone=Asia/Shanghai
      MYSQL_USERNAME: ${MYSQL_USER}
      MYSQL_PASSWORD: ${MYSQL_PASSWORD}
      REDIS_HOST: redis
      REDIS_PORT: 6379
      REDIS_PASSWORD: ${REDIS_PASSWORD}
      RABBITMQ_HOST: rabbitmq
      MINIO_ENDPOINT: http://minio:9000
      JWT_SECRET: ${JWT_SECRET}
    ports:
      - "8081:8081"

  ai-service:
    image: baby-growth/ai-service:latest
    container_name: baby-ai-service
    depends_on:
      postgres:
        condition: service_healthy
      ollama:
        condition: service_healthy
      rabbitmq:
        condition: service_healthy
      mysql:
        condition: service_healthy
    environment:
      APP_ENV: local
      MYSQL_DSN: mysql+pymysql://${MYSQL_USER}:${MYSQL_PASSWORD}@mysql:3306/${MYSQL_DATABASE}
      PG_DSN: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
      RABBITMQ_URL: amqp://guest:guest@rabbitmq:5672/
      OLLAMA_HOST: ${OLLAMA_HOST}
      AI_MODEL_CLASSIFIER: ${AI_MODEL_CLASSIFIER}
      AI_MODEL_GENERATOR: ${AI_MODEL_GENERATOR}
    ports:
      - "8000:8000"

  gateway-bff:
    image: baby-growth/gateway-bff:latest
    container_name: baby-gateway-bff
    depends_on:
      core-service:
        condition: service_started
      ai-service:
        condition: service_started
    environment:
      SPRING_PROFILES_ACTIVE: local
      CORE_SERVICE_URL: http://core-service:8081
      AI_SERVICE_URL: http://ai-service:8000
      JWT_SECRET: ${JWT_SECRET}
      WECHAT_APP_ID: ${WECHAT_APP_ID}
      WECHAT_APP_SECRET: ${WECHAT_APP_SECRET}
    ports:
      - "8080:8080"
```

---

## 25.4 一键启动脚本建议

建议在仓库根目录提供：

```bash
make up
make down
make logs
make init-model
make init-knowledge
make smoke-test
```

对应语义：

- `make up`：启动全部基础服务与业务服务
- `make down`：停止并清理容器
- `make logs`：查看聚合日志
- `make init-model`：预拉取本地模型
- `make init-knowledge`：导入食谱和知识库
- `make smoke-test`：执行登录、建档、创建事件、获取配餐建议的最小冒烟用例

---

## 25.5 M1 / 64G 本地模型资源建议

针对你的机器配置，一期建议：

- 分类模型：`7B` 左右
- 生成模型：`7B ~ 14B`
- Embedding 模型：单独小模型

建议策略：

- 默认只常驻 `1` 个主模型
- 另一个模型按需拉起
- 配餐建议走生成模型
- 文本分类优先走较轻模型

不建议一期就在本机同时常驻多个大模型，否则：

- 内存占用高
- 响应抖动大
- Docker 其他服务会被挤压

---

## 26. 一期开发优先级建议

为了真正快速上线，我建议开发顺序如下：

### P0

- 登录与家庭空间
- 宝宝档案
- 成长记录创建
- 时间线列表
- RabbitMQ 异步分类链路
- AI 事件分类

### P1

- 里程碑展示
- 配餐建议
- 偏好/过敏原/牙齿画像
- Analysis 基础聚合页

### P2

- Wishes
- 分享手账
- 海报生成
- 快照分析优化

这样做可以最快形成“记录 -> 识别 -> 展示 -> 建议”的比赛项目核心闭环。
