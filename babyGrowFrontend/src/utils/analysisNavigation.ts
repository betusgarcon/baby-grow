import Taro from '@tarojs/taro'
import type { AnalysisCategoryKey, AnalysisSubtabKey } from '@/types/analysis'
import {
  navigateToRoute,
  switchTabRoute,
  tabRouteMap,
  type RouteId,
} from '@/utils/routes'

/**
 * 分析模块的主 tab / 子 tab key → 全站路由 id。
 * 这样分析页组件只需要抛出 key，不用自己维护一堆硬编码路径。
 */
const analysisRouteIdMap: Record<AnalysisCategoryKey | AnalysisSubtabKey, RouteId> = {
  growth: 'data-growth',
  sleep: 'data-sleep-day',
  diet: 'data-diet-week',
  mood: 'data-mood',
  sleepDaily: 'data-sleep-day',
  sleepMonthly: 'data-sleep-month',
  dietWeek: 'data-diet-week',
  dietMonth: 'data-diet-month',
}

export const navigateToAnalysisPage = (key: AnalysisCategoryKey | AnalysisSubtabKey) => {
  switchTabRoute(analysisRouteIdMap[key])
}

/**
 * 底部 TabBar 的点击处理。
 * 四个常规 tab 走路由替换；中间加号按钮不经过这里——记录弹层由
 * BottomTabBar 自己持有并打开，所以不会以 'add' 回调上来。
 */
export const handleBottomTabNavigation = (key: string) => {
  const routeId = tabRouteMap[key]

  if (!routeId) {
    Taro.showToast({ title: '该模块待补充', icon: 'none' })
    return
  }

  switchTabRoute(routeId)
}

export { navigateToRoute }
