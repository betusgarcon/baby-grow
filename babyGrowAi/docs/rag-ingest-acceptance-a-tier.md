# RAG 知识库入库验收文档 —— A 档资料（3 本，无需 OCR）

本文件记录 A 档 3 本资料的**执行过程**与**结果校验**，作为该步骤的验收凭据。
所有数字均为脚本实测输出，可用同一套脚本原样复现。

- 执行日期：2026-10-01
- 范围：`docs/rag-pdf-vectorization-plan.md` 第十节普查中判定「有文本层、无需 OCR」的 3 本
- 结论：**20/20 项校验通过**，全流程可重复执行且结果一致

---

## 一、本次范围

| slug | 源文件 | 页数 | 提取方式 |
|---|---|---|---|
| `postpartum_diet` | 014-2022+产褥期妇女膳食指导.pdf | 10 | 文本层 |
| `complementary_feeding` | 婴幼儿辅食添加营养指南.pdf | 8 | 文本层 |
| `cuiyutao_natural_parenting` | 崔玉涛自然养育法.pdf | 264 | 文本层 |

另 3 本（`中国居民膳食指南（2022）`、`崔玉涛育儿百科`、`0-3岁宝宝喂养同步指导`）
为扫描件，需先 OCR，不在本次范围。

---

## 二、执行过程摘要

### 流程

```
PDF ──①pdf_extract──▶ data/_work/extract/*.jsonl
    ──②build_guidelines──▶ data/guidelines/**/*.md
    ──③ingest_guidelines──▶ knowledge_documents / knowledge_chunks
    ──④verify_guidelines──▶ PASS/FAIL 报告 + report.json
```

四个阶段**全部幂等**：① 覆盖写、② 先清目录再写、③ 按 `source` 先删后插、
④ 只读。因此任何时候重跑都不会产生重复数据。

### 一条命令跑完全程

```bash
cd babyGrowAi
./scripts/run_guidelines_pipeline.sh
```

阶段 1 的抽取引擎分工是本次的关键设计：

- **正文走 `pdftotext -layout`**：保留段首缩进，这是 CJK 硬换行还原成段落的唯一可靠信号。
- **表格走 `pdfplumber`**：读 PDF 里真实绘制的表格线，单元格换行也能拿到准确方格。
  只有 PDF 未画线时才退回「按列间距猜列」的兜底方案。
- 两套结果按**行文本归一化匹配**对齐：某行文本落在某个表格的 bbox 内，就归属该表格。

### 分源抽取实测

| slug | 页 | blocks | 表格总数 | 来自表格线 | 来自间距兜底 | 漏检 |
|---|---|---|---|---|---|---|
| `postpartum_diet` | 10 | 102 | 5 | 5 | 0 | 0 |
| `complementary_feeding` | 8 | 96 | 3 | 2 | 1 | 0 |
| `cuiyutao_natural_parenting` | 264 | 1468 | 0 | 0 | 0 | 0 |

- 两本标准共 8 张表，**7 张由表格线精确还原**，0 漏检。
- 书名号那本 0 张表且 0 误报 —— 说明表格判定没有把正文误伤成表格。
- 页眉页脚自动识别为 boilerplate，例如标准的 `T/CNSS 014—2022`、`WS/T 678—2020`，
  以及书名号那本的水印行 `关注微信公众号 手手宝贝 免费获取更多育儿书`。

---

## 三、产物清单

| 产物 | 位置 | 数量 |
|---|---|---|
| 抽取中间件 | `data/_work/extract/*.jsonl` | 3 |
| 抽取报告 | `data/_work/extract/*.report.json` | 3 |
| 结构化 Markdown | `data/guidelines/<slug>/*.md` | 36 |
| 知识库文档 | `knowledge_documents` | 36（本次新增） |
| 知识库分块 | `knowledge_chunks` | 422（本次新增） |

### 分源分块统计

| slug | Markdown 文件 | 分块 | 其中表格块 |
|---|---|---|---|
| `postpartum_diet` | 1 | 24 | 4 |
| `complementary_feeding` | 1 | 24 | 3 |
| `cuiyutao_natural_parenting` | 34 | 374 | 0 |
| **合计** | **36** | **422** | **7** |

书名号那本按目录切成 5 个部分、34 个章节各一个文件，所以文件数最多。

### 分块元数据

每个分块都带以下字段，供检索期过滤与溯源：

