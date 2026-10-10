# 页面评估：流程 / 跳转 / 交互 / 功能缺口

> 评估时点：五个模块共 23 个页面已实现（Journey、Analysis、Record、Wishes、Family）。
> 每条结论都附了代码依据，便于核对。

---

## 一、流程不闭环：有入口，没结果（优先级最高）

这类问题的共同点是**用户完成了一个动作，但界面上看不到任何结果**——比缺功能更伤，因为会让人以为操作失败。

### 1. 记录之后，时间线不会变 ⚠️ 最严重

`功能亮点`：底部中间加号 → 记录弹层 → 文字/图片/识别 → 「保存到时间线」。

实际上：

- `components/RecordSheet/RecordSheet.tsx:73` 保存时只 `showToast('已保存到时间线（本地）')` 然后 `onClose()`
- `pages/journey/list/index.tsx:27` 时间线读的是静态常量 `journeyTimeline`，**没有任何追加路径**

**这是整个应用的核心动作**（记录宝宝日常），却看不到结果。建议：保存后把新记录追加进时间线并在返回时可见。

### 2. 邀请完成后，成员列表不会多出人

`pages/family/invite/token/index.tsx` 整条邀请链路里没有任何写回成员列表的动作。走完「填称呼 → 选权限 → 生成凭证 → 发出邀请」，回到首页成员还是原来三个。

建议：至少加一个「待接受」状态的成员条目。

### 3. 心愿清单没有「新建心愿」入口

`pages/wishes/index.tsx` 里只有 `navigateToRoute(wish.route)`（点已有心愿）和删除确认，**没有新建入口**。底部中间的加号打开的是记录弹层，不是心愿创建。

也就是说：**心愿只能看和删，不能建**。建议补一个「新建心愿」入口（文案 + 目标值 + 类型）。

### 4. 记忆检索没有关键词搜索

`pages/family/memories/index.tsx:149` 那一处 `icon="search"` 是空态的插图，不是输入框。页面只有筛选面板（时间范围 / 分类 / 媒体类型），**没有任何文本输入**。

但入口是首页「What to Share?」旁那个放大镜，用户预期是搜索。建议补关键词搜索框。

### 5. 换画风模板，预览不变

`pages/family/poster/index.tsx:11` 的 `template` 状态**只用于 chip 的选中态**，底下的海报预览是写死的一版。用户点了「成长杂志」却还是「温馨手账」的样子。

建议：三个模板各给一套配色/排版变量，切换时预览真的变。

### 6. 疫苗详情的四个动作都是占位

`pages/journey/vaccine/index.tsx:11` 的 `notImplemented()` 覆盖了 **Edit Entry / Delete Record / Add Photo / Share** 四个动作。其中「编辑」和「删除」是详情页的必备能力。

### 7. 海报「保存到相册」是占位

`pages/family/poster/index.tsx:24` 明确提示「海报导出待开发」（这里我当初选择了不假装成功）。需要离屏绘制（canvas）把预览合成成图片才能真保存。

### 8. 记录弹层的「语音录入」是占位

`components/RecordSheet/RecordSheet.tsx:97` — `语音录入待开发`。而入口文案写着「可录入文字/图片/语音」。

---

## 二、状态缺失

### 9. 全站没有任何 error 状态 ⚠️

扫描 23 个页面，`'error'` 出现 **0 次**。`types/common.ts` 里定义了 `SectionState = 'loading' | 'empty' | 'content' | 'error'`，但四态里只用到了三态。

`docs/stitch-to-taro/STITCH_TO_TARO_MISTAKE_BOOK.md` 第 6 条明确要求四态齐全。接后端后网络失败会没有兜底。

### 10. 大部分新页面没有加载态

| 有 loading | 没有 loading |
|---|---|
| 6 个分析页、心愿列表、记忆检索 | Journey 首页、里程碑、时间线、日历、疫苗、周报、宝宝画像、更换头像、家庭首页、邀请 3 页、海报 |

分析页与心愿列表的 loading 已经证明了这套模式好写，补齐成本不高。

### 11. Journey 首页没有空态

`pages/journey/index.tsx` 是纯静态渲染，没有空态。设计稿里 `journey_empty` 是一张独立设计（也在错题本里被专门复盘过），但**没有实现**。

---

## 三、架构性缺口（影响接后端）

