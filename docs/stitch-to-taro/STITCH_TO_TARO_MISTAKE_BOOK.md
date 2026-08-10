# Stitch → Taro 错题本：Journey Empty 页面

> 设计来源：[journey_empty.html](file:///Users/betus/Documents/trae_projects/baby-growth/design_sources/stitch/journey/journey_empty/journey_empty.html)。
>
> 目标：记录 Stitch Web 原型迁移为 Taro 微信小程序时的典型误区、修复路径和可沉淀为技术博客的话题。

## 使用方式

每次开发新页面后，若出现同类问题，补充“现象、根因、修复、预防”四项。不要只记录最后代码，要记录错误决策为何发生。

---

## 01. 把 Stitch 的 Tailwind/HTML 当作可直接复用源码

### 错误做法
直接把导出 HTML 的多层 div 与长 Tailwind class 串翻译到 Taro JSX 中。

### 在该页面中的触发点
- Tailwind CDN 和页面内 `tailwind.config`。
- `fixed top-0 ... px-margin-mobile h-16` 等长 class 组合。
- 用展示 class 表达页面所有细节，而没有业务结构。

### 后果
- 页面结构与业务语义脱节。
- 颜色、间距、圆角重复散落，后续 Figma 精修时难以全局调整。
- 多端兼容问题被隐藏在 class 串中。

### 修复方案
先从 HTML 提取视觉规律，再重建为：

```text
JourneyEmptyPage
  PageHeader
  WeeklyInsightCard
  MilestoneEmptyState
  JourneyTimelineEmpty
  MealPlanPlaceholder
  BottomTabBar
```

把样式映射到 tokens 和语义化 SCSS，而不是迁移 class。

### 预防规则
HTML 是视觉参考；`Page / Section / Component` 才是源码结构。

### 可写博客题目
《为什么 Stitch 导出的 HTML 不能直接迁移到 Taro：从视觉代码到可维护组件的翻译过程》

---

## 02. 用绝对定位还原所有视觉位置

### 错误做法
为了和截图对齐，把标题、卡片、列表、按钮都通过 `position: absolute` 和固定 top/left 值摆放。

### 在该页面中的触发点
- 顶部栏中间标题使用 `absolute left-1/2 -translate-x-1/2`。
- 时间线竖线使用绝对定位。
- 周报卡片右上角光晕使用绝对定位。

### 根因
将“截图坐标”误认为“布局规则”。

### 后果
- 文本变长、机型变窄、内容动态变化时重叠或截断。
- 页面高度变化后时间线或装饰脱位。
- 触控区被装饰层覆盖。

### 修复方案
- 主内容区、卡片内部文本、按钮组、两列菜单使用 `flex` / 正常文档流。
- 仅保留三个合理的绝对定位场景：
  1. 顶部栏视觉居中的标题；
  2. 时间线竖线；
  3. 卡片背景装饰。
- 给所有绝对定位元素提供 `relative` 父容器和明确 z-index。

### 预防规则
先问“内容增长后布局是否仍成立”。如果答案是否定的，就不能用 absolute。

### 可写博客题目
《小程序高保真还原中的绝对定位边界：哪些该用，哪些绝不能用》

---

## 03. 固定头部/底部栏覆盖内容

### 错误做法
直接使用 `position: fixed` 实现顶部栏和底部 TabBar，却没有为滚动内容预留空间。

### 在该页面中的触发点
- 导出页顶部栏为 `fixed top-0`。
- 底部导航为 `fixed bottom-0`，且中间录入按钮向上突出。

### 后果
- 首个区块被顶部栏遮挡。
- 最后一张卡片或说明文案被底部导航压住。
- 含安全区的设备上问题更明显。

### 修复方案
在页面容器统一处理：
- `padding-top = headerHeight + 页面顶部间距`
- `padding-bottom = tabbarHeight + safeArea + 页面底部间距`
- 中间悬浮按钮的突出高度应纳入 TabBar 占位高度。

不要把补偿 padding 零散写在各个 section。

### 预防规则
任何 fixed 元素出现时，先定义对应的“内容安全区域 token”。

### 可写博客题目
《Taro 小程序固定导航不遮挡内容：安全区与页面内容区的统一设计》

---

## 04. 依赖 Web 专属视觉能力

### 错误做法
将 `backdrop-filter`、hover、伪元素、随机 DOM 动画直接照搬。

### 在该页面中的触发点
- `glass-card` 使用 `backdrop-filter: blur(12px)`。
- 多处 `hover` / `active` Tailwind 交互类。
- `pebble-dot::before` 伪元素。
- 底部动态气泡由浏览器脚本随机生成和动画。

### 后果
- 小程序端效果不稳定或无法运行。
- 平台差异导致视觉不一致。
- 无必要动画增加渲染和调试复杂度。

### 修复方案
| Web 原效果 | 小程序稳定替代 |
| --- | --- |
| 毛玻璃 `backdrop-filter` | 半透明浅背景 + 低对比边框 + 轻阴影 |
| `hover` | 点击态/按压态，或不做状态变化 |
| `::before` 装饰点 | 真实 `View` 节点或背景图 |
| 随机气泡脚本 | 固定静态装饰；参赛期可直接移除 |
| 外链动画库 | 小程序兼容的简单 transition，非核心则省略 |

### 预防规则
“效果缺失不能影响信息层级和操作流程”。视觉特效永远是可降级层。

### 可写博客题目
《从 Web 原型到微信小程序：毛玻璃、Hover 和随机动画的降级策略》

---

## 05. 沿用 Google Fonts 与 Material Symbols

### 错误做法
保留 Google Fonts、Material Symbols 的 `<link>` 并把图标名称作为 UI 依赖。

### 在该页面中的触发点
- `Plus Jakarta Sans`、`Nunito Sans` 的 Google Font 链接。
- `calendar_month`、`auto_awesome`、`stars`、`restaurant_menu` 等 Material Symbols。

### 后果
- 小程序无法稳定加载外链字体和图标字体。
- 网络、平台和包体策略不受控。
- 图标命名散落于页面，后续更换资源困难。

### 修复方案
- 文本默认系统字体栈；若必须使用品牌字体，仅本地内置且限制在关键标题。
- 抽 `Icon` 组件，图标由本地 SVG/图标字体资源映射：

```tsx
<Icon name="calendar" size={20} color="var(--color-text-primary)" />
```

### 预防规则
页面不得直接依赖外部 font/icon URL；业务代码只认识 `Icon name`。

### 可写博客题目
《微信小程序字体与图标资产本地化：如何摆脱 Google Font 和 Material Symbols》

---

## 06. 把空态当作静态装饰

### 错误做法
只复刻“No milestones yet”等截图内容，没有定义它由什么数据条件触发，也没有连接主操作。

### 在该页面中的触发点
- 周报欢迎态。
- 里程碑空态。
- 时间线空态。
- 餐食计划空态。

### 后果
- 接口接入后逻辑散乱。
- 加载、错误、空数据容易混淆。
- 用户无从通过按钮完成下一步。

### 修复方案
为每个区块定义显式状态：

```ts
type SectionState = 'loading' | 'empty' | 'content' | 'error'
```

空态组件须具备：图示、标题、说明、主操作；页面通过数据状态选择渲染，而不是硬编码整个截图。

### 预防规则
每个 Stitch “状态页面”先写状态矩阵，再开始写 UI。

### 可写博客题目
《把设计稿里的空态变成真实业务状态：Taro 页面状态矩阵实践》

---

## 07. 不抽取组件或过度抽取组件

### 错误做法 A：不抽取
把周报、里程碑、时间线、餐食区块写在一个页面文件里。

### 错误做法 B：过度抽取
每一个 div 都创建组件，例如 `Frame1`、`TextArea2`、`CardInner`。

### 修复方案
按“稳定语义 + 复用可能 + 独立状态”决定组件边界：
- 公共组件：`PageHeader`、`SectionCard`、`EmptyState`、`BottomTabBar`、`Icon`。
- Journey 域组件：`WeeklyInsightCard`、`MilestoneEmptyState`、`JourneyTimelineEmpty`、`MealPlanPlaceholder`。
- 仅排版作用的容器保留在当前组件，不单独抽文件。

### 预防规则
组件命名必须能回答：“它在产品中是什么？”而不是“它在导出 HTML 的第几层？”

### 可写博客题目
《从 Figma/Stitch Frame 到 React 组件：避免“不抽取”和“过度抽取”两种极端》

---

## 08. 为单页面重新创建一套 Design Tokens

### 错误做法
从本页导出代码逐个复制 `#fff8f1`、`#5f5f59`、`20px`、`24px`、`32px`。

### 后果
- 同一产品出现多套相近但不一致的颜色与间距。
- Figma 后续微调时无法集中修改。

### 修复方案
优先映射到项目 token：
- 背景/表面色 -> `color-bg-page`、`color-bg-card`。
- 文本色 -> `color-text-primary`、`color-text-secondary`。
- 20px 页面边距 -> `spacing-page-gutter`。
- 16px/24px/32px -> `spacing-*`。
- 16px/32px 圆角 -> `radius-*`。

仅当新值具有跨页面复用价值时，新增 token，并记录其使用场景。

### 预防规则
出现第 2 次相同视觉值时评估抽 token；第 3 次必须抽。

### 可写博客题目
《Design Token 如何降低设计精修后的前端返工：一个 Stitch 项目的实践记录》

---

## 09. 依赖不受控的远程图片

### 错误做法
直接使用 Stitch HTML 中的 Google 图片 URL 作为头像、插画或重要 UI 资源。

### 后果
- 小程序域名白名单、网络失败和资源失效风险。
- 正式作品无法保证视觉可复现。

### 修复方案
- 占位阶段使用本地占位资源或项目允许的可信 CDN。
- 正式资源进入 `assets` 或对象存储/CDN，并由统一资源配置管理。
- 为图片加载失败提供默认头像/空态。

### 预防规则
设计稿远程图只用于识别内容和构图，不是生产资源来源。

### 可写博客题目
《Stitch 原型远程图片迁移到小程序：资源治理与可复现 UI》

---

## 页面复盘结论

`journey_empty` 的主要价值不是复刻一张空态截图，而是验证一条可复用的迁移链路：

```text
Stitch HTML + PNG
  → 识别设计 token 与信息层级
  → 重建 Page / Section / Component 结构
  → Web 特性降级为小程序稳定实现
  → 空态与数据状态解耦
  → 用共享组件和 tokens 交付页面
```

后续 Figma 精修时，只要 token、组件边界和页面状态模型保持稳定，通常只需调整组件内部布局和样式，而不必推倒页面业务逻辑。
