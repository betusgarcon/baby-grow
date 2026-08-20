import type { CSSProperties } from 'react'
import { View, Text } from '@tarojs/components'
import { analysisColors } from '@/pages/analysis/components/analysisTokens'

interface AnalysisChartProps {
  option: ChartOption
  className?: string
  style?: CSSProperties
  isPage?: boolean
  dataSource?: 'mock' | 'real' | 'inline'
}

type ChartDatum =
  | number
  | {
      value?: number
      name?: string
      itemStyle?: {
        color?: string
      }
    }

type ChartSeries = {
  type?: 'line' | 'bar' | 'pie'
  data?: ChartDatum[]
  stack?: string
  radius?: [string, string]
  itemStyle?: {
    color?: string
  }
  lineStyle?: {
    color?: string
  }
}

type ChartOption = {
  xAxis?: {
    data?: string[]
  }
  yAxis?: {
    data?: string[]
  }
  series?: ChartSeries[]
}

/**
 * AnalysisChart
 *
 * 因为小程序环境里把第三方 canvas 图表塞进 ScrollView 后，
 * 很容易出现漂移、层级错乱或渲染不稳定的问题，
 * 所以这里采用"纯视图渲染"的轻量方案：
 * - line: 用定位点 + 线段拼出折线
 * - pie: 用 SVG 渲染环图
 * - bar: 用普通 View 做柱图
 *
 * 这套方案虽然没有完整图表库那么重，但在当前分析页里更稳定。
 */
/** 读取单个数据点里的数值部分，统一兼容 number 和对象两种数据格式。 */
function getDatumValue(datum: ChartDatum): number {
  if (typeof datum === 'number') return datum
  return datum.value ?? 0
}

/** 读取单个数据点自己的颜色；如果没传，就退回到系列默认颜色。 */
function getDatumColor(datum: ChartDatum, fallback: string): string {
  if (typeof datum === 'number') return fallback
  return datum.itemStyle?.color || fallback
}

/** 把组件外部传进来的尺寸值统一转成可直接给 style 使用的格式。 */
function toSizeValue(value?: string | number): string | number | undefined {
  if (typeof value === 'number') return `${value}px`
  return value
}

/** 格式化坐标轴数值，避免出现太长的小数字符串。 */
function formatAxisValue(value: number): string {
  return Number.isInteger(value) ? `${value}` : value.toFixed(1)
}

