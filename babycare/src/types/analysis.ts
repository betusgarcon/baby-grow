/**
 * Analysis 模块页面级类型定义
 *
 * 这些类型是 analysis 页面组件直接使用的视图层类型，
 * 与 types/growth.ts、types/sleep.ts 等 API 层类型有所区别
 * （如字段命名 colorClass vs color、label vs month 等）。
 * 页面迁移到 API 调用后，本文件可逐步废弃。
 */

/** 分析分类 Key */
export type AnalysisCategoryKey = 'growth' | 'sleep' | 'diet' | 'mood'

/** 分析子标签 Key */
export type AnalysisSubtabKey = 'sleepDaily' | 'sleepMonthly' | 'dietWeek' | 'dietMonth'

/** 生长指标 Key */
export type GrowthMetricKey = 'height' | 'weight' | 'head'

/** 生长时间范围 Key */
export type GrowthRangeKey = 'last3m' | 'last6m' | 'birth'

/** 宝宝资料摘要（视图层） */
export interface BabyProfileSummary {
  name: string
  ageLabel: string
  statusLabel: string
  avatar: string
}

/** AI 洞察块数据 */
export interface InsightBlockData {
  title: string
  accentLabel?: string
  content: string
}

/** 指标项 */
export interface MetricItem {
  key: string
  label: string
  value: string
  unit: string
  active?: boolean
}

/** 环形图图例项（使用 CSS 类名） */
export interface DonutLegendItem {
  label: string
  value: number
  colorClass: string
}

/** 里程碑项 */
export interface MilestoneItem {
  label: string
  unlocked: boolean
  icon: string
}

/** 每日睡眠日志项（视图层） */
export interface DailySleepLogItem {
  id: string
  title: string
  range: string
  duration: string
  icon?: string
}

/** 情绪日历天项 */
export interface MoodCalendarDay {
  day: number
  type: 'happy' | 'clingy' | 'discomfort' | 'empty'
  highlighted?: boolean
}

/** 情绪图例项（使用 CSS 类名） */
export interface MoodLegendItem {
  label: string
  colorClass: string
}

/** 情绪打卡选项 */
export interface MoodCheckinOption {
  key: 'happy' | 'clingy' | 'discomfort'
  label: string
  emoji: string
  icon: string
  activeColor: string
  activeBg: string
  inactiveBg: string
}

/** 时间范围项 */
export interface TimeRangeItem {
  key: string
  label: string
}

/** 生长图表数据点 */
export interface GrowthChartPoint {
  label: string
  value: number
}

/** 生长对比图表数据点 */
export interface GrowthComparisonChartPoint extends GrowthChartPoint {
  referenceValue: number
}

/** 生长趋势快照 */
export interface GrowthTrendSnapshot {
  points: GrowthComparisonChartPoint[]
  chartLabel: string
  comparisonLabel: string
  footer: {
    age: string
    value: string
    badge: string
  }
}

/** 每周饮食柱状图项 */
export interface WeeklyDietBar {
  label: string
  value: number
  highlighted?: boolean
}

/** 昼夜节律摘要 */
export interface SleepCircadianSummary {
  totalSleepLabel: string
  goalLabel: string
  nightLabel: string
  napLabel: string
  segments: Array<{
    label: string
    value: number
    color: string
  }>
}

/** 睡眠演变行 */
export interface SleepEvolutionRow {
  label: string
  summary: string
  segments: Array<{
    startHour: number
    duration: number
    type: 'night' | 'nap' | 'awake'
  }>
}
