/**
 * 首页今日菜单 API。
 *
 * 后端只读缓存、绝不等待 AI，所以这个请求是毫秒级的；拿不到内容时
 * {@link MenuTodayResponse.stale} 为 true，表示后台正在生成或重算。
 */

import { http } from '@/api/request'
import type { MenuItem } from '@/types/journey'

export interface MenuTodayResponse {
  date: string
  /** null 表示还没生成过 */
  generatedAt: string | null
  /** true = 这是上一次的结果或空占位，后台正在重新生成 */
  stale: boolean
  items: MenuItem[]
  reason: string | null
  avoidItems: string[]
  error: string | null
}

export function getTodayMenu() {
  return http.get<MenuTodayResponse>('/api/baby/menu/today')
}
