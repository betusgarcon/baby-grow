# Design Token 定义与 Figma 对接方案

> 基于当前项目 `baby-grow-mini` 的 design token 实现，梳理 Figma 中的 Token 定义步骤、已有组件的替换方式，以及 Figma MCP Bridge 的 Token 读取能力分析。

---

## 一、当前项目 Design Token 架构

项目采用 **三层 Token 体系**：

| 层级 | 文件 | 作用 |
|------|------|------|
| **全局 Token** | `babycare/tailwind.config.js` | 全局颜色、字体、间距、圆角、阴影 |
| **模块 Token** | `babycare/src/pages/analysis/components/analysisTokens.ts` | 分析模块专用语义化 token |
| **全局样式** | `babycare/src/app.scss` | 通过 `theme()` 函数引用 Tailwind token |

### 1.1 全局 Token（tailwind.config.js）

#### 颜色（Material Design 3 命名规范）

| Token Name | Hex 值 | 用途 |
|------------|--------|------|
| `primary` | `#5F5F59` | 主品牌色 |
| `on-primary` | `#FFFFFF` | 主色上的文字 |
| `primary-container` | `#FFFDF5` | 主色容器背景 |
| `secondary` | `#765842` | 次品牌色 |
| `secondary-container` | `#FED5B9` | 次色容器背景 |
| `tertiary` | `#406651` | 强调色（绿色） |
| `tertiary-container` | `#F7FFF7` | 强调色容器背景 |
| `surface` | `#FFF8F1` | 页面背景 |
| `on-surface` | `#1E1B17` | 页面文字 |
| `on-surface-variant` | `#474741` | 变体文字 |
| `surface-container` | `#F4EDE5` | 容器背景 |
| `surface-container-high` | `#EEE7DF` | 高层级容器 |
| `error` | `#BA1A1A` | 错误色 |
| `outline` | `#777770` | 描边色 |
| `outline-variant` | `#C8C7BE` | 弱描边色 |
| `background` | `#FFF8F1` | 全局背景 |

#### 分析模块颜色（analysis 命名空间）

| Token Name | Hex 值 |
|------------|--------|
| `analysis.text-primary` | `#2E2822` |
| `analysis.text-secondary` | `#6F6760` |
| `analysis.text-tertiary` | `#8C857D` |
| `analysis.text-muted` | `#9B958E` |
| `analysis.title-accent` | `#835332` |
| `analysis.highlight` | `#D57C69` |
| `analysis.active-bg` | `#D9E7CE` |
| `analysis.active-text` | `#5B7358` |
| `analysis.inactive-bg` | `#EFEEEB` |
| `analysis.inactive-text` | `#7A766F` |
| `analysis.card-border` | `#E4DFD9` |
| `analysis.card-muted-border` | `#E0DAD2` |
| `analysis.card-muted-bg` | `#F4F1EC` |
| `analysis.highlight-orange` | `#C97D55` |
| `analysis.highlight-olive` | `#88A48A` |
| `analysis.sleep-night` | `#97A8AF` |
| `analysis.sleep-nap` | `#D2C9BC` |
| `analysis.sleep-awake` | `#E7E8E6` |

#### 字体

| Token Name | 字号 / 行高 / 字重 |
|------------|-------------------|
| `display` | 40px / 48px / 700 |
| `headline-lg` | 28px / 36px / 600 |
| `headline-md` | 20px / 28px / 600 |
| `body-md` | 16px / 24px / 400 |
| `body-lg` | 18px / 26px / 400 |
| `label-md` | 14px / 20px / 600 |
| `caption` | 12px / 16px / 400 |

#### 间距

| Token Name | 值 |
|------------|---|
| `base` | 4px |
| `xs` | 8px |
| `sm` | 12px |
| `md` | 16px |
| `lg` | 24px |
| `xl` | 32px |

#### 圆角

| Token Name | 值 |
|------------|---|
| `DEFAULT` | 16px (1rem) |
| `lg` | 32px (2rem) |
| `xl` | 48px (3rem) |
| `2xl` | 20px |
| `3xl` | 24px |
| `full` | 9999px |

#### 阴影

| Token Name | 值 |
|------------|---|
| `card` | `0 10px 30px rgba(31,42,46,0.08)` |
| `float` | `0 16px 32px rgba(73,98,105,0.24)` |
| `modal` | `0 24px 60px rgba(31,42,46,0.16)` |

