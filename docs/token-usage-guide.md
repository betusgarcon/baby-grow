# Design Token 使用规范

## 问题

在 Taro + Tailwind 项目中，颜色、字号、圆角等值散落在各个组件中，导致：
- 修改主题时需要全局搜索替换，容易遗漏
- 同一语义的颜色可能有多个 hex 值变体（如 `#2E2822` 与 `#1E1B17`）
- 代码可读性差，难以快速理解颜色的语义用途
- Figma 设计稿导出时的颜色与代码中的颜色不一致

## 原因

1. **缺乏统一的 Token 文件**：每个组件独立定义颜色，没有集中管理
2. **Tailwind 任意值语法的便利性**：`bg-[#2E2822]` 写法快速但容易滥用
3. **Figma 导出规范不明确**：从 Figma 复制颜色时没有经过 Token 层的抽象

## 解决方案

### 1. 创建 Token 文件

在 `src/pages/analysis/components/analysisTokens.ts` 中集中管理：

```typescript
// 颜色 Token：按语义分组
export const analysisColors = {
  // 主色调
  titleAccent: '#835332',      // 标题强调色（棕色）
  activeBg: '#D9E7CE',         // 激活态背景（浅绿色）
  activeText: '#5B7358',       // 激活态文字（深绿色）
  
  // 中性色
  inactiveBg: '#EFEEEB',       // 未激活背景
  inactiveText: '#7A766F',     // 未激活文字
  cardBorder: '#E4DFD9',       // 卡片边框
  cardMutedBorder: '#E0DAD2',  // 弱化边框
  cardMutedBg: '#F4F1EC',      // 弱化背景
  
  // 文字层级
  textPrimary: '#2E2822',      // 主文字
  textSecondary: '#6F6760',    // 次级文字
  textTertiary: '#8C857D',     // 辅助文字
  textMuted: '#9B958E',        // 弱化文字
  
  // 图表专用
  highlightOrange: '#C97D55',  // 橙色高亮
  highlightOlive: '#88A48A',   // 橄榄色
  sleepNight: '#97A8AF',       // 夜间睡眠
  sleepNap: '#D2C9BC',         // 小睡
  sleepAwake: '#E7E8E6',       // 清醒
} as const

// 圆角 Token
export const analysisRadii = {
  xl: 'rounded-[24px]',
  xxl: 'rounded-[28px]',
  card: 'rounded-[32px]',
  pill: 'rounded-full',
} as const
```

### 2. 组件中使用 Token

```tsx
// ✅ 正确：使用 Token
<View className="w-full p-4 bg-[#F4F1EC] rounded-[32px]">
  <Text className="text-base text-[#2E2822]">{title}</Text>
</View>

// ✅ 推荐：使用 Token 变量
import { analysisColors, analysisRadii } from './analysisTokens'

<View className={`w-full p-4 ${analysisRadii.card}`} 
      style={{ backgroundColor: analysisColors.cardMutedBg }}>
  <Text className="text-base" style={{ color: analysisColors.textPrimary }}>
    {title}
  </Text>
</View>
```

### 3. 全局通用 Token 建议

对于整个项目，建议创建 `src/styles/tokens.ts`：

```typescript
export const colors = {
  // 页面背景
  pageBg: '#FFF8F1',
  pageBgDark: '#FAF2EA',
  
  // 品牌色
  brandGreen: '#406651',
  brandOrange: '#FED5B9',
  brandBrown: '#5F5F59',
  
  // 功能色
  success: '#C1EDD1',
  warning: '#FFDCC4',
  danger: '#BA1A1A',
  
  // 边框色
  border: '#C8C7BE',
  borderLight: '#E8E1D9',
  borderSoft: 'rgba(200, 199, 190, 0.3)',
  
  // 卡片
  cardBg: '#FFFDF5',
  cardBgAlt: '#FAF2EA',
  
  // 文字
  textPrimary: '#1E1B17',
  textSecondary: '#474741',
  textTertiary: '#5F5F59',
  textMuted: '#8C857D',
  textDisabled: '#BA1A1A',
} as const
```

## Figma 中如何创建和导出 Design Token

### Figma Variables 功能

1. **创建 Variables 集合**
   - 右侧面板 → Variables 标签 → 创建新集合
   - 命名：如 `Baby Growth Colors`

2. **定义颜色变量**
   - 添加变量：`text/primary` = `#1E1B17`
   - 添加变量：`text/secondary` = `#474741`
   - 添加变量：`bg/page` = `#FFF8F1`

3. **应用到设计稿**
   - 选中图层 → 属性面板 → Fill → 选择变量

### 导出 Token 到代码

1. **通过 Design Tokens 插件**
   - 安装 `Design Tokens` 插件
   - 导出为 JSON 格式
   - 转换为 TypeScript Token 文件

2. **手动映射（当前项目方式）**
   - 从 Figma Dev Mode 复制颜色值
   - 在 Token 文件中按语义分类
   - 组件中引用 Token 而非硬编码

## 代码示例

### 示例 1：颜色 Token 对比

```tsx
// ❌ 问题代码：散落的硬编码
function Card1() {
  return <View className="bg-[#F4F1EC]"><Text className="text-[#2E2822]">Text</Text></View>
}
function Card2() {
  return <View className="bg-[#F7F3EE]"><Text className="text-[#1E1B17]">Text</Text></View>
}

// ✅ 推荐代码：统一 Token
import { analysisColors } from './analysisTokens'

function Card1() {
  return <View style={{ backgroundColor: analysisColors.cardMutedBg }}>
    <Text style={{ color: analysisColors.textPrimary }}>Text</Text>
  </View>
}
function Card2() {
  return <View style={{ backgroundColor: analysisColors.chartSurface }}>
    <Text style={{ color: analysisColors.textPrimary }}>Text</Text>
  </View>
}
```

### 示例 2：圆角 Token 封装

```tsx
// Token 定义
export const radii = {
  sm: 'rounded-[16px]',
  md: 'rounded-[24px]',
  lg: 'rounded-[32px]',
  full: 'rounded-full',
}

// 组件使用
<View className={`${radii.lg} ${colors.cardBg} p-4`}>
  <Text>Card Content</Text>
</View>
```

## 检查清单

- [ ] 是否所有颜色都通过 Token 引用，而非硬编码？
- [ ] 同一语义的颜色是否只有一个 Token？
- [ ] Token 名称是否描述用途（如 `textPrimary`）而非色值（如 `colorBrown`）？
- [ ] Figma 设计稿的颜色是否与代码 Token 一致？
- [ ] 是否有颜色值重复定义但语义相同？
