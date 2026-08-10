import type {
  DonutLegendItem,
  GrowthComparisonChartPoint,
  GrowthChartPoint,
  SleepCircadianSummary,
  SleepEvolutionRow,
  WeeklyDietBar,
} from '@/types/analysis'
import { analysisColors } from './analysisTokens'

type ChartDatum = number | { value: number; name?: string; itemStyle?: { color?: string; borderRadius?: number[] } }

type ChartOption = {
  animation?: boolean
  grid?: Record<string, unknown>
  tooltip?: Record<string, unknown>
  xAxis?: Record<string, unknown> & { data?: string[] }
  yAxis?: Record<string, unknown> & { data?: string[] }
  series?: Array<Record<string, unknown> & { type?: 'line' | 'bar' | 'pie'; data?: ChartDatum[] }>
}

// 这里保留“图表配置函数”而不是把 option 散落到页面里，
// 是为了让数据层和展示层的职责更清楚。
const axisLabelColor = analysisColors.textTertiary
const gridLineColor = '#ECE6DF'
const textColor = analysisColors.textPrimary

/** 从 Tailwind colorClass 中提取 hex 颜色。
 * 处理 Tailwind/PostCSS 编译后的类名格式：
 *   原始: bg-[#E8DDCF]  →  编译后: bg-_hE8DDCF_
 * （方括号和 # 会被替换为下划线，避免 CSS 选择器特殊字符冲突） */
function extractHexFromColorClass(colorClass: string): string {
  // 方法：使用 split 解析，比正则更可靠
  // 格式1: bg-_hE8DDCF_ (tailwind 转义后)
  if (colorClass.startsWith('bg-_h')) {
    const hex = colorClass.slice(5, -1) // 去掉 "bg-_h" 前缀和 "_" 后缀
    if (/^[0-9A-Fa-f]{3,8}$/.test(hex)) {
      return `#${hex}`
    }
  }
  // 格式2: bg-[#E8DDCF] (原始格式)
  if (colorClass.startsWith('bg-[#') && colorClass.endsWith(']')) {
    return colorClass.slice(4, -1) // 去掉 "bg-[" 和 "]"
  }
  // 格式3: 直接是 #E8DDCF
  if (colorClass.startsWith('#')) {
    return colorClass
  }
  // fallback
  console.warn(`[COLOR DEBUG] 无法解析颜色类: "${colorClass}"`)
  return '#d19a73'
}

export function createGrowthTrendOption(points: Array<GrowthChartPoint | GrowthComparisonChartPoint>): ChartOption {
  // growth 页的点位数据有两种来源：
  // 1. 只有宝宝自己的数据
  // 2. 宝宝数据 + WHO 对照数据
  // 这里统一展开成两条序列，方便后面的折线渲染层直接消费。
  const babyValues = points.map((point) => point.value)
  const referenceValues = points.map((point) =>
    'referenceValue' in point ? point.referenceValue : point.value
  )
  const allValues = [...babyValues, ...referenceValues]
  // 给上下边界各留一点 breathing room，
  // 避免最大值和最小值紧贴边框，看起来像“被切到容器边缘”。
  const minValue = Math.min(...allValues) - 0.8
  const maxValue = Math.max(...allValues) + 0.8

  return {
    animation: false,
    grid: {
      left: 18,
      right: 18,
      top: 18,
      bottom: 26,
      containLabel: true,
    },
    tooltip: {
      trigger: 'axis',
      confine: true,
      backgroundColor: '#ffffff',
      borderWidth: 0,
      padding: [8, 10],
      textStyle: {
        color: textColor,
        fontSize: 14,
      },
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: points.map((point) => point.label),
      axisLine: {
        lineStyle: {
          color: '#d8d1ca',
        },
      },
      axisTick: {
        show: false,
      },
      axisLabel: {
        color: axisLabelColor,
        fontSize: 14,
      },
    },
    yAxis: {
      type: 'value',
      min: minValue,
      max: maxValue,
      splitNumber: 4,
      axisLine: {
        show: false,
      },
      axisTick: {
        show: false,
      },
      axisLabel: {
        color: axisLabelColor,
        fontSize: 14,
      },
      splitLine: {
        lineStyle: {
          color: gridLineColor,
          type: 'dashed',
        },
      },
    },
    series: [
      {
        type: 'line',
        smooth: true,
        data: babyValues,
        symbol: 'circle',
        symbolSize: 9,
        itemStyle: {
          color: analysisColors.highlightOrange,
          borderColor: '#ffffff',
          borderWidth: 2,
        },
        lineStyle: {
          color: analysisColors.highlightOrange,
          width: 3,
        },
      },
      {
        type: 'line',
        smooth: true,
        data: referenceValues,
        symbol: 'circle',
        symbolSize: 8,
        itemStyle: {
          color: analysisColors.highlightOlive,
          borderColor: '#ffffff',
          borderWidth: 2,
        },
        lineStyle: {
          color: analysisColors.highlightOlive,
          width: 3,
        },
      },
    ],
  }
}

