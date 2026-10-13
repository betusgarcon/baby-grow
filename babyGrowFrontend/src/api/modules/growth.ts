/**
 * 生长分析 API
 * 页面只调用这些函数，不直接访问 mock
 */

import { http } from '@/api/request'
import type {
  GetGrowthPageResponse,
  GetGrowthTrendResponse,
  GetGrowthTrendParams,
} from '@/types/growth'

/**
 * 获取生长分析页面完整数据。
 *
 * 不带 babyId：宝宝一律由后端从登录态解析，传过去也会被忽略。
 * 此前传的 'baby-001' 是前端编的假 id，只会在 Network 里造成误导。
 */
export function getGrowthPage() {
  return http.get<GetGrowthPageResponse>('/api/baby/growth')
}

/** 获取单个指标的趋势数据 */
export function getGrowthTrend(params: GetGrowthTrendParams) {
  return http.get<GetGrowthTrendResponse>('/api/baby/growth/trend', { ...params })
}
