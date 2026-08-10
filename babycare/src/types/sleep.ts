/**
 * 睡眠分析相关类型
 * SleepDailyPage / SleepMonthlyPage 使用的数据结构
 */

/** 睡眠段类型 */
export type SleepSegmentType = 'night' | 'nap' | 'awake'

/** 睡眠段 */
export interface SleepSegment {
  label: string
  value: number
  color: string
}

/** 昼夜节律摘要 */
export interface SleepCircadianSummary {
  totalSleepLabel: string
  goalLabel: string
  nightLabel: string
  napLabel: string
  segments: SleepSegment[]
}

/** 获取昼夜节律请求参数 */
export interface GetSleepCircadianParams {
  babyId: string
  date?: string
}

/** 获取昼夜节律响应 */
export interface GetSleepCircadianResponse {
  summary: SleepCircadianSummary
}

/** 每日睡眠日志项 */
export interface DailySleepLog {
  id: string
  title: string
  range: string
  duration: string
  type: SleepSegmentType
  icon?: string
}

/** 获取每日睡眠日志请求参数 */
export interface GetDailySleepLogsParams {
  babyId: string
  date?: string
}

/** 获取每日睡眠日志响应 */
export interface GetDailySleepLogsResponse {
  logs: DailySleepLog[]
  insight: {
    title: string
    content: string
  }
}

/** 睡眠演变段 */
export interface SleepEvolutionSegment {
  startHour: number
  duration: number
  type: SleepSegmentType
}

/** 睡眠演变行 */
export interface SleepEvolutionRow {
  label: string
  summary: string
  segments: SleepEvolutionSegment[]
}

/** 获取睡眠演变请求参数 */
export interface GetSleepEvolutionParams {
  babyId: string
  months?: number[]
}

/** 获取睡眠演变响应 */
export interface GetSleepEvolutionResponse {
  rows: SleepEvolutionRow[]
  insight: {
    title: string
    content: string
  }
}

/** 睡眠日志新增请求 */
export interface AddSleepLogParams {
  babyId: string
  title: string
  startTime: string
  endTime: string
  type: SleepSegmentType
}

/** 睡眠日志新增响应 */
export interface AddSleepLogResponse {
  log: DailySleepLog
}
