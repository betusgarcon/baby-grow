# Stitch → Taro 页面生成 Prompt 基线

> 来源页面：[journey_empty.html](file:///Users/betus/Documents/trae_projects/baby-growth/design_sources/stitch/journey/journey_empty/journey_empty.html)。
>
> 用途：新页面由 AI 根据 Stitch HTML、PNG 及已有 Taro 工程生成/修改代码时，将下方 Prompt 作为固定约束，并在末尾追加该页面的具体功能、参考文件和路由要求。

## 一、从 Journey Empty 页面提炼的风险点

1. **Stitch HTML 是视觉参考，不是可直接迁移的源码。**
   - Tailwind CDN、Google Fonts、Material Symbols、浏览器脚本及原型动效不能直接迁移到小程序。
   - 只提取布局、信息层级、间距、色彩、圆角、边框和状态表达。

2. **避免以绝对定位完成常规布局。**
   - 页面主内容、卡片、列表、按钮组和底部导航必须优先使用正常文档流、`flex` 或小程序兼容的布局。
   - 仅以下视觉元素可以使用绝对定位：时间线竖线、卡片角落装饰、居中标题、悬浮按钮的局部装饰。
   - 所有绝对定位元素必须由明确的 `position: relative` 父容器约束，且不得遮挡点击区域。

3. **固定顶部栏和底部 TabBar 必须给内容预留空间。**
   - `fixed` 头部/底部栏不能覆盖首段和末段内容。
   - 页面内容需要预留顶部栏高度、底部导航高度及安全区高度；不要只依赖随意的魔法数字。

4. **不要复制 Tailwind class 串。**
   - 将样式语义映射为项目 tokens、组件样式和语义化 class。
   - 例如 `glass-card` 应被识别为 `SurfaceCard`/`InsightCard`，而不是复制为每个页面的一组 CSS 属性。

5. **Web 特性需要有小程序降级。**
   - `backdrop-filter`、`hover`、随机背景气泡、复杂 `blur`、浏览器伪元素等不能作为核心视觉依赖。
   - 玻璃卡片可降级为半透明浅色背景 + 细边框 + 轻阴影；hover 改为点击态；装饰气泡默认静态或移除。

6. **外链字体和 Google 图标不可作为正式依赖。**
   - 正文使用系统字体栈；图标统一使用项目内 `Icon` 组件及本地 SVG/图标资源。
   - 不得在页面内引入 Google Font、Material Symbols 或依赖外链图片作为关键 UI。

7. **空态不是“少渲染一点”，而是独立业务状态。**
   - 该页面同时存在周报欢迎态、里程碑空态、时间线占位空态、餐食占位空态。
   - 每个状态需有明确的数据条件、文案、主操作和后续真实数据态切换路径。

8. **组件边界应按语义划分，而非按 HTML 的 div 层级划分。**
   - `PageHeader`、`WeeklyInsightCard`、`MilestoneEmptyState`、`JourneyTimelineEmpty`、`MealPlanPlaceholder`、`BottomTabBar` 是合理组件候选。
   - 不创建 `Frame1`、`InnerWrap`、`TopBox` 等无业务语义组件。

9. **页面必须先用共享 tokens，不能从导出页另起一套主题。**
   - Stitch 页中的颜色、字号、间距、圆角应优先映射到已有 token；确有新增才扩充 token。
   - 不为单页重复定义 `#fff8f1`、`20px`、`24px`、`32px` 等值。

10. **交付前以参考 PNG 做视觉回归。**
    - 校验内容层级、页面留白、卡片间距、固定栏遮挡、文字换行、空态重心和触控区域。
    - 不追求复制浏览器无法稳定支持的特效；优先保证小程序稳定、可点击和布局不溢出。

---

## 二、可直接复用的生成 Prompt

```text
你是资深 Taro + React + TypeScript 小程序前端工程师。请根据提供的 Stitch HTML、对应 PNG 和现有项目规范，实现/修改一个微信小程序页面。

### 输入
- Stitch HTML：{HTML_PATH}
- 视觉参考 PNG：{PNG_PATH}
- 目标页面与路由：{PAGE_AND_ROUTE}
- 已有组件/Token：{EXISTING_COMPONENTS_AND_TOKENS}
- 页面业务状态：{PAGE_STATES}

### 总原则
1. Stitch HTML 仅作为视觉和布局参考，不得直接复制 Tailwind class、HTML 嵌套、外链字体、Google Material Symbols、Tailwind CDN、浏览器脚本或 iframe 原型结构。
2. 先分析 PNG，再分析 HTML；先输出 Page / Section / Component 的结构判断，再写代码。
3. 页面结构采用语义化组件。优先复用已有的 PageContainer、PageHeader、SectionCard、EmptyState、Icon、BottomTabBar 等；不存在时仅新增真正可复用的组件。
4. 所有颜色、字号、间距、圆角、阴影优先使用项目 Design Tokens。若必须新增 token，说明复用场景并将其放入 token 文件，禁止把重复的色值和尺寸散落在页面样式中。
5. 正常布局必须使用 flex、正常文档流或网格布局。禁止用 absolute/fixed 拼装普通内容区。
6. 绝对定位仅用于：卡片装饰、时间线连线、局部图标覆盖、需要严格视觉居中的标题。每个 absolute 元素必须有 relative 父容器，并说明为什么不能用常规布局。
7. 如使用固定顶部栏或底部导航，内容区必须预留 header、tabbar 和安全区空间，保证首尾内容不被遮挡。
8. 小程序优先兼容：不得依赖 hover、backdrop-filter、CSS 伪元素、随机 DOM 脚本、Google Font 或外链图标。对视觉效果提供稳定降级：半透明背景/细边框/轻阴影替代毛玻璃；静态装饰替代随机动画。
9. 图标必须通过项目本地 Icon 组件使用；文本使用系统字体栈或项目已内置字体，不引入外链资源。
10. 将空态、加载态、错误态、AI 生成中/结果态作为明确组件或 variant，实现可从真实数据态切换，不能只写静态截图。
11. 组件命名使用业务语义，例如 WeeklyInsightCard、MilestoneEmptyState、JourneyTimeline；禁止 Frame1、Box2、InnerWrap 等名称。
12. 保持页面可维护：页面负责组合与数据状态，复杂区块放入私有组件，通用视觉单元放入公共组件。

### 交付要求
1. 给出实现前的组件拆分和状态映射。
2. 实现 TypeScript 类型完整、可运行的 Taro React 代码及模块化 SCSS。
3. 说明新增/复用的 token、组件和资源。
4. 列出无法在小程序原样实现的 Stitch Web 特性及降级方案。
5. 按参考 PNG 逐项自检：固定栏遮挡、内容溢出、文字换行、间距、卡片层级、触控目标、空态可操作性。
```

---

## 三、页面提交前检查清单

- [ ] 未复制 Tailwind CDN、Google Font、Material Symbols 或浏览器脚本。
- [ ] 未用 absolute/fixed 拼装正常内容流。
- [ ] 固定头部和底部导航没有遮挡内容。
- [ ] 重复视觉值已映射到 token。
- [ ] 复用结构已抽组件，页面文件只负责组合。
- [ ] 空态/加载态/错误态有独立条件和操作入口。
- [ ] 图标使用本地 `Icon` 组件，图片资源可控。
- [ ] Web 专属效果有稳定的小程序降级方案。
- [ ] 在目标机型尺寸下没有横向溢出、裁切或文字重叠。
- [ ] 已对照 PNG 完成视觉回归。
