/**
 * 首页/旅程 API
 * 页面只调用这些函数，不直接访问 mock
 */

import { http } from '@/api/request'
import type { AddMenuResponse, AddMenuParams } from '@/types/journey'

/** 添加餐食项 */
export function addMenu(params: AddMenuParams) {
  return http.post<AddMenuResponse>('/api/baby/menu', { ...params })
}

// 这里原本还有三个函数：getJourneyPage / addMilestone / addJourneyLog。
// 它们指向的 /api/baby/journey、/api/baby/milestones、/api/baby/journey-logs
// 在 Java 后端**并不存在**（JourneyController 只有 milestones-list、calendar-events、
// weekly-insight 三个 GET）。更麻烦的是这三个前缀也不在 config.ts 的 REAL_API_PATHS 里，
// 所以即使有人调用，拿到的也是 mock 数据而不会报错——一个在生产环境里静默返回假数据的陷阱。
// 无人调用，直接删掉；将来后端补上对应端点时再连同前缀一起加。
