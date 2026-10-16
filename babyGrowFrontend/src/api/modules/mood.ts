/**
 * 情绪分析 API
 * 页面只调用这些函数，不直接访问 mock
 */

import { http } from '@/api/request'
import type {
  GetMoodCalendarResponse,
  GetMoodCheckinOptionsResponse,
  MoodCheckinParams,
  MoodCheckinResponse,
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

/**
 * 情绪打卡。
 *
 * 后端 `POST /api/baby/mood/checkin` 会写一条 mood_entries；宝宝由服务端从登录态解析，
 * 所以参数里没有 babyId。
 */
export function moodCheckin(params: MoodCheckinParams) {
  return http.post<MoodCheckinResponse>('/api/baby/mood/checkin', { ...params })
}

// 这里原先还有 moodCheckin / getMoodJournal 两个函数，指向
// /api/baby/mood/checkin 与 /api/baby/mood/journal——后者后端从来没有过
// （AnalysisController 里 mood 只有 calendar 与 checkin-options），已随类型一并删除。
// checkin 现在有真实端点，所以按上面的真实契约重新接上。