export function createDietDonutOption(legends: DonutLegendItem[]): ChartOption {
  // 环图数据直接由 legend 反推，确保“图形占比”和右侧文案列表永远一致。
  return {
    animation: false,
    tooltip: {
      trigger: 'item',
      confine: true,
      backgroundColor: '#ffffff',
      borderWidth: 0,
      textStyle: {
        color: textColor,
        fontSize: 11,
      },
    },
    series: [
      {
        type: 'pie',
        radius: ['66%', '86%'],
        center: ['50%', '50%'],
        startAngle: 90,
        avoidLabelOverlap: true,
        label: {
          show: false,
        },
        labelLine: {
          show: false,
        },
        emphasis: {
          scale: false,
        },
        itemStyle: {
          borderColor: '#ffffff',
          borderWidth: 4,
        },
        data: legends.map((item) => {
          const parsedColor = extractHexFromColorClass(item.colorClass)
          console.log(`[COLOR DEBUG] colorClass="${item.colorClass}" → parsed="${parsedColor}"`)
          return {
            value: item.value,
            name: item.label,
            itemStyle: {
              color: parsedColor,
            },
          }
        }),
      },
    ],
  }
}

export function createDietWeekBarOption(
  bars: WeeklyDietBar[],
  standardRange: [number, number] = [600, 800]
): ChartOption {
  // 周奶量柱图除了柱子本身，还要表达“标准区间”。
  // 所以这里同时准备 bar、markArea 和 markLine 三层信息。
  return {
    animation: false,
    grid: {
      left: 8,
      right: 8,
      top: 10,
      bottom: 10,
      containLabel: true,
    },
    tooltip: {
      trigger: 'axis',
      confine: true,
      backgroundColor: '#ffffff',
      borderWidth: 0,
      textStyle: {
        color: textColor,
        fontSize: 11,
      },
    },
    xAxis: {
      type: 'category',
      data: bars.map((bar) => bar.label),
      axisTick: {
        show: false,
      },
      axisLine: {
        lineStyle: {
          color: '#e6dfd6',
        },
      },
      axisLabel: {
        color: '#5b5956',
        fontSize: 11,
      },
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 850,
      splitNumber: 4,
      axisTick: {
        show: false,
      },
      axisLine: {
        show: false,
      },
      axisLabel: {
        color: axisLabelColor,
        fontSize: 10,
      },
      splitLine: {
        lineStyle: {
          color: gridLineColor,
        },
      },
    },
    series: [
      {
        type: 'bar',
        data: bars.map((bar) => ({
          value: bar.value,
          itemStyle: {
            color: bar.highlighted ? '#4B5B65' : '#D9D2CA',
            borderRadius: [6, 6, 0, 0],
          },
        })),
        barWidth: 16,
        markArea: {
          silent: true,
          itemStyle: {
            color: 'rgba(244, 241, 236, 0.8)',
          },
          data: [
            [
              // markArea 用来铺出推荐区间的背景带，
              // 让用户一眼能看出当前摄入是否落在合理范围内。
              { yAxis: standardRange[0] },
              { yAxis: standardRange[1] },
            ],
          ],
        },
        markLine: {
          silent: true,
          symbol: 'none',
          lineStyle: {
            color: '#c3b9ae',
            type: 'dashed',
          },
          data: [{ yAxis: 680 }],
        },
      },
    ],
  }
}

