/**
 * 通用类型定义
 * - 统一响应包装格式
 * - 分页结构
 * - 通用枚举
 */

/** 通用响应包装 */
export interface ApiResponse<T> {
  code: number
  data: T
  message: string
}

/** 分页请求参数 */
export interface PaginationParams {
  page: number
  pageSize: number
}

/** 分页响应数据 */
export interface PaginatedData<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
}

/** AI 洞察块 */
export interface InsightBlock {
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

/** 时间范围 */
export interface TimeRange {
  key: string
  label: string
}

/** 里程碑项 */
export interface MilestoneItem {
  label: string
  unlocked: boolean
  icon: string
}

/** 图例项 */
export interface LegendItem {
  label: string
  value: number
  color: string
}

/** 环境配置 */
export interface ApiConfig {
  baseUrl: string
  useMock: boolean
  timeout: number
}