### 1.2 模块 Token（analysisTokens.ts）

```typescript
export const analysisColors = {
  titleAccent: '#835332',
  activeBg: '#D9E7CE',
  activeText: '#5B7358',
  inactiveBg: '#EFEEEB',
  inactiveText: '#7A766F',
  cardBorder: '#E4DFD9',
  cardMutedBorder: '#E0DAD2',
  cardMutedBg: '#F4F1EC',
  textPrimary: '#2E2822',
  textSecondary: '#6F6760',
  textTertiary: '#8C857D',
  textMuted: '#9B958E',
  highlightOrange: '#C97D55',
  highlightOlive: '#88A48A',
  sleepNight: '#97A8AF',
  sleepNap: '#D2C9BC',
  sleepAwake: '#E7E8E6',
  chartSurface: '#F7F4EF',
  chartBorder: '#E6DDD4',
} as const

export const analysisRadii = {
  xl: 'rounded-[24px]',
  xxl: 'rounded-[28px]',
  card: 'rounded-[32px]',
  pill: 'rounded-full',
} as const

export const analysisShadows = {
  card: 'shadow-[0_4px_30px_rgba(0,0,0,0.04)]',
  elevated: 'shadow-[0_30px_60px_-15px_rgba(0,0,0,0.04)]',
} as const

export const analysisClasses = {
  card: `bg-white border border-[${analysisColors.cardBorder}] ${analysisShadows.card}`,
  softCard: `bg-[${analysisColors.cardMutedBg}] border border-[${analysisColors.cardMutedBorder}]`,
  interactivePill: `bg-[${analysisColors.activeBg}] text-[${analysisColors.activeText}]`,
} as const
```

---

## 二、Figma 中 Token 定义步骤

### Step 1：创建 Variables 集合

在 Figma 右侧面板 → **Variables** 标签下创建以下集合，名称和结构需与 `tailwind.config.js` 一一对应。

#### 1.1 颜色集合 `Baby-Growth / Colors`

按 Material Design 3 命名规范分组创建变量：

| Variable Name | Hex 值 | 用途 |
|---------------|--------|------|
| `color/primary` | `#5F5F59` | 主品牌色 |
| `color/on-primary` | `#FFFFFF` | 主色上的文字 |
| `color/primary-container` | `#FFFDF5` | 主色容器背景 |
| `color/secondary` | `#765842` | 次品牌色 |
| `color/secondary-container` | `#FED5B9` | 次色容器背景 |
| `color/tertiary` | `#406651` | 强调色（绿色） |
| `color/tertiary-container` | `#F7FFF7` | 强调色容器背景 |
| `color/surface` | `#FFF8F1` | 页面背景 |
| `color/on-surface` | `#1E1B17` | 页面文字 |
| `color/on-surface-variant` | `#474741` | 变体文字 |
| `color/surface-container` | `#F4EDE5` | 容器背景 |
| `color/surface-container-high` | `#EEE7DF` | 高层级容器 |
| `color/error` | `#BA1A1A` | 错误色 |
| `color/outline` | `#777770` | 描边色 |
| `color/outline-variant` | `#C8C7BE` | 弱描边色 |

#### 1.2 分析模块颜色集合 `Baby-Growth / Analysis Colors`

与 `analysisTokens.ts` 完全对齐：

| Variable Name | Hex 值 |
|---------------|--------|
| `analysis/title-accent` | `#835332` |
| `analysis/text-primary` | `#2E2822` |
| `analysis/text-secondary` | `#6F6760` |
| `analysis/text-tertiary` | `#8C857D` |
| `analysis/text-muted` | `#9B958E` |
| `analysis/active-bg` | `#D9E7CE` |
| `analysis/active-text` | `#5B7358` |
| `analysis/inactive-bg` | `#EFEEEB` |
| `analysis/card-border` | `#E4DFD9` |
| `analysis/card-muted-bg` | `#F4F1EC` |
| `analysis/highlight-orange` | `#C97D55` |
| `analysis/highlight-olive` | `#88A48A` |
| `analysis/sleep-night` | `#97A8AF` |
| `analysis/sleep-nap` | `#D2C9BC` |
| `analysis/sleep-awake` | `#E7E8E6` |

#### 1.3 字体集合 `Baby-Growth / Typography`

