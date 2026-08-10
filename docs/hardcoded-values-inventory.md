# 硬编码值清理清单

> 扫描时间：2026-08-07
> 扫描范围：`src/` 目录下所有 `.tsx` 文件
> 目标：识别并移除硬编码的颜色、字号、圆角等值，统一使用 Design Token

---

## 一、颜色硬编码清单

### 1.1 背景色 (bg-*[])

| 文件位置 | 原始值 | 建议修改值 | 说明 |
|---------|--------|-----------|------|
| `figma_demo/pages/change-photo/index.tsx:14` | `bg-[#FFF8F1]` | `bg-baby-bg` | 页面背景色，建议加到项目色板 |
| `figma_demo/pages/home/index.tsx:42` | `bg-[#FFF8F1]` | `bg-baby-bg` | 同上，重复使用 |
| `figma_demo/pages/change-photo/index.tsx:111,131` | `bg-[#FFFDF5]` | `bg-baby-card` | 卡片背景色 |
| `figma_demo/pages/change-photo/index.tsx:117` | `bg-[#FFDCC4]` | `bg-baby-warning` | 拍照按钮背景 |
| `figma_demo/pages/change-photo/index.tsx:137` | `bg-[#C1EDD1]` | `bg-baby-success` | 相册按钮背景 |
| `figma_demo/pages/change-photo/index.tsx:167` | `bg-[#FAF2EA]` | `bg-baby-bg-dark` | 取消按钮背景 |
| `figma_demo/pages/home/index.tsx:90` | `bg-[#5F5F59]` | `bg-baby-brown` | 编辑按钮背景 |
| `figma_demo/pages/home/index.tsx:101` | `bg-[#FED5B9]` | `bg-baby-orange` | 徽章背景 |
| `figma_demo/pages/home/index.tsx:157` | `bg-[#FAF2EA]` | `bg-baby-bg-dark` | 偏好卡片背景 |
| `figma_demo/pages/home/index.tsx:160` | `bg-[#E8E1D9]` | `bg-baby-border-light` | 图标容器背景 |
| `components/BottomTabBar/BottomTabBar.tsx:59` | `bg-[#406651]` | `bg-baby-primary` | TabBar 中间按钮 |
| `pages/analysis/components/AnalysisCards.tsx:293` | `bg-[#f4f1ec]` | `bg-baby-muted` | 卡片区背景 |
| `pages/analysis/components/AnalysisCards.tsx:401` | `bg-[#f7f3ee]` | `bg-baby-chart-surface` | 图表区背景 |
| `pages/analysis/components/AnalysisCards.tsx:416` | `bg-[#f4f1ec]` | `bg-baby-muted` | 分析卡片背景 |
| `pages/analysis/components/AnalysisCards.tsx:1050` | `bg-[#f4f1ec]` | `bg-baby-muted` | 输入框背景 |

### 1.2 文字色 (text-*[])

| 文件位置 | 原始值 | 建议修改值 | 说明 |
|---------|--------|-----------|------|
| `figma_demo/pages/change-photo/index.tsx:50` | `text-[#5F5F59]` | `text-baby-text-tertiary` | 标题文字 |
| `figma_demo/pages/change-photo/index.tsx:99,102` | `text-[#1E1B17]` / `text-[#474741]` | `text-baby-text-primary` / `text-baby-text-secondary` | 主/次级文字 |
| `figma_demo/pages/change-photo/index.tsx:122,123` | `text-[#1E1B17]` / `text-[#474741]` | 同上 | 按钮文字 |
| `figma_demo/pages/change-photo/index.tsx:157` | `text-[#BA1A1A]` | `text-baby-danger` | 删除文字 |
| `figma_demo/pages/home/index.tsx:58` | `text-[#5F5F59]` | `text-baby-text-tertiary` | 导航标题 |
| `figma_demo/pages/home/index.tsx:100` | `text-[#1E1B17]` | `text-baby-text-primary` | 名字文字 |
| `figma_demo/pages/home/index.tsx:103` | `text-[#5C412C]` | `text-baby-badge` | 徽章文字 |
| `figma_demo/pages/home/index.tsx:135,136` | `text-[#474741]` / `text-[#1E1B17]` | `text-baby-text-secondary` / `text-baby-text-primary` | 标签/数值文字 |
| `pages/analysis/components/AnalysisCards.tsx:92` | `text-[#92613a]` | `text-analysis-title-accent` | 指标标签 |
| `pages/analysis/components/AnalysisCards.tsx:94` | `text-[#8b5a2b]` | `text-analysis-value` | 指标数值 |
| `pages/analysis/components/AnalysisCards.tsx:95` | `text-[#8b8a86]` | `text-analysis-unit` | 单位文字 |
| `pages/analysis/components/AnalysisCards.tsx:164` | `text-[#8c857d]` | `text-analysis-tertiary` | 日期标签 |
| `pages/analysis/components/AnalysisCards.tsx:207,211` | `text-[#8C827A]` | `text-analysis-muted` | 表格标签 |
| `pages/analysis/components/AnalysisCards.tsx:208,212` | `text-[#2E2822]` | `text-analysis-primary` | 表格数值 |
| `pages/analysis/components/AnalysisCards.tsx:242,243` | `text-[#6f6760]` / `text-[#2e2822]` | `text-analysis-secondary` / `text-analysis-primary` | 进度文字 |
| `pages/analysis/components/AnalysisCards.tsx:398` | `text-[#d57c69]` | `text-analysis-highlight` | 标准标签 |

