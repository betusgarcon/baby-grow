# Figma to Code 导出注意事项

## 问题

从 Figma 设计稿导出 Taro 小程序代码时，常遇到以下问题：
- 页面尺寸在微信开发者工具中显示异常（过小或过大）
- 布局元素错位、重叠
- 颜色、圆角等样式与设计稿不一致
- 组件拆分粒度过粗或过细

## 原因

### 1. Taro pxtransform 转换机制未理解

Taro 的 `postcss-pxtransform` 会将 `px` 自动转换为 `rpx`：
- 转换公式：`rpx = px × 750 / designWidth`
- 当前项目配置：`designWidth: 390`
- 所以：`1px → 750/390 ≈ 1.923rpx`

**问题：** 当 Tailwind 使用任意值语法 `w-[168px]` 时，生成的 CSS 可能未被正确转换。

### 2. Figma 设计稿的基准宽度

- 设计稿基准：390px（Mobile）
- 微信小程序基准：750rpx
- 需要确认 `designWidth` 与设计稿一致

### 3. 绝对定位元素处理

Figma 中常用绝对定位（Position: Absolute），但小程序中需谨慎使用：
- 绝对定位元素脱离文档流
- 可能遮挡其他元素
- 在不同屏幕尺寸下表现不一致

## 解决方案

### 1. 优先使用 Tailwind 内置类

```tsx
// ❌ 不推荐：任意值语法（可能未被 pxtransform 处理）
<View className="w-[168px] h-[168px] p-[24px] rounded-[32px]">

// ✅ 推荐：Tailwind 内置类
// w-44 = 176px (接近 168px)
// p-6 = 24px
// rounded-[32px] 非标准值，可保留任意值
<View className="w-44 h-44 p-6 rounded-[32px]">
```

**Tailwind 尺寸映射表：**

| 语义 | 类名 | 值 (px) | 用途 |
|------|------|---------|------|
| xs | text-xs | 12px | 辅助文字 |
| sm | text-sm | 14px | 次级文字 |
| base | text-base | 16px | 正文 |
| lg | text-lg | 18px | 小标题 |
| xl | text-xl | 20px | 标题 |
| 2xl | text-2xl | 24px | 大标题 |
| 3xl | text-3xl | 30px | 超大标题 |

| 间距 | 类名 | 值 (px) | 用途 |
|------|------|---------|------|
| 1 | p-1 | 4px | 紧凑间距 |
| 2 | p-2 | 8px | 小间距 |
| 3 | p-3 | 12px | 基础间距 |
| 4 | p-4 | 16px | 标准间距 |
| 5 | p-5 | 20px | 较大间距 |
| 6 | p-6 | 24px | 大间距 |
| 8 | p-8 | 32px | 特大间距 |

### 2. 颜色必须使用任意值语法

```tsx
// ❌ 不推荐：使用 Tailwind 默认色板
<View className="bg-green-100">  // 可能与设计稿颜色不匹配

// ✅ 推荐：使用精确颜色值
<View className="bg-[#C1EDD1]">  // 匹配设计稿
```

### 3. 绝对定位处理策略

```tsx
// ❌ 不推荐：大量绝对定位
<View className="absolute left-[20px] top-[40px] w-[100px]">

// ✅ 推荐：使用 Flex 布局 + 相对定位
<View className="flex flex-col items-center relative">
  <View className="absolute -right-2 -bottom-2 w-8 h-8 rounded-full">
  </View>
  <Image src={avatar} className="w-40 h-40 rounded-full" />
</View>
```

### 4. 组件拆分原则

```
// 页面结构建议
Page/
├── Header (固定导航栏)
├── MainContent (可滚动内容)
│   ├── Section1 (区块1)
│   │   ├── Card1
│   │   └── Card2
│   └── Section2 (区块2)
└── Footer (底部按钮/提示)

// 组件粒度
- 一个卡片 = 一个组件（如果样式复用）
- 一组相关元素 = 一个 Section 组件
- 不要把整个页面都写成一个组件
```

## 常见布局问题与修复

### 问题 1：尺寸显示异常

**症状：** 页面元素在微信开发者工具中看起来过小或过大

