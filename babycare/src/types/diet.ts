/**
 * 饮食分析相关类型
 * DietWeekPage / DietMonthPage 使用的数据结构
 */

/** 奶量柱状图项 */
export interface DietBarItem {
  label: string
  value: number
  highlighted?: boolean
}

/** 获取周奶量请求参数 */
export interface GetWeeklyDietParams {
  babyId: string
  weekStart?: string
}

/** 获取周奶量响应 */
export interface GetWeeklyDietResponse {
  bars: DietBarItem[]
  averageLabel: string
  standardLabel: string
  narrativeNote: string
  insight: {
    title: string
    content: string
  }
}

/** 饮食占比图例项 */
export interface DietRatioItem {
  label: string
  value: number
  colorClass: string
}

/** 获取月度饮食请求参数 */
export interface GetMonthlyDietParams {
  babyId: string
  month?: string
}

/** 获取月度饮食响应 */
export interface GetMonthlyDietResponse {
  title: string
  subtitle: string
  extra: string
  donut: {
    ratio: number
    title: string
    legends: DietRatioItem[]
  }
  ingredients: {
    title: string
    badge: string
    list: string[]
  }
  insight: {
    title: string
    content: string
  }
}

/** 添加食材请求 */
export interface AddIngredientParams {
  babyId: string
  ingredient: string
}

/** 添加食材响应 */
export interface AddIngredientResponse {
  ingredient: string
}
