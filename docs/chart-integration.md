# Chart 组件集成规范

## 问题

在 Taro 小程序中集成 ECharts 图表时，常遇到：
- 图表颜色与设计稿不一致
- 占位标记（占位符）处理不规范
- 响应式布局问题
- 图表交互在小程序中表现异常

## 原因

1. **图表配置与设计稿脱节**：直接在组件中硬编码颜色、尺寸，未使用 Token
2. **占位符处理不当**：图表加载时的 loading 状态、空数据状态未统一处理
3. **尺寸单位转换**：ECharts 配置中的像素值与小程序 rpx 单位不一致

## 解决方案

### 1. 创建图表配置模块

```typescript
// src/components/charts/analysisChartOptions.ts

import { analysisColors } from '../../pages/analysis/components/analysisTokens'

// 图表主题配置
export const chartTheme = {
  textColor: analysisColors.textPrimary,
  lineColor: analysisColors.chartGrid,
  tooltipBg: '#FFFDF5',
  tooltipBorder: analysisColors.cardBorder,
}

// 通用图表配置
export const commonChartOption = {
  backgroundColor: 'transparent',
  grid: {
    left: 40,
    right: 20,
    top: 30,
    bottom: 30,
    containLabel: true,
  },
  tooltip: {
    trigger: 'axis',
    backgroundColor: chartTheme.tooltipBg,
    borderColor: chartTheme.tooltipBorder,
    borderWidth: 1,
    textStyle: {
      color: analysisColors.textPrimary,
      fontSize: 12,
    },
  },
}
```

### 2. 图表配色映射

```typescript
// src/components/charts/chartColorMap.ts

// 图表专用配色映射表
export const chartColorMap = {
  // 生长曲线
  growth: {
    babyCurve: '#C97D55',      // 宝宝数据曲线（橙色）
    whoMedian: '#88A48A',      // WHO 中位数（橄榄色）
    areaFill: 'rgba(201, 125, 85, 0.1)',
  },
  
  // 饮食 Donut 图
  dietDonut: {
    protein: '#C1EDD1',
    carbs: '#FFDCC4',
    fat: '#FED5B9',
    fiber: '#D9E7CE',
  },
  
  // 睡眠环形图
  sleepRing: {
    night: '#97A8AF',
    nap: '#D2C9BC',
    awake: '#E7E8E6',
  },
  
  // 饮食柱状图
  dietBar: {
    bars: ['#97A8AF', '#D2C9BC', '#E7E8E6', '#D9E7CE', '#88A48A', '#C97D55', '#C1EDD1'],
  },
}
```

### 3. 占位标记规则

```typescript
// src/components/charts/AnalysisChart.tsx

// 状态类型定义
type ChartState = 'loading' | 'empty' | 'error' | 'ready'

// 占位组件
const ChartPlaceholder = ({ state, message }: { state: ChartState; message?: string }) => {
  const placeholders: Record<ChartState, { icon: string; text: string; color: string }> = {
    loading: { icon: '⌛', text: '加载中...', color: analysisColors.textTertiary },
    empty: { icon: '📊', text: message || '暂无数据', color: analysisColors.textSecondary },
    error: { icon: '⚠️', text: message || '加载失败', color: '#BA1A1A' },
    ready: { icon: '', text: '', color: '' },
  }
  
  const current = placeholders[state]
  
  return (
    <View className="flex flex-col items-center justify-center h-full">
      <Text className="text-2xl mb-2">{current.icon}</Text>
      <Text className="text-sm" style={{ color: current.color }}>
        {current.text}
      </Text>
    </View>
  )
}

// 图表组件主实现
const AnalysisChart = ({ option, height = 200, state = 'ready' }) => {
  if (state !== 'ready') {
    return <ChartPlaceholder state={state} />
  }
  
  return (
    <View style={{ width: '100%', height }}>
      {/* ECharts 渲染 */}
    </View>
  )
}
```

### 4. 响应式尺寸处理

```typescript
// 在小程序中，使用 px 值需要转换

// 方式 1：使用 rpx 单位
const chartHeight = '200rpx'  // 约 100px

// 方式 2：使用 Taro API 获取系统信息
import Taro from '@tarojs/taro'

const { windowWidth, windowHeight } = Taro.getSystemInfoSync()
const chartSize = Math.min(windowWidth - 32, 300)  // 减去 padding

// 方式 3：使用 CSS 相对单位
<View className="w-full aspect-square">
  <AnalysisChart option={option} />
</View>
```