```
source, doc_type, title, title_path, part, section,
block_type, population, age_min_month, age_max_month, doc_id, file
```

正文还带面包屑前缀，例如：

```
【第一部分 坚持了十余年的理念 > 02 怎么会想到自然养育？ > 养育的核心是家长的观念】
```

这样一段话被单独检索出来时，仍然知道自己属于哪一章哪一节。

Markdown 里每节还写了 `<!-- page: N-M -->` 页面出处注释，渲染时不可见，
入库时被剥离，用于把任意一段正文回溯到 PDF 页码。

---

## 四、校验方式与脚本

### 一键校验

```bash
cd babyGrowAi
.venv/bin/python scripts/verify_guidelines.py
```

退出码 `0` 表示全通过，非 0 表示有失败项，可直接接入 CI。
同时把结构化结果写入 `data/_work/verify/report.json`。

### 校验项清单（20 项）

脚本分四组，全程无需人工判断：

**A. Markdown 结构（4 项）**

| 校验项 | 含义 |
|---|---|
| `markdown.files` | `data/guidelines/` 下有产物 |
| `markdown.front_matter` | 每个文件的 `source` / `doc_type` / `population` 均非空 |
| `markdown.heading_tree` | 从 `#` 起、且不跳级 |
| `markdown.tables` | 每张表格各行列数一致、且有分隔行 |

**B. 数据库行（6 项）**

| 校验项 | 含义 |
|---|---|
| `db.every_file_ingested` | 每个 md 文件都有对应文档行 |
| `db.chunk_counts_match_files` | 库中分块数 == 用当前文件重算的分块数 |
| `db.every_chunk_embedded` | 无空向量 |
| `db.every_chunk_indexed` | 无空 tsvector |
| `db.embedding_dim` | 向量维度恒为 1024 |
| `db.no_regression_on_existing_chunks` | 原有 146 个非指南分块未被破坏 |

**C. 分块质量（6 项）**

| 校验项 | 含义 |
|---|---|
| `chunk.block_type` | 类型只能是 `text` 或 `table` |
| `chunk.metadata_complete` | 12 个元数据字段齐全 |
| `chunk.population_set` | 每块都声明了适用人群 |
| `chunk.age_range_valid` | `age_min_month <= age_max_month` |
| `chunk.size_bounded` | 不超过目标长度的 2 倍 |
| `chunk.breadcrumb` | 正文以面包屑 `【` 开头 |

**D. 检索冒烟（4 项）**

真实调用 `RetrievalService.retrieve()`，验证查得回、且人群不串味：

| 用例 | 查询 | 人群 | 期望 |
|---|---|---|---|
| `complementary_feeding` | 婴儿满6个月添加辅食的时间和方法 | baby | 命中《婴幼儿辅食添加营养指南》 |
| `postpartum_diet` | 产褥期妇女每天的能量和蛋白质推荐摄入量 | postpartum | 命中《产褥期妇女膳食指导》 |
| `cuiyutao_natural_parenting` | 自然养育的核心理念是什么 | baby | 命中《崔玉涛自然养育法》 |
| `population_isolation` | 产褥期妇女每天的能量推荐摄入量是多少 | baby | **不得**命中《产褥期妇女膳食指导》 |

### 幂等性校验

```bash
cd babyGrowAi
.venv/bin/python -m app.knowledge.ingest_guidelines
.venv/bin/python scripts/verify_guidelines.py
```

第二次入库后分块数必须不变。

---

## 五、校验结果

### 逐项结果

```
[PASS] markdown.files                         36 file(s) under data/guidelines
[PASS] markdown.front_matter                  all keys present
[PASS] markdown.heading_tree                  36 trees valid
[PASS] markdown.tables                        every pipe table is well formed
[PASS] db.every_file_ingested                 36 source(s) present
[PASS] db.chunk_counts_match_files            every file matches its chunk count
[PASS] db.every_chunk_embedded                no NULL embeddings
[PASS] db.every_chunk_indexed                 no NULL tsvectors
[PASS] db.embedding_dim                       dims=[1024]
[PASS] db.no_regression_on_existing_chunks    non-guideline chunks=146, baseline=146
[PASS] chunk.block_type                       every chunk is text or table
[PASS] chunk.metadata_complete                422 chunks complete
[PASS] chunk.population_set                   every chunk declares a population
[PASS] chunk.age_range_valid                  min <= max everywhere
[PASS] chunk.size_bounded                     all <= 1600 chars
[PASS] chunk.breadcrumb                       every chunk carries a breadcrumb
[PASS] retrieval.complementary_feeding        top=['...feeding_schedule_guide.md', '婴幼儿辅食添加营养指南', ...]
[PASS] retrieval.postpartum_diet              top=['产褥期妇女膳食指导', '产褥期妇女膳食指导', ...]
[PASS] retrieval.cuiyutao_natural_parenting   top=['崔玉涛自然养育法', '崔玉涛自然养育法', ...]
[PASS] retrieval.population_isolation         sources=['...nutrition_guide.md']

20/20 checks passed
```

