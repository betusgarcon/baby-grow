/**
 * 情绪分析相关类型
 * MoodPage 使用的数据结构
 */

/** 情绪类型 */
export type MoodType = 'happy' | 'clingy' | 'discomfort' | 'empty'

/** 日历天项 */
export interface MoodCalendarDay {
  day: number
  type: MoodType
  highlighted?: boolean
}

/** 情绪图例项 */
export interface MoodLegendItem {
  label: string
  colorClass: string
}

/** 情绪打卡选项 */
export interface MoodCheckinOption {
  key: 'happy' | 'clingy' | 'discomfort'
  label: string
  emoji: string
  icon: string
  activeColor: string
  activeBg: string
  inactiveBg: string
}

/** 获取情绪日历请求参数 */
export interface GetMoodCalendarParams {
  babyId: string
  year?: number
  month?: number
}

/** 获取情绪日历响应 */
export interface GetMoodCalendarResponse {
  days: MoodCalendarDay[]
  legends: MoodLegendItem[]
  insight: {
    title: string
    content: string
  }
}

/** 获取情绪打卡选项响应 */
export interface GetMoodCheckinOptionsResponse {
  options: MoodCheckinOption[]
}

/** 情绪打卡请求 */
export interface MoodCheckinParams {
  babyId: string
  mood: 'happy' | 'clingy' | 'discomfort'
  note?: string
}

/** 情绪打卡响应 */
export interface MoodCheckinResponse {
  id: string
  mood: string
  note?: string
  createdAt: string
}

/** 获取情绪手账请求参数 */
export interface GetMoodJournalParams {
  babyId: string
  date?: string
}

/** 获取情绪手账响应 */
export interface GetMoodJournalResponse {
  date: string
  moodTag: string
  entries: Array<{
    id: string
    title: string
    content: string
    createdAt: string
  }>
}