## 代码示例

### 示例 1：创建生长曲线图

```typescript
// src/pages/analysis/growth/chartOptions.ts
import { chartColorMap, commonChartOption } from '../../../components/charts'
import { analysisColors } from '../../../components/analysisTokens'

export const createGrowthTrendOption = (points: Array<{ month: number; value: number }>) => {
  return {
    ...commonChartOption,
    series: [
      {
        name: 'Baby Height',
        type: 'line',
        data: points.map(p => p.value),
        smooth: true,
        lineStyle: {
          color: chartColorMap.growth.babyCurve,
          width: 3,
        },
        itemStyle: {
          color: chartColorMap.growth.babyCurve,
        },
        areaStyle: {
          color: chartColorMap.growth.areaFill,
        },
      },
      {
        name: 'WHO Median',
        type: 'line',
        data: points.map(() => 50),  // 示例数据
        smooth: true,
        lineStyle: {
          color: chartColorMap.growth.whoMedian,
          width: 2,
          type: 'dashed',
        },
        itemStyle: {
          color: chartColorMap.growth.whoMedian,
        },
      },
    ],
    xAxis: {
      type: 'category',
      data: points.map(p => `${p.month}M`),
      axisLine: { lineStyle: { color: analysisColors.chartGrid } },
      axisLabel: { color: analysisColors.textTertiary },
    },
    yAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: analysisColors.chartGrid } },
      axisLabel: { color: analysisColors.textTertiary },
      splitLine: { lineStyle: { color: analysisColors.chartGrid } },
    },
  }
}
```

### 示例 2：创建睡眠环形图

```typescript
// src/pages/analysis/sleep/chartOptions.ts
import { chartColorMap, commonChartOption } from '../../../components/charts'
import { analysisColors } from '../../../components/analysisTokens'

export const createSleepRingOption = (summary: { 
  night: number; 
  nap: number; 
  awake: number 
}) => {
  const total = summary.night + summary.nap + summary.awake
  
  return {
    ...commonChartOption,
    series: [
      {
        type: 'pie',
        radius: ['45%', '75%'],
        avoidLabelOverlap: false,
        label: { show: false },
        data: [
          { 
            value: summary.night, 
            name: 'Night',
            itemStyle: { color: chartColorMap.sleepRing.night }
          },
          { 
            value: summary.nap, 
            name: 'Nap',
            itemStyle: { color: chartColorMap.sleepRing.nap }
          },
          { 
            value: summary.awake, 
            name: 'Awake',
            itemStyle: { color: chartColorMap.sleepRing.awake }
          },
        ],
      },
    ],
  }
}
```

### 示例 3：图表卡片封装

```tsx
// 统一的图表卡片组件
const ChartCard = ({ 
  title, 
  badge, 
  children, 
  className 
}: { 
  title: string
  badge?: string
  children: React.ReactNode
  className?: string
}) => {
  return (
    <View className={`w-full bg-white p-4 rounded-[32px] border border-[#E4DFD9] ${className}`}>
      {/* 卡片头部 */}
      <View className="flex items-center justify-between mb-3">
        <Text className="text-base font-semibold text-[#2E2822]">{title}</Text>
        {badge && (
          <Text className="text-xs font-bold text-[#6D6A64] bg-[#D9E7CE] px-2 py-0.5 rounded-full">
            {badge}
          </Text>
        )}
      </View>
      
      {/* 图表内容 */}
      {children}
    </View>
  )
}

// 使用示例
<ChartCard title="生长趋势" badge="更新于今天">
  <AnalysisChart 
    option={createGrowthTrendOption(points)} 
    height={200}
    state={points.length === 0 ? 'empty' : 'ready'}
  />
</ChartCard>
```

## 检查清单

- [ ] 图表颜色是否通过 `chartColorMap` 统一管理？
- [ ] 图表配置是否拆分到独立的 `chartOptions.ts` 文件？
- [ ] 是否处理了加载、空数据、错误三种占位状态？
- [ ] 图表尺寸是否使用响应式处理？
- [ ] 是否避免了在图表组件中硬编码样式？
- [ ] 图表组件是否封装为可复用的卡片组件？
