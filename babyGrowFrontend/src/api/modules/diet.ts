/**
 * 饮食分析 API
 * 页面只调用这些函数，不直接访问 mock
 */

import { http } from '@/api/request'
import type {
  GetWeeklyDietResponse,
  GetMonthlyDietResponse,
  AddIngredientResponse,
  AddIngredientParams,
} from '@/types/diet'

/** 获取本周饮食数据（宝宝由登录态解析，不传 id） */
export function getWeeklyDiet(weekStart?: string) {
  return http.get<GetWeeklyDietResponse>('/api/baby/diet/weekly', { weekStart })
}

/** 获取本月饮食数据 */
export function getMonthlyDiet(month?: string) {
  return http.get<GetMonthlyDietResponse>('/api/baby/diet/monthly', { month })
}

/** 添加食材 */
export function addIngredient(params: AddIngredientParams) {
  return http.post<AddIngredientResponse>('/api/baby/diet/ingredients', { ...params })
}
