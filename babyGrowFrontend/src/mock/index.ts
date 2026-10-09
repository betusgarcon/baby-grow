/**
 * Mock 数据入口
 * 注册所有 Mock 路由到 request.ts 的 mock 路由表
 */

import { registerMock } from '@/api/request'
import { aiMockRoutes } from './ai'
import { babyMockRoutes } from './baby'
import { dietMockRoutes } from './diet'
import { growthMockRoutes } from './growth'
import { journeyMockRoutes } from './journey'
import { moodMockRoutes } from './mood'
import { sleepMockRoutes } from './sleep'
import { timelineMockRoutes } from './timeline'
import { familyMockRoutes } from './family'
import { wishesMockRoutes } from './wishes'
import { profileMockRoutes } from './profile'
import { vaccineMockRoutes } from './vaccine'
import { milestonesMockRoutes } from './milestones'
import { calendarMockRoutes } from './calendar'
import { weeklyInsightMockRoutes } from './weeklyInsight'
import { memoriesMockRoutes } from './memories'

/**
 * 初始化所有 Mock 路由
 * 在应用启动时调用一次即可
 */
export function initMockRoutes() {
  const allRoutes = [
    ...babyMockRoutes,
    ...growthMockRoutes,
    ...sleepMockRoutes,
    ...dietMockRoutes,
    ...moodMockRoutes,
    ...journeyMockRoutes,
    ...aiMockRoutes,
    ...timelineMockRoutes,
    ...familyMockRoutes,
    ...wishesMockRoutes,
    ...profileMockRoutes,
    ...vaccineMockRoutes,
    ...milestonesMockRoutes,
    ...calendarMockRoutes,
    ...weeklyInsightMockRoutes,
    ...memoriesMockRoutes,
  ]

  allRoutes.forEach(({ path, handler }) => {
    registerMock(path, handler)
  })

  console.log(`[MOCK] Initialized ${allRoutes.length} mock routes`)
}