| Variable Name | 值 |
|---------------|---|
| `font/display` | 40px / 48px / 700 |
| `font/headline-lg` | 28px / 36px / 600 |
| `font/headline-md` | 20px / 28px / 600 |
| `font/body-md` | 16px / 24px / 400 |
| `font/body-lg` | 18px / 26px / 400 |
| `font/label-md` | 14px / 20px / 600 |
| `font/caption` | 12px / 16px / 400 |

#### 1.4 间距集合 `Baby-Growth / Spacing`

| Variable Name | 值 |
|---------------|---|
| `space/base` | 4px |
| `space/xs` | 8px |
| `space/sm` | 12px |
| `space/md` | 16px |
| `space/lg` | 24px |
| `space/xl` | 32px |

#### 1.5 圆角集合 `Baby-Growth / Radius`

| Variable Name | 值 |
|---------------|---|
| `radius/default` | 16px (1rem) |
| `radius/lg` | 32px (2rem) |
| `radius/xl` | 48px (3rem) |
| `radius/2xl` | 20px |
| `radius/3xl` | 24px |
| `radius/full` | 9999px |

#### 1.6 阴影集合 `Baby-Growth / Shadow`

| Variable Name | 值 |
|---------------|---|
| `shadow/card` | `0 10px 30px rgba(31,42,46,0.08)` |
| `shadow/float` | `0 16px 32px rgba(73,98,105,0.24)` |
| `shadow/modal` | `0 24px 60px rgba(31,42,46,0.16)` |

### Step 2：创建 Modes（模式）

在 Variables 面板中创建两个 Mode：

- **Light**（默认）：使用上表中的值
- **Dark**（可选）：未来扩展暗色主题

### Step 3：绑定到 Figma 图层

1. 选中图层 → Fill / Stroke 属性
2. 点击颜色 → 选择 **Apply variable** → 选择对应的 Variable

### Step 4：Dev Mode 导出（需付费版）

> **注意：** 完整的 Dev Mode（包括 Variable Token 检查、代码导出、MCP Server）需要 **Professional 及以上计划**。免费 Starter 版仅有基础检视功能。

1. 切换到 Dev Mode（`Shift+D`）
2. 点击 Variables 标签查看 CSS 变量输出
3. 或通过 Figma MCP Server 直接对接开发工具链

---

## 三、已有组件的 Token 替换方式

### 替换原则

根据项目现有的 `docs/token-usage-guide.md` 规范，替换分为四个层级：

### 层级 1：Tailwind 类名替换

将硬编码的 Tailwind 任意值替换为 token 类名：

```tsx
// ❌ 替换前：硬编码 hex 值
<View className="bg-[#F4F1EC] border border-[#E0DAD2]">
  <Text className="text-[#2E2822]">标题</Text>
</View>

// ✅ 替换后：使用 Tailwind config 中定义的 token
<View className="bg-analysis-card-muted-bg border border-analysis-card-muted-border">
  <Text className="text-analysis-text-primary">标题</Text>
</View>
```

### 层级 2：模块 Token 变量替换

对于 Tailwind 无法覆盖的场景（如内联 style、ECharts 配置），使用 `analysisTokens.ts` 中的常量：

```tsx
// ❌ 替换前
<View style={{ backgroundColor: '#D9E7CE' }}>
  <Text style={{ color: '#5B7358' }}>激活</Text>
</View>

// ✅ 替换后
import { analysisColors } from './analysisTokens'

<View style={{ backgroundColor: analysisColors.activeBg }}>
  <Text style={{ color: analysisColors.activeText }}>激活</Text>
</View>
```

### 层级 3：预组合类名替换

利用 `analysisTokens.ts` 中的 `analysisClasses` 快速替换：

```tsx
// ❌ 替换前：重复的类名组合
<View className="bg-white border border-[#E4DFD9] shadow-[0_4px_30px_rgba(0,0,0,0.04)]">

// ✅ 替换后：预组合 token
import { analysisClasses } from './analysisTokens'
<View className={analysisClasses.card}>
```

### 层级 4：全局样式替换

在 `app.scss` 中使用 `theme()` 函数引用 Tailwind token：

```scss
// ✅ 当前已有写法
page {
  background-color: theme('colors.surface');
  color: theme('colors.on-surface');
}
```

### 替换操作清单

按优先级排序：

