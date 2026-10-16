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
  /** 该宝宝有没有情绪记录（不限本月）。false 时显示空态而不是一张全空日历 */
  hasData: boolean
}

/** 获取情绪打卡选项响应 */
export interface GetMoodCheckinOptionsResponse {
  options: MoodCheckinOption[]
}

/**
 * 情绪打卡请求。
 *
 * 刻意**没有 babyId**：宝宝由服务端从登录态解析。此前这里留着一个 babyId 字段，
 * 是 mock 时代的形状，与真实接口不符——收下它就得再校验归属，不如不收。
 */
export interface MoodCheckinParams {
  mood: 'happy' | 'clingy' | 'discomfort'
  /** 补记过去某天时传 YYYY-MM-DD；缺省为今天 */
  date?: string
  note?: string
}

/** 情绪打卡响应：落到哪一天、哪一档。前端据此刷新日历 */
export interface MoodCheckinResponse {
  date: string
  mood: string
}