/** 用纯 View + 定位的方式渲染双折线/多折线图。 */
function renderLineChart(option: ChartOption) {
  const labels = option.xAxis?.data ?? []
  const seriesList = (option.series ?? []).map((series, index) => ({
    label: index === 0 ? 'Baby' : 'WHO',
    color:
      series.lineStyle?.color ||
      series.itemStyle?.color ||
      (index === 0 ? analysisColors.highlightOrange : analysisColors.highlightOlive),
    points: (series.data ?? []).map((datum, pointIndex) => ({
      label: labels[pointIndex] ?? `${pointIndex + 1}`,
      value: getDatumValue(datum),
    })),
  }))

  const allPoints = seriesList.flatMap((series) => series.points)
  const rawMax = Math.max(...allPoints.map((point) => point.value), 1)
  const rawMin = Math.min(...allPoints.map((point) => point.value), 0)
  const rawSpan = Math.max(rawMax - rawMin, 1)

  const topPadding = rawSpan * 0.2
  const maxValue = Math.ceil(rawMax + topPadding)
  const minValue = 0
  const span = Math.max(maxValue - minValue, 1)

  const monthNumbers = labels.map((l) => parseInt(l.replace('M', ''), 10))
  const minDataMonth = Math.min(...monthNumbers)
  const maxDataMonth = Math.max(...monthNumbers)

  const minMonth = minDataMonth
  const maxMonth = maxDataMonth

  const rawMonthRange = maxMonth - minMonth
  const rangeBuffer = rawMonthRange < 6 ? 1 : 0
  const finalMinMonth = Math.max(0, minMonth - rangeBuffer)
  const finalMaxMonth = maxMonth + rangeBuffer

  const chartPadding = 3

  const monthToPercent = (month: number) => {
    if (finalMaxMonth <= finalMinMonth) return 50
    const rawPercent = ((month - finalMinMonth) / (finalMaxMonth - finalMinMonth)) * 100
    return chartPadding + (rawPercent / 100) * (100 - chartPadding * 2)
  }

  const monthRange = finalMaxMonth - finalMinMonth
  let labelInterval = 1
  if (monthRange > 36) labelInterval = 12
  else if (monthRange > 24) labelInterval = 6
  else if (monthRange > 15) labelInterval = 3
  else if (monthRange > 8) labelInterval = 2

  const extendedLabels: { label: string; month: number }[] = []
  for (let m = finalMinMonth; m <= finalMaxMonth; m++) {
    if (m === finalMinMonth || m === finalMaxMonth || (m - finalMinMonth) % labelInterval === 0) {
      extendedLabels.push({ label: String(m), month: m })
    }
  }

  const normalizedSeries = seriesList.map((series) => ({
    ...series,
    points: series.points.map((point, index) => ({
      ...point,
      xPercent: monthToPercent(monthNumbers[index]),
      yPercent: 100 - ((point.value - minValue) / span) * 100,
    })),
  }))

  return (
    <View className="w-full h-full flex flex-col">
      <View className="flex-1 rounded-[24px] bg-[#F7F4EF] border-[#E6DDD4] border px-3 py-3">
        <View className="w-full h-full flex gap-3">
          <View className="w-8 h-full flex flex-col justify-between items-end py-1">
            {[maxValue, minValue + span * 0.66, minValue + span * 0.33].map((value, index) => (
              <Text key={`${value}-${index}`} className="text-xs font-medium text-[#9B958E]">
                {formatAxisValue(value)}
              </Text>
            ))}
            <View className="h-0" />
          </View>

          <View className="flex-1 h-full flex flex-col">
            <View className="relative flex-1 overflow-hidden">
              {[0, 1, 2, 3].map((row) => (
                <View
                  key={row}
                  className="absolute left-0 right-0 border-t border-dashed border-[#ECE4DB]"
                  style={{ top: `${row * 33.3}%` }}
                />
              ))}

              <View className="absolute inset-0">
                {normalizedSeries.map((series) =>
                  series.points.slice(0, -1).map((point, index) => {
                    const nextPoint = series.points[index + 1]
                    const left = point.xPercent
                    const top = point.yPercent
                    const dx = nextPoint.xPercent - point.xPercent
                    const dy = nextPoint.yPercent - point.yPercent
                    const width = Math.sqrt(dx * dx + dy * dy)
                    const angle = (Math.atan2(dy, dx) * 180) / Math.PI

                    return (
                      <View
                        key={`${series.label}-${point.label}-${nextPoint.label}`}
                        className="absolute h-[3px] rounded-full origin-left-top"
                        style={{
                          left: `${left}%`,
                          top: `${top}%`,
                          width: `${width}%`,
                          backgroundColor: series.color,
                          transform: `rotate(${angle}deg)`,
                        }}
                      />
                    )
                  })
                )}

                {normalizedSeries.map((series) =>
                  series.points.map((point) => {
                    const isBaby = series.label === 'Baby'
                    const nearTop = point.yPercent < 15
                    const nearBottom = point.yPercent > 85
                    const showAbove = isBaby ? !nearTop : nearBottom

                    return (
                      <View
                        key={`${series.label}-${point.label}`}
                        className="absolute items-center"
                        style={{
                          left: `${point.xPercent}%`,
                          top: `${point.yPercent}%`,
                          transform: 'translate(-50%, -50%)',
                        }}
                      >
                        <Text
                          className={`absolute text-[13px] font-semibold whitespace-nowrap leading-none ${
                            showAbove ? 'bottom-full mb-0.5' : 'top-full mt-0.5'
                          }`}
                          style={{ color: series.color }}
                        >
                          {formatAxisValue(point.value)}
                        </Text>
                        <View
                          className="w-2.5 h-2.5 rounded-full border-[1.5px] border-white z-10"
                          style={{ backgroundColor: series.color }}
                        />
                      </View>
                    )
                  })
                )}
              </View>
            </View>

            <View className="relative pt-2 h-5">
              {extendedLabels.map(({ label, month }) => (
                <Text
                  key={`${label}-${month}`}
                  className="absolute text-xs font-medium text-[#8C857D]"
                  style={{
                    left: `${monthToPercent(month)}%`,
                    transform: 'translateX(-50%)',
                  }}
                >
                  {label}
                </Text>
              ))}
            </View>
          </View>
        </View>
      </View>
    </View>
  )
}

