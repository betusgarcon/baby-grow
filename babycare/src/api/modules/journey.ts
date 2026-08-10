/**
 * 首页/旅程 API
 * 页面只调用这些函数，不直接访问 mock
 */

import { http } from '@/api/request'
import type {
  GetJourneyPageResponse,
  AddMilestoneResponse,
  AddMilestoneParams,
  AddJourneyLogResponse,
  AddJourneyLogParams,
  AddMenuResponse,
  AddMenuParams,
} from '@/types/journey'

/** 获取首页完整数据 */
export function getJourneyPage(babyId: string, date?: string) {
  return http.get<GetJourneyPageResponse>('/api/baby/journey', { babyId, date })
}

/** 添加里程碑 */
export function addMilestone(params: AddMilestoneParams) {
  return http.post<AddMilestoneResponse>('/api/baby/milestones', { ...params })
}

/** 添加旅程日志 */
export function addJourneyLog(params: AddJourneyLogParams) {
  return http.post<AddJourneyLogResponse>('/api/baby/journey-logs', { ...params })
}

/** 添加餐食项 */
export function addMenu(params: AddMenuParams) {
  return http.post<AddMenuResponse>('/api/baby/menu', { ...params })
}