**原因：**
1. `designWidth` 与设计稿基准宽度不匹配
2. Tailwind 任意值未被 pxtransform 处理
3. 使用了不兼容的单位（如 `rem`、`em`）

**修复：**
```typescript
// config/index.ts
export default defineConfig({
  designWidth: 390,  // 确保与 Figma 设计稿一致
  deviceRatio: {
    390: 1,         // 390px 设计稿 = 390rpx
    750: 750/390,   // 750rpx 屏幕的比率
  },
})
```

### 问题 2：元素重叠

**症状：** 两个元素显示在同一位置

**原因：**
1. 父容器未设置 `relative`，子元素 `absolute` 定位参考了错误的元素
2. 绝对定位元素的 `z-index` 未正确设置
3. 布局元素的 `padding`/`margin` 不足

**修复：**
```tsx
// 确保父容器有 relative
<View className="relative w-40 h-40">
  <View className="absolute -bottom-2 -right-2 z-10 w-8 h-8">
  </View>
  <Image src={avatar} className="w-full h-full rounded-full" />
</View>
```

### 问题 3：底部内容被遮挡

**症状：** 页面底部内容被 TabBar 或安全区域遮挡

**原因：**
1. 内容区域的 `padding-bottom` 不足
2. 未考虑 iPhone 安全区域（底部 Home Indicator）

**修复：**
```tsx
// 计算需要的底部间距
// TabBar 高度 64px + 安全区域 ~34px + 缓冲
const bottomPadding = 28 // 28 × 4 = 112px

<View className={`min-h-screen pb-${bottomPadding}`}>
  {/* 内容 */}
</View>
```

### 问题 4：边框样式异常

**症状：** 圆角或边框颜色与设计稿不一致

**原因：**
1. Tailwind 内置类的圆角值与设计稿不匹配
2. 边框颜色使用了近似值

**修复：**
```tsx
// 设计稿要求 32px 圆角
// rounded-3xl = 24px（不够）
// rounded-[32px] 使用任意值

<View className="rounded-[32px] border border-[#C8C7BE]">
</View>
```

## 代码示例

### 示例 1：Figma 转 Taro 完整流程

```tsx
// Figma 设计稿中的一个卡片组件
// 设计规范：
// - 背景色：#FFFDF5
// - 边框：1px solid #C8C7BE
// - 圆角：32px
// - 内边距：24px
// - 标题字号：16px
// - 描述字号：16px

// ❌ 初级写法
<View
  style={{
    backgroundColor: '#FFFDF5',
    border: '1px solid #C8C7BE',
    borderRadius: 32,
    padding: 24,
  }}
>
  <Text style={{ fontSize: 16, color: '#1E1B17' }}>Title</Text>
  <Text style={{ fontSize: 16, color: '#474741' }}>Description</Text>
</View>

// ✅ 推荐写法
import { analysisColors, analysisRadii } from '../tokens'

<View
  className={`p-6 ${analysisRadii.card}`}
  style={{
    backgroundColor: '#FFFDF5',
    border: '1px solid #C8C7BE',
  }}
>
  <Text className="text-base" style={{ color: analysisColors.textPrimary }}>
    Title
  </Text>
  <Text className="text-base" style={{ color: analysisColors.textSecondary }}>
    Description
  </Text>
</View>
```

### 示例 2：处理 Figma 的 Auto Layout

```tsx
// Figma Auto Layout: row, gap: 16px, padding: 24px
// 转换为 Tailwind

// ❌ 不推荐
<View style={{ display: 'flex', flexDirection: 'row', gap: 16, padding: 24 }}>

// ✅ 推荐
<View className="flex flex-row gap-4 p-6">
  {/* 子元素 */}
</View>
```

## 检查清单

- [ ] 是否确认了 `designWidth` 与 Figma 设计稿一致？
- [ ] 是否优先使用 Tailwind 内置类，而非任意值语法？
- [ ] 颜色是否使用精确的 hex 值，而非 Tailwind 默认色板？
- [ ] 绝对定位元素是否设置了 `relative` 父容器？
- [ ] 底部内容是否预留了足够的间距（TabBar + 安全区域）？
- [ ] 组件是否按合理粒度拆分？
- [ ] 是否避免了内联 `style`，改用 Token 变量？