### 关键指标

| 指标 | 数值 |
|---|---|
| 指南来源文档数 | 36 |
| 指南分块数 | 422 |
| 表格分块数 | 7 |
| 全库分块数 | 568（422 新增 + 146 原有） |
| 向量维度 | 1024（全量一致） |
| 空向量 / 空全文索引 | 0 / 0 |
| 校验通过率 | 20/20 |

### 幂等性实测

| 轮次 | 指南分块 | 文档总数 | 全库分块 |
|---|---|---|---|
| 首次入库 | 422 | 104 | 568 |
| 重跑入库 | 422 | 104 | 568 |
| **一次命令全流程重跑（含重新抽取）** | **422** | **104** | **568** |

三次结果完全一致 —— 从 PDF 重新抽取到入库，全流程可重复。

### 存量测试回归

```bash
cd babyGrowAi
.venv/bin/python -m pytest -q
```

```
33 passed, 116 warnings in 410.46s (0:06:50)
```

原有 33 个用例全部通过，**未因本次改动回归**。重点是这几个：

- `test_retrieval_regression.py` —— 检索准确率仍达标（本次改了 `retrieval.py`，
  且有 422 个新分块进入候选池，用例池从 146 变为 568，依然 ≥80%）
- `test_citation.py`、`test_agent_regression.py` —— 引用链路未受影响
- `test_rules_population.py` —— 人群路由未受影响

### 检索效果

- 产褥期查询 5 条结果**全部**来自《产褥期妇女膳食指导》，并被正确路由到
  `5.2.2 营养素` 一节。
- 人群隔离用例通过：以 `baby` 人群查询产褥期内容，**没有**任何产褥期分块返回。
- 命中的分块正文以面包屑开头，答案可直接标注出处。

---

## 六、过程中修复的两个问题

### 1. 表头居中导致的列错位

《产褥期妇女膳食指导》表 1 的表头是居中的、数据是左对齐的，按空格切列会多算出一列。
**修复**：在列锚点计算中丢弃「没有任何数据行写入」的锚点。

### 2. 人群词表不一致导致指南查不回来

第一次校验 19/20，唯一失败项是 `retrieval.complementary_feeding`：
《婴幼儿辅食添加营养指南》声明的人群是 `[infant, toddler]`，
而调用方传入的是 `baby`，最初的过滤逻辑要求**精确相等**，导致该标准被整本滤掉。

**修复**：在 `retrieval.py` 引入词表映射，把调用方的粗粒度词与来源的细粒度词
归到同一组槽位：

```python
POPULATION_SLOTS = {
    "baby":       {"baby", "infant", "toddler", "preschool", "child"},
    "postpartum": {"postpartum", "lactating"},
}
```

查询人群与来源声明的人群**只要有交集**即放行。这样既让辅食标准能回答 `baby` 查询，
又保证产褥期内容不会串进婴儿查询（`population_isolation` 用例仍然通过）。
原有 146 个分块没有 `population` 字段，不受影响，行为向后兼容。

---

## 七、已知限制

均为**局部冗余**，不影响检索正确性，记录在案以便后续优化。

### 1. 下标数字被拆行，导致 3 行重复

`pdfminer` 会把下标数字单独排成一行，所以《婴幼儿辅食添加营养指南》
营养素表的单元格被读成 `维生素B/（mg/d） 1` 而不是 `维生素B1/（mg/d）`。
归一化匹配因此失配，间距兜底又把这几行当新表格重新输出了一遍：

- `维生素B1`、`维生素B2` 被重出为一张 2 行小表；
- `维生素B12` 被重出为一行正文。