export function createSleepDailyRingOption(summary: SleepCircadianSummary): ChartOption {
  // 日间睡眠环图只关心分段占比，不需要额外的标签和折线，
  // 因此这里把 option 控制在最小必要集，渲染会更稳定。
  return {
    animation: false,
    tooltip: {
      trigger: 'item',
      confine: true,
      backgroundColor: '#ffffff',
      borderWidth: 0,
      textStyle: {
        color: textColor,
        fontSize: 11,
      },
    },
    series: [
      {
        type: 'pie',
        radius: ['68%', '92%'],
        center: ['50%', '50%'],
        startAngle: 90,
        clockwise: true,
        label: {
          show: false,
        },
        labelLine: {
          show: false,
        },
        emphasis: {
          scale: false,
        },
        itemStyle: {
          borderColor: '#ffffff',
          borderWidth: 4,
        },
        data: summary.segments.map((segment) => ({
          value: segment.value,
          name: segment.label,
          itemStyle: {
            color: segment.color,
          },
        })),
      },
    ],
  }
}

export function createSleepEvolutionOption(rows: SleepEvolutionRow[]): ChartOption {
  const maxSegments = Math.max(...rows.map((row) => row.segments.length))
  const typeColorMap = {
    night: analysisColors.sleepNight,
    nap: analysisColors.sleepNap,
    awake: analysisColors.sleepAwake,
  }

  return {
    animation: false,
    grid: {
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      containLabel: false,
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      confine: true,
      backgroundColor: '#ffffff',
      borderWidth: 0,
      textStyle: { color: textColor, fontSize: 11 },
    },
    xAxis: { type: 'value', max: 100, show: false },
    yAxis: {
      type: 'category',
      inverse: true,
      data: rows.map((row) => row.label),
      axisTick: { show: false },
      axisLine: { show: false },
      axisLabel: { show: false },
    },
    series: Array.from({ length: maxSegments }, (_, index) => {
      const seriesData = rows.map((row) => {
        const segment = row.segments[index]
        if (!segment) {
          return { value: 0, itemStyle: { color: 'transparent' } }
        }
        return {
          value: (segment.duration / 24) * 100,
          itemStyle: { color: typeColorMap[segment.type], borderRadius: 4 },
        }
      })
      return {
        type: 'bar' as const,
        stack: 'sleep',
        barWidth: 28,
        emphasis: { disabled: true },
        itemStyle: { color: '#ebe7e2', borderRadius: 4 },
        data: seriesData as any,
      }
    }),
  } as ChartOption
}

// 单行 Sleep Evolution 图：用于“标签+说明 + 条形图”交替布局
export function createSingleSleepEvolutionRowOption(
  segments: Array<{ widthPercent: number; type: 'night' | 'nap' | 'awake' }>
): ChartOption {
  const typeColorMap = {
    night: analysisColors.sleepNight,
    nap: analysisColors.sleepNap,
    awake: analysisColors.sleepAwake,
  }

  return {
    animation: false,
    grid: { left: 0, right: 0, top: 0, bottom: 0, containLabel: false },
    xAxis: { type: 'value', max: 100, show: false },
    yAxis: {
      type: 'category',
      data: ['bar'],
      axisTick: { show: false },
      axisLine: { show: false },
      axisLabel: { show: false },
    },
    series: Array.from({ length: segments.length }, (_, index) => {
      const segment = segments[index]
      return {
        type: 'bar' as const,
        stack: 'sleep',
        barWidth: 32,
        emphasis: { disabled: true },
        itemStyle: { color: segment ? typeColorMap[segment.type] : 'transparent', borderRadius: 6 },
        data: [segment ? { value: segment.widthPercent } : { value: 0, itemStyle: { color: 'transparent' } }] as any,
      }
    }),
  } as ChartOption
}