### 1.3 边框色 (border-*[])

| 文件位置 | 原始值 | 建议修改值 | 说明 |
|---------|--------|-----------|------|
| `figma_demo/pages/change-photo/index.tsx:112,132` | `border: 1px solid #C8C7BE` | `border-baby-border` | 卡片边框 |
| `figma_demo/pages/change-photo/index.tsx:168` | `border: 1px solid rgba(200, 199, 190, 0.3)` | `border-baby-border-soft` | 按钮边框 |
| `figma_demo/pages/change-photo/index.tsx:75` | `border: 2px dashed #E8E1D9` | `border-baby-border-dashed` | 虚线边框 |
| `pages/analysis/components/AnalysisCards.tsx:293` | `border border-[#e1dad2]` | `border-analysis-muted` | 卡片边框 |
| `pages/analysis/components/AnalysisCards.tsx:331` | `border border-[#ddd7cf]` | `border-analysis-chart` | 图表边框 |
| `pages/analysis/components/AnalysisCards.tsx:401` | `border border-[#ece4db]` | `border-analysis-grid` | 图表背景边框 |
| `pages/analysis/components/AnalysisCards.tsx:615` | `border-2 border-dashed border-[#d8ddd8]` | `border-analysis-success-dashed` | 添加按钮边框 |
| `pages/analysis/components/AnalysisCards.tsx:617` | `border border-[#7e959f]` | `border-analysis-ring` | 图标容器边框 |

---

## 二、字号硬编码清单

### 2.1 非标准字号

| 文件位置 | 原始值 | 建议修改值 | 说明 |
|---------|--------|-----------|------|
| `figma_demo/pages/change-photo/index.tsx:99,102` | `text-base` + `leading-6` | 保持（已使用内置类） | 16px 字号 |
| `pages/analysis/components/AnalysisCards.tsx:207,211` | `text-sm` | 保持 | 14px |
| `pages/analysis/components/AnalysisCards.tsx:243` | `text-base` | 保持 | 16px |
| `pages/analysis/components/AnalysisCards.tsx:253,255` | `text-sm` | 保持 | 14px |

### 2.2 需要添加的字号 Token

| 字号 | 用途 | 建议类名 |
|------|------|---------|
| 13px | 图表标签 | `text-[13px]` 或 `text-sm/2` |
| 28px | 大数值显示 | `text-[28px]` 或 `text-3xl` |
| 36px | 超大标题 | `text-[36px]` 或 `text-4xl` |

---

## 三、圆角硬编码清单

### 3.1 圆角值统计

| 圆角值 | 使用次数 | 建议 Token 名 |
|--------|---------|--------------|
| `rounded-[16px]` | 2 次 | `radii.sm` |
| `rounded-[20px]` | 4 次 | `radii.md` |
| `rounded-[24px]` | 8 次 | `radii.lg` |
| `rounded-[28px]` | 6 次 | `radii.xl` |
| `rounded-[32px]` | 15+ 次 | `radii.card` |
| `rounded-full` | 10+ 次 | `radii.pill` |

### 3.2 建议统一的圆角映射

```typescript
// src/styles/radii.ts
export const radii = {
  sm: 'rounded-[16px]',      // 小元素、徽章
  md: 'rounded-[20px]',      // 中等元素
  lg: 'rounded-[24px]',      // 小型卡片、输入框
  xl: 'rounded-[28px]',      // 标准卡片
  card: 'rounded-[32px]',    // 大型卡片
  full: 'rounded-full',      // 圆形元素
} as const
```

---

## 四、间距硬编码清单

### 4.1 任意值间距

| 文件位置 | 原始值 | 建议修改值 | 说明 |
|---------|--------|-----------|------|
| `figma_demo/pages/home/index.tsx:53,60` | `p-[10px]` | `p-2.5` (10px) | 按钮内边距 |
| `figma_demo/pages/home/index.tsx:94` | `w-[15px] h-[15px]` | `w-4 h-4` (16px) 或保留 | 编辑图标尺寸 |
| `figma_demo/pages/home/index.tsx:102` | `w-[13px] h-[13px]` | `w-3 h-3` (12px) 或保留 | 徽章图标尺寸 |
| `figma_demo/pages/home/index.tsx:115` | `h-[82px]` | `h-[82px]` (保留) | 卡片高度，非标准值 |
| `figma_demo/pages/change-photo/index.tsx:14` | `min-h-screen` | 保持 | 全屏高度 |

### 4.2 建议添加的间距 Token