**影响范围**：仅该文档的 1 个分块（chunk 21，937 字），重复 3 行，且值与原表一致。
数据没有丢失也没有出错，只是同一块内多了一遍。
**不影响检索**：重复内容落在同一个 chunk，检索只返回一个结果、只标注一个出处。

### 2. 下标数字落在单元格末尾

同一原因，该单元格文本读作 `维生素B/（mg/d） 1`，即下标数字排到了括号后面。
语义仍可读，但要拿到严格的 `维生素B1` 字面串需要特殊处理。

### 3. 附录页眉漏网

该标准附录 C 的页眉 `CC WS/T 678—2020` 有 1 处未被 boilerplate 规则拦下，
留在了正文里。属于标准文件的版式噪声，量级为个位数行。

---

## 八、公开仓库的保密处置

这是 public 仓库，本次涉及的资料与凭据已按下列方式处理。

### 已做的处置

| 内容 | 风险 | 处置 |
|---|---|---|
| `docs/rag_docs/*.pdf` | 商业出版物 / 转载件，含盗版水印 | 加入根 `.gitignore` |
| `data/guidelines/` | 由上述 PDF 抽出的**正文全文** | 加入 `babyGrowAi/.gitignore` |
| `data/_work/` | 抽取中间产物，内容同上 | 加入 `babyGrowAi/.gitignore` |
| `.env` | 真实密钥 | 已被忽略（原有规则） |

> 说明：源 PDF 此前虽未被 git 跟踪，但**不在忽略名单里**，
> 一次 `git add -A` 就会把它们提交上去。现已显式忽略。

**仓库里保留的是 `scripts/` 里的流水线代码，不是数据本身。**
任何人都可以用自己合法获取的 PDF 在本地重建知识库 —— 能力开源，数据不入库。

### 脱敏而不使项目跑不起来的原则

关键是把「代码要什么」和「值是多少」分开：

1. **代码只读环境变量，不写死值**。服务从 `.env` 读，`.env` 永不入库。
2. **`.env.example` 只放占位符**，入库的是模板，不是可用凭据。
3. **README 说明需要哪些变量、去哪申请**，而不是贴出真实值。
4. **本地开发用默认值兜底**：`config.py` 里给本地地址（`localhost`）设默认值，
   这样不配任何密钥也能起服务跑通主干，脱敏不会阻断开发。

### 待确认项

`babyGrowAi/.env.example` 中的 `MYSQL_DSN` 仍带有 `babygrow:babygrow-dev`：

```
MYSQL_DSN=mysql+pymysql://babygrow:babygrow-dev@localhost:3306/baby_grow
```

同文件的 `PG_DSN` 也用了 `postgres:postgres`。二者都是本地开发用默认口令、
且 AI 服务实际只连 PG，风险很低；但既然要过一遍脱敏，建议统一改成
`<user>:<password>` 占位形式，与本文件「只放占位符」的原则保持一致。

---

## 九、如何复现

```bash
cd babyGrowAi

# 前置：Postgres(pgvector) 与 Ollama(bge-m3:latest) 已就绪
# 源 PDF 放在 <repo>/docs/rag_docs/，文件名见第一节表格

# 一条命令跑完全程并自我校验
./scripts/run_guidelines_pipeline.sh
```

只要仅校验、不重新入库：

```bash
cd babyGrowAi
./scripts/run_guidelines_pipeline.sh --verify
```

新增一本资料时，只需在 `scripts/run_guidelines_pipeline.sh` 的 `SOURCES`
加一行、在 `scripts/build_guidelines.py` 的 `PROFILES` 加一个 profile，
再在 `scripts/verify_guidelines.py` 的 `RETRIEVAL_CASES` 加一条冒烟用例。

---

## 附：文件清单

| 文件 | 作用 |
|---|---|
| `scripts/pdf_extract.py` | 阶段一：PDF → 还原后的文本块（JSONL） |
| `scripts/build_guidelines.py` | 阶段二：文本块 → 结构化 Markdown |
| `scripts/rag_paths.py` | 路径解析（区分主检出与 worktree） |
| `scripts/run_guidelines_pipeline.sh` | 一键执行四个阶段 |
| `scripts/verify_guidelines.py` | 自动校验，退出码即结论 |
| `src/app/knowledge/ingest_guidelines.py` | 阶段三：Markdown → 知识库 |
| `src/app/services/retrieval.py` | 检索；本次新增 `population` 过滤 |
| `docs/rag-pdf-vectorization-plan.md` | 总体方案 |
