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
  ]

  allRoutes.forEach(({ path, handler }) => {
    registerMock(path, handler)
  })

  console.log(`[MOCK] Initialized ${allRoutes.length} mock routes`)
}