1. **搜索所有硬编码 hex 值**：搜索 `bg-[#`、`text-[#`、`border-[#`、`style={{ color: '#`
2. **逐模块替换**：从 analysis 模块开始（已有完整的 `analysisTokens.ts`）
3. **扩展到其他模块**：为每个新模块创建对应的 `xxxTokens.ts` 文件
4. **图表配置替换**：参照 `analysisChartOptions.ts` 的方式，用 token 常量替换硬编码颜色
5. **Figma 同步**：确保 Figma 中的 Variables 与 `tailwind.config.js` + `analysisTokens.ts` 保持同步

---

## 四、Figma → 代码同步流程

```
Figma Variables (Design Source)
       │
       ├── tailwind.config.js     ← 全局 Token（颜色/字体/间距/圆角/阴影）
       ├── analysisTokens.ts      ← 模块语义 Token
       └── app.scss               ← 全局样式（通过 theme() 引用）
              │
              ▼
        组件层引用
        ├── className="bg-analysis-card-muted-bg"  (Tailwind 类)
        ├── style={{ color: analysisColors.textPrimary }}  (内联)
        └── analysisClasses.card  (预组合)
```

---

## 五、Figma Dev Mode 与免费版限制

### 当前 Figma 定价体系（2026 年）

| 计划 | 价格 | Dev Mode | 文件限制 |
|------|------|----------|---------|
| Starter（免费） | $0 | 基础检视仅 | 3 个文件 |
| Professional | $12-16/月 | 完整 Dev Mode + MCP Server | 无限 |
| Organization | $25-55/月 | 完整 Dev Mode + 高级管理 | 无限 |
| Enterprise | $35-90/月 | 完整 Dev Mode + 安全控制 | 无限 |

### 免费版（Starter）能做什么

- 基础检视：查看 CSS 属性、尺寸、颜色值
- Variables 创建和编辑：可以在 Figma 中创建和使用 Variables
- 设计编辑：完整的 Figma 编辑器功能

### 免费版（Starter）不能做什么

- **Variable Token 检查**：Dev Mode 中的 Variable Token 显示需要付费版
- **代码片段导出**：Dev Mode 的代码生成功能需要付费版
- **MCP Server**：Figma 官方 MCP Server 需要 Professional 及以上
- **Annotations**：Dev Mode 中的标注功能需要付费版

### 免费版的替代方案

1. **手动映射**（当前项目方式）：从 Figma 检视面板手动复制颜色值，在 Token 文件中按语义分类
2. **第三方插件**：安装 Figma Community 中的 Design Tokens 插件（如 Tokens Studio），可导出 JSON 格式的 Token 定义
3. **Figma REST API**：通过 Figma API 的 `/v1/files/:file_key/variables/local` 端点获取 Variables 数据（需 Personal Access Token）

---

## 六、Figma MCP Bridge 的 Token 读取能力分析

### 当前 MCP Figma AI Bridge 工具能力

项目已配置了 `mcp_Figma_AI_Bridge` 服务，提供两个工具：

| 工具 | 功能 | 能否读取 Token |
|------|------|---------------|
| `get_figma_data` | 获取 Figma 文件的节点树数据（布局、内容、视觉、组件信息） | 部分 |
| `download_figma_images` | 下载 SVG/PNG 图片 | 不涉及 |

### `get_figma_data` 对 Token 的支持情况

**能获取到的信息：**
- 节点的 `fills`、`strokes` 中的 **原始颜色值**（如 `#2E2822`）
- 节点是否使用了 **boundVariables**（变量绑定引用，包含 variable ID）
- 字体大小、行高、字重等排版信息
- 圆角、间距、阴影等样式属性

**无法直接获取的信息：**
- Figma Variables 的 **完整定义**（名称、值、模式等）——这需要调用 Figma API 的 `/variables/local` 端点，当前 MCP Bridge 未暴露此能力
- 变量的语义化命名（如 `analysis/text-primary`）

### 两种 Token 应用方案

#### 方案 A：通过 Figma Variables 读取 Token（理想方案）

**前提条件：** Figma 设计稿中已创建 Variables 并绑定到图层

**流程：**
1. 智能体调用 `get_figma_data` 获取节点数据
2. 节点数据中的 `boundVariables` 字段会标记哪些属性使用了变量
3. 结合项目 Token 映射表，将变量引用转换为代码中的 Token 引用
4. 生成使用 `analysisColors.textPrimary` 等 Token 的代码

**限制：** 当前 MCP Bridge 无法直接获取 Variables 的名称和值，只能获取 variable ID。需要额外维护一份「Variable ID → Token Name」的映射表。

