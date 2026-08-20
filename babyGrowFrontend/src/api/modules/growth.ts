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

/** 获取生长分析页面完整数据 */
export function getGrowthPage(babyId: string) {
  return http.get<GetGrowthPageResponse>('/api/baby/growth', { babyId })
}

/** 获取单个指标的趋势数据 */
export function getGrowthTrend(params: GetGrowthTrendParams) {
  return http.get<GetGrowthTrendResponse>('/api/baby/growth/trend', { ...params })
}