### 12. 没有全局状态，编辑离开页面就丢 ⚠️

项目里没有任何 store / Context。这意味着：

| 操作 | 现状 |
|---|---|
| 改宝宝名字、年龄、性别、星座 | 退出页面即还原 |
| 增删偏好 | 退出即还原 |
| 改成员权限、移出成员 | 退出即还原 |
| 勾选 checklist、加减计数器、拖动排序 | 退出即还原 |
| 换头像 | 只在本页显示 |

单独看每页都「能操作」，但**串起来是一个不会记住任何事的应用**。这是目前最影响「能不能演示」的问题。

最小可行方案：加一个轻量的全局 store（或 `Taro.setStorageSync` 落地），让改动至少本次会话内可见。

### 13. 只有 6 个分析页走了 API/mock 层

`src/api/modules/` 有 baby/growth/sleep/diet/mood/journey/ai 七组接口，`src/mock/` 也有对应的 mock 路由——**但只有分析页在用**。

其余 17 个页面清一色在页内写死 `xxxData.ts`。接后端时要逐个重写数据层。

建议：新页面统一改成「页面 → api 模块 → mock 路由」的写法，把数据层收敛到一处。

---

## 四、数据一致性

### 14. 首页写着 Emma，其余全是 Leo

`pages/journey/index.tsx:175` — `"Emma has been sleeping 15% longer during daytime naps this week."`

其余所有页面（分析、周报、画像、家庭）都是 **Leo**。这是最初那批 mock 的遗留。

### 15. 里程碑内容跨页对不上

| 页面 | 内容 |
|---|---|
| Journey 首页 | First Smile（2 days ago）、Grasping（1 week ago）、Rolling Over（3 days ago）——相对时间 |
| 里程碑列表页 | First Steps（Oct 12, 2023）、First Word（Sep 05）、Slept Through The Night、First Solid Food——绝对日期 |
| 时间线列表 | First real laugh!、Bottle、Night Sleep |

同一个宝宝的成长记录，三处内容互不相干，且日期体系不统一（相对 vs 绝对）。

---

## 五、交互细节

### 16. 两处「更多」是分页占位

`pages/journey/list/index.tsx:93` 与 `pages/journey/milestones/index.tsx:112` 点了只弹「已加载全部」。列表本来也不长，但如果要保留这个控件，至少要让文案与真实状态一致（比如数据不足时隐藏）。

### 17. 心愿的目标值不可改

`pages/wishes/counter/index.tsx` 的 `/100` 是数据里写死的，页面没有修改目标值的入口。既然叫「100 Books Before K」，用户应该能改这个数字。

### 18. 家庭成员没有「待接受」状态

邀请发出后，受邀方在加入前应该是个 pending 状态；现在成员列表只有已加入的三种角色。

---

## 六、我确认**没有**问题的部分

为避免过度修改，这些我核对过是好的：

- **路由无死链**：29 个路由 id 全部有落点，没有点了弹「待开发」的跳转
- **返回路径完备**：每个页面要么有返回键，要么在 `AnalysisLayout` 里带底部 tab，没有死胡同
- **底部 tab 全通**：Journey / Analysis / Wishes / Family 四个 tab 都能切
- **两套保存语义自洽**：计数器、checklist、偏好管理都是「改动 → Cancel 还原快照 / Done 落库」的一致模型
- **标题层级统一**：全站导航标题居中、同色同字号，章节标题不超过标题
- **无遗留标记**：没有 TODO / FIXME / HACK

---

## 建议的处理顺序

| 顺序 | 项目 | 理由 |
|---|---|---|
| 1 | #12 全局状态 | 不解决的话，其余交互都无法验证「是否真的生效」 |
| 2 | #1 记录→时间线闭环 | 应用的核心动作，闭环了才叫能用 |
| 3 | #13 数据层收敛 | 越晚做返工越大；接后端前必须统一 |
| 4 | #3 #4 两个必备入口缺失 | 心愿不能建、记忆不能搜，是功能缺项不是优化 |
| 5 | #9 #10 #11 状态补齐 | 接后端前补完，否则失败路径无兜底 |
| 6 | #2 #5 #6 #7 #8 | 各自独立的断链，可并行 |
| 7 | #14 #15 #16 #17 #18 | 数据一致性收尾 |

`#12` 和 `#13` 是架构级的，改动面较大但一次到位；其余多为局部补充。