#### 方案 B：通过颜色值映射 Token（当前可行方案）

**前提条件：** 维护一份「Hex 值 → Token 名称」的映射表

**流程：**
1. 智能体调用 `get_figma_data` 获取节点数据
2. 从 `fills`、`strokes` 中提取原始颜色值（如 `#2E2822`）
3. 在映射表中查找对应的 Token 名称（如 `analysisColors.textPrimary`）
4. 生成使用 Token 引用的代码

**优势：** 不依赖 Figma Variables 功能，免费版即可使用
**劣势：** 需要手动维护映射表，新增颜色时需同步更新

### 推荐的 Token 映射表

```typescript
// figma-token-mapping.ts
// Figma 颜色值 → 项目 Token 名称的映射表
export const figmaColorToToken: Record<string, string> = {
  // 全局颜色
  '#5F5F59': 'primary',
  '#FFFFFF': 'on-primary',
  '#FFFDF5': 'primary-container',
  '#765842': 'secondary',
  '#FED5B9': 'secondary-container',
  '#406651': 'tertiary',
  '#FFF8F1': 'surface',
  '#1E1B17': 'on-surface',
  '#474741': 'on-surface-variant',
  '#F4EDE5': 'surface-container',
  '#EEE7DF': 'surface-container-high',
  '#BA1A1A': 'error',
  '#777770': 'outline',
  '#C8C7BE': 'outline-variant',

  // 分析模块颜色
  '#2E2822': 'analysis.text-primary',
  '#6F6760': 'analysis.text-secondary',
  '#8C857D': 'analysis.text-tertiary',
  '#9B958E': 'analysis.text-muted',
  '#835332': 'analysis.title-accent',
  '#D9E7CE': 'analysis.active-bg',
  '#5B7358': 'analysis.active-text',
  '#EFEEEB': 'analysis.inactive-bg',
  '#7A766F': 'analysis.inactive-text',
  '#E4DFD9': 'analysis.card-border',
  '#E0DAD2': 'analysis.card-muted-border',
  '#F4F1EC': 'analysis.card-muted-bg',
  '#C97D55': 'analysis.highlight-orange',
  '#88A48A': 'analysis.highlight-olive',
  '#97A8AF': 'analysis.sleep-night',
  '#D2C9BC': 'analysis.sleep-nap',
  '#E7E8E6': 'analysis.sleep-awake',
}
```

---

## 七、作为 Skill 的可行性分析

### Skill 定义建议

可以将 Token 设计规范封装为 Skill，在智能体进行 Figma 还原时自动应用 Token 映射规则。

**Skill 名称：** `figma-token-mapping`

**触发条件：**
- 用户要求从 Figma 生成页面代码
- 用户提到 "Figma 还原"、"设计稿转代码"、"Figma to code"

**Skill 内容应包含：**
1. 完整的 Token 映射表（Hex → Token Name）
2. Token 引用规则（何时用 Tailwind 类、何时用 Token 变量、何时用预组合类）
3. `get_figma_data` 的调用方式和数据解析规则
4. 代码生成时的 Token 替换逻辑

**两种工作模式：**

| 模式 | 描述 | 依赖 |
|------|------|------|
| 模式 A：读取 Figma Variables | 调用 `get_figma_data`，解析 `boundVariables`，匹配 Token | Figma 设计稿中已创建 Variables |
| 模式 B：颜色值映射 | 调用 `get_figma_data`，从 fills/strokes 提取 Hex，查映射表 | 维护 Hex → Token 映射表 |

### 当前推荐：模式 B

由于以下原因，当前推荐使用模式 B（颜色值映射）：

1. **免费版限制**：Starter 版本的 Dev Mode 不支持完整的 Variable Token 检查
2. **MCP Bridge 限制**：当前 `get_figma_data` 无法直接获取 Variables 定义，只能获取节点上的原始颜色值
3. **立即可用**：不需要 Figma 设计稿中有 Variables，直接从颜色值映射即可
4. **可靠性高**：颜色值是确定性的，不依赖 Figma Variables 的创建质量

### 未来升级路径

当升级到 Figma Professional 后：
1. 可以在 Figma 中创建完整的 Variables 体系
2. 通过 Figma MCP Server（官方版）直接读取 Variables 定义
3. Skill 可切换到模式 A，实现更精准的 Token 匹配