```typescript
// src/styles/spacing.ts
export const spacing = {
  // 标准间距使用 Tailwind 内置类
  // 特殊间距使用任意值
  badge: 'w-3 h-3',              // 12px
  iconSm: 'w-4 h-4',             // 16px
  iconMd: 'w-5 h-5',             // 20px
  iconLg: 'w-6 h-6',             // 24px
  cardH: 'h-[82px]',             // 卡片高度（非标准）
} as const
```

---

## 五、内联 style 硬编码清单

### 5.1 建议迁移到 Token 的样式

| 文件位置 | 原始代码 | 建议修改 |
|---------|---------|---------|
| `figma_demo/pages/change-photo/index.tsx:75` | `style={{ boxShadow: '0 8px 10px -6px rgba(0,0,0,0.1), ...' }}` | `className="shadow-avatar"` |
| `figma_demo/pages/change-photo/index.tsx:112` | `style={{ border: '1px solid #C8C7BE' }}` | `className="border-baby-border"` |
| `figma_demo/pages/home/index.tsx:84` | `style={{ boxShadow: '0 20px 40px -10px rgba(118,88,66,0.08)' }}` | `className="shadow-avatar-lg"` |
| `figma_demo/pages/home/index.tsx:91` | `style={{ boxShadow: '0 4px 6px -4px rgba(0,0,0,0.1), ...' }}` | `className="shadow-edit-btn"` |
| `figma_demo/pages/home/index.tsx:125` | `style={{ backgroundColor: metric.iconBgColor \|\| '#F7FFF7' }}` | `style={{ backgroundColor: metric.iconBgColor \|\| colors.iconDefault }}` |
| `pages/analysis/components/AnalysisCards.tsx:204` | `style={{ backgroundColor: '#F3F5EE' }}` | `style={{ backgroundColor: analysisColors.chartSurface }}` |
| `pages/analysis/components/AnalysisCards.tsx:1031` | `style={{ backgroundColor: isActive ? 'rgba(255,255,255,0.8)' : '#ece8e2' }}` | `style={{ backgroundColor: isActive ? colors.glass : colors.inactiveBg }}` |
| `components/charts/AnalysisChart.tsx:417` | `style={{ color: '#9A7A61' }}` | `style={{ color: analysisColors.highlightBrown }}` |
| `components/charts/AnalysisChart.tsx:425` | `style={{ color: analysisColors.textTertiary }}` | 保持（已使用 Token） |

---

## 六、建议的 Token 扩展

### 6.1 颜色 Token 补充

```typescript
// 在 analysisColors 中添加
export const analysisColors = {
  // 新增：专用色
  highlightBrown: '#9A7A61',      // 图表棕色高亮
  iconDefault: '#F7FFF7',        // 图标默认背景
  glassBg: 'rgba(255, 255, 255, 0.8)', // 毛玻璃背景
  
  // 已有：避免重复定义
  // textPrimary: '#2E2822',     // 保留
  // textSecondary: '#6F6760',  // 保留
  // cardMutedBg: '#F4F1EC',    // 保留
  // chartSurface: '#F7F4EF',   // 保留
} as const
```

### 6.2 项目通用 Token

```typescript
// src/styles/tokens.ts
export const projectColors = {
  // 页面背景
  pageBg: '#FFF8F1',
  pageBgDark: '#FAF2EA',
  
  // 品牌色
  primary: '#406651',
  orange: '#FED5B9',
  brown: '#5F5F59',
  
  // 功能色
  success: '#C1EDD1',
  warning: '#FFDCC4',
  danger: '#BA1A1A',
  
  // 卡片
  cardBg: '#FFFDF5',
  cardBgMuted: '#F4F1EC',
  
  // 边框
  border: '#C8C7BE',
  borderLight: '#E8E1D9',
  borderSoft: 'rgba(200, 199, 190, 0.3)',
  
  // 文字
  textPrimary: '#1E1B17',
  textSecondary: '#474741',
  textTertiary: '#5F5F59',
  textMuted: '#8C857D',
} as const
```

---

## 七、清理优先级建议

| 优先级 | 类别 | 影响范围 | 建议完成时间 |
|--------|------|---------|------------|
| P0 | 颜色 Token 化 | 全项目 | 立即 |
| P0 | 圆角 Token 化 | 全项目 | 立即 |
| P1 | 移除内联 style | 全项目 | 本周 |
| P1 | 扩展 Tailwind 色板 | 全项目 | 本周 |
| P2 | 间距 Token 化 | 全项目 | 下周 |
| P2 | 阴影 Token 化 | 全项目 | 下周 |

---

## 检查清单

- [ ] 是否所有颜色都通过 Token 引用？
- [ ] 是否消除了重复颜色定义？
- [ ] 圆角是否统一使用 Token？
- [ ] 间距是否使用 Tailwind 内置类？
- [ ] 内联 style 是否都已迁移？
- [ ] Tailwind 配置是否扩展了项目色板？
- [ ] 文档中的 Token 是否已在代码中实现？
