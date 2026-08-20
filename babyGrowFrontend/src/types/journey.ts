/**
 * 首页/旅程相关类型
 * JourneyPage 使用的数据结构
 */

/** 里程碑项 */
export interface MilestoneRecord {
  id: number | string
  title: string
  date: string
  image: string
}

/** 旅程日志类型 */
export type JourneyLogType = 'feeding' | 'sleep' | 'diaper' | 'bath' | 'growth'

/** 旅程日志项 */
export interface JourneyLog {
  id: number | string
  type: JourneyLogType
  title: string
  time: string
  description?: string
  icon: string
  bgColor?: string
  iconColor?: string
  tags?: string[]
}

/** 餐食项 */
export interface MenuItem {
  id: number | string
  mealType: string
  title: string
  description: string
  bgColor?: string
  icon: string
}

/** 疫苗提醒 */
export interface VaccineReminder {
  id: string
  title: string
  date: string
  icon?: string
}

/** 周洞察 */
export interface WeeklyInsight {
  id: string
  title: string
  content: string
  icon?: string
}

/** 获取首页数据请求参数 */
export interface GetJourneyPageParams {
  babyId: string
  date?: string
}

/** 获取首页数据响应 */
export interface GetJourneyPageResponse {
  vaccineReminder: VaccineReminder | null
  weeklyInsight: WeeklyInsight | null
  recentMilestones: MilestoneRecord[]
  latestJourneyLogs: JourneyLog[]
  todayMenu: MenuItem[]
}

/** 添加里程碑请求 */
export interface AddMilestoneParams {
  babyId: string
  title: string
  date: string
  image?: string
}

/** 添加里程碑响应 */
export interface AddMilestoneResponse {
  milestone: MilestoneRecord
}

/** 添加旅程日志请求 */
export interface AddJourneyLogParams {
  babyId: string
  type: JourneyLogType
  title: string
  time: string
  description?: string
  tags?: string[]
}

/** 添加旅程日志响应 */
export interface AddJourneyLogResponse {
  log: JourneyLog
}

/** 添加餐食项请求 */
export interface AddMenuParams {
  babyId: string
  mealType: string
  title: string
  description: string
}

/** 添加餐食项响应 */
export interface AddMenuResponse {
  menu: MenuItem
}
