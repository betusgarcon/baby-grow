/**
 * 情绪分析 API
 * 页面只调用这些函数，不直接访问 mock
 */

import { http } from '@/api/request'
import type {
  GetMoodCalendarResponse,
  GetMoodCheckinOptionsResponse,
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

// 这里原本还有 moodCheckin / getMoodJournal 两个函数，指向
// /api/baby/mood/checkin 与 /api/baby/mood/journal——后端都没有（AnalysisController
// 里 mood 只有 calendar 与 checkin-options 两个 GET）。前端还有一个「同步到 AI 情绪日历」
// 的按钮看着像在调用它们，实际只改本地状态。两者都已移除，等后端补上端点再接。
