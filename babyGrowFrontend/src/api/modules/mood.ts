/**
 * 情绪分析 API
 * 页面只调用这些函数，不直接访问 mock
 */

import { http } from '@/api/request'
import type {
  GetMoodCalendarResponse,
  GetMoodCheckinOptionsResponse,
  MoodCheckinResponse,
  MoodCheckinParams,
  GetMoodJournalResponse,
  GetMoodJournalParams,
} from '@/types/mood'

/**
 * 获取情绪日历数据。
 *
 * year / month 必须给具体值。此前调用方一个都没传，`undefined` 被序列化进 query
 * （`?year=undefined&month=undefined`），后端按 Integer 绑定失败直接 400，整页空白。
 * 这里兜底成当月，调用方即使漏传也不会再把页面打挂。
 */
export function getMoodCalendar(year?: number, month?: number) {
  const now = new Date()
  return http.get<GetMoodCalendarResponse>('/api/baby/mood/calendar', {
    year: year ?? now.getFullYear(),
    month: month ?? now.getMonth() + 1,
  })
}

/** 获取情绪打卡选项 */
export function getMoodCheckinOptions() {
  return http.get<GetMoodCheckinOptionsResponse>('/api/baby/mood/checkin-options')
}

/** 情绪打卡 */
export function moodCheckin(params: MoodCheckinParams) {
  return http.post<MoodCheckinResponse>('/api/baby/mood/checkin', { ...params })
}

/** 获取情绪手账 */
export function getMoodJournal(params: GetMoodJournalParams) {
  return http.get<GetMoodJournalResponse>('/api/baby/mood/journal', { ...params })
}
