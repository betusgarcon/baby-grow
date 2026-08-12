/**
 * 生长分析相关类型
 * GrowthPage 使用的数据结构
 */

/** 生长指标 Key */
export type GrowthMetricKey = 'height' | 'weight' | 'head'

/** 生长时间范围 Key */
export type GrowthRangeKey = 'last3m' | 'last6m' | 'birth'

/** 生长数据点 */
export interface GrowthDataPoint {
  label: string
  value: number
}

/** 生长对比数据点（含 WHO 标准值） */
export interface GrowthComparisonPoint extends GrowthDataPoint {
  referenceValue: number
}

/** 生长趋势快照 */
export interface GrowthTrendSnapshot {
  points: GrowthComparisonPoint[]
  chartLabel: string
  comparisonLabel: string
  footer: {
    age: string
    value: string
    badge: string
  }
}

/** 获取生长趋势请求参数 */
export interface GetGrowthTrendParams {
  babyId: string
  metric: GrowthMetricKey
  range: GrowthRangeKey
}

/** 获取生长趋势响应 */
export interface GetGrowthTrendResponse {
  snapshot: GrowthTrendSnapshot
  metrics: GrowthDataPoint[]
  insight: {
    title: string
    content: string
  }
}

/** 生长指标概览 */
export interface GrowthMetricOverview {
  key: GrowthMetricKey
  label: string
  value: string
  unit: string
  percentile?: string
  active?: boolean
}

/** 月度饮食图例项 */
export interface DietLegendItem {
  label: string
  value: number
  colorClass: string
}

/** 获取生长页面完整数据响应 */
export interface GetGrowthPageResponse {
  insight: {
    title: string
    content: string
  }
  metrics: GrowthMetricOverview[]
  timeRanges: Array<{ key: GrowthRangeKey; label: string }>
  trends: Record<GrowthRangeKey, Record<GrowthMetricKey, GrowthTrendSnapshot>>
  monthlyDiet: {
    ratio: number
    title: string
    legends: DietLegendItem[]
    ingredients: string[]
    ingredientCount: number
    badge: string
  }
  milestones: Array<{
    label: string
    unlocked: boolean
    icon: string
  }>
}
