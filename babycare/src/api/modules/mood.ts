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

/** 获取情绪日历数据 */
export function getMoodCalendar(babyId: string, year?: number, month?: number) {
  return http.get<GetMoodCalendarResponse>('/api/baby/mood/calendar', {
    babyId,
    year,
    month,
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