/** 用 conic-gradient 渲染环图/饼图。 */
function renderPieChart(option: ChartOption) {
  const series = option.series?.[0]
  const segments = (series?.data ?? []).map((datum, index) => ({
    label: typeof datum === 'number' ? `Item ${index + 1}` : datum.name || `Item ${index + 1}`,
    value: getDatumValue(datum),
    color: getDatumColor(datum, ['#E8DDCF', '#D3DBC3', '#D8D2CB'][index % 3]),
  }))

  const total = segments.reduce((sum, item) => sum + item.value, 0) || 1

  // 生成 conic-gradient 的 stops 字符串
  // 格式: conic-gradient(from -90deg, color1 0%, color1 55%, color2 55%, color2 85%, ...)
  const stops: string[] = []
  let currentPercent = 0

  segments.forEach((segment) => {
    const startPercent = currentPercent
    const endPercent = startPercent + (segment.value / total) * 100

    stops.push(`${segment.color} ${startPercent}%`)
    stops.push(`${segment.color} ${endPercent}%`)
    currentPercent = endPercent
  })

  return (
    <View
      className="relative rounded-full overflow-hidden w-full h-full"
      style={{
        background: `conic-gradient(from -90deg, ${stops.join(', ')})`,
      }}
    >
      {/* 中间白圆挖空形成 donut 效果 */}
      <View
        className="absolute left-1/2 top-1/2 rounded-full"
        style={{
          width: '62%',
          height: '62%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: '#fbfaf7',
        }}
      />
    </View>
  )
}

/** 渲染横向堆叠条图，主要给睡眠演化这种"多片段一行"场景使用。 */
function renderStackedBarChart(option: ChartOption) {
  const rowLabels = option.yAxis?.data ?? []
  const seriesList = option.series ?? []

  return (
    <View className="w-full h-full flex flex-col justify-center gap-4">
      {rowLabels.map((rowLabel, rowIndex) => {
        const rowSegments = seriesList
          .map((series, seriesIndex) => {
            const datum = series.data?.[rowIndex]
            const value = datum ? getDatumValue(datum) : 0

            return {
              key: `${rowLabel}-${seriesIndex}`,
              value,
              color: datum ? getDatumColor(datum, '#d8d2ca') : 'transparent',
            }
          })
          .filter((segment) => segment.value > 0)

        const total = rowSegments.reduce((sum, item) => sum + item.value, 0) || 1

        return (
          <View key={rowLabel} className="flex items-center gap-3">
            <Text className="w-16 text-xs font-semibold" style={{ color: analysisColors.textSecondary }}>{rowLabel}</Text>
            <View className="flex-1 h-5 rounded-full overflow-hidden bg-[#efebe6] flex">
              {rowSegments.map((segment) => (
                <View
                  key={segment.key}
                  style={{
                    width: `${(segment.value / total) * 100}%`,
                    backgroundColor: segment.color,
                  }}
                />
              ))}
            </View>
          </View>
        )
      })}
    </View>
  )
}

/** 渲染普通柱图；如果检测到多组 bar，则自动切换到堆叠条图分支。 */
function renderBarChart(option: ChartOption) {
  const seriesList = option.series ?? []
  const isStacked = seriesList.length > 1 && seriesList.every((series) => series.type === 'bar')

  if (isStacked) {
    return renderStackedBarChart(option)
  }

  const series = seriesList[0]
  const labels = option.xAxis?.data ?? []
  const bars = (series?.data ?? []).map((datum, index) => ({
    label: labels[index] ?? `${index + 1}`,
    value: getDatumValue(datum),
    color: getDatumColor(datum, series?.itemStyle?.color || '#d9d2ca'),
  }))

  const maxValue = Math.max(...bars.map((bar) => bar.value), 1)

  return (
    <View className="w-full h-full flex items-end justify-between gap-3 px-1">
      {bars.map((bar) => (
        <View key={bar.label} className="flex-1 h-full flex flex-col items-center justify-end gap-2">
          <Text className="text-[13px] font-semibold" style={{ color: '#9A7A61' }}>{bar.value}</Text>
          <View
            className="w-[72%] min-w-[24px] rounded-t-[14px] min-h-[22px]"
            style={{
              height: `${Math.max(14, (bar.value / maxValue) * 100)}%`,
              backgroundColor: bar.color,
            }}
          />
          <Text className="text-xs font-medium" style={{ color: analysisColors.textTertiary }}>{bar.label}</Text>
        </View>
      ))}
    </View>
  )
}

/** 根据 option 里的主图表类型，把渲染分发到对应的具体实现。 */
function renderChart(option: ChartOption) {
  const primaryType = option.series?.[0]?.type

  if (primaryType === 'line') return renderLineChart(option)
  if (primaryType === 'pie') return renderPieChart(option)

  return renderBarChart(option)
}

/** Analysis 模块的统一图表入口组件，负责承接 option 并提供稳定尺寸容器。 */
export default function AnalysisChart({
  option,
  className,
  style,
  dataSource,
}: AnalysisChartProps) {
  const sourceLabel = dataSource ?? 'inline'
  const pointCount = (option.series ?? []).reduce(
    (sum, s) => sum + (s.data?.length ?? 0),
    0,
  )

  return (
    <View
      className={className}
      style={{
        width: toSizeValue(style?.width) ?? '100%',
        height: toSizeValue(style?.height) ?? '100%',
      }}
    >
      {renderChart(option)}
    </View>
  )
}
