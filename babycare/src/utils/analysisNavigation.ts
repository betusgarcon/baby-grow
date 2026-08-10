import Taro from '@tarojs/taro'
import type { AnalysisCategoryKey, AnalysisSubtabKey } from '@/types/analysis'

export const analysisRouteMap: Record<AnalysisCategoryKey | AnalysisSubtabKey, string> = {
  growth: '/pages/analysis/growth/index',
  sleep: '/pages/analysis/sleep-daily/index',
  diet: '/pages/analysis/diet-week/index',
  mood: '/pages/analysis/mood/index',
  sleepDaily: '/pages/analysis/sleep-daily/index',
  sleepMonthly: '/pages/analysis/sleep-monthly/index',
  dietWeek: '/pages/analysis/diet-week/index',
  dietMonth: '/pages/analysis/diet-month/index',
}

export const navigateToAnalysisPage = (key: AnalysisCategoryKey | AnalysisSubtabKey) => {
  /**
   * 根据分析模块的主 tab / 子 tab key，跳转到对应页面。
   * 这样页面组件只需要抛出 key，不用自己维护一堆硬编码路径。
   */
  const url = analysisRouteMap[key]

  if (!url) return

  Taro.redirectTo({ url })
}

export const handleBottomTabNavigation = (key: string) => {
  /**
   * 处理底部 tabbar 的点击行为。
   * analysis / journey 会执行页面跳转，其他暂未实现的入口先给出 toast 占位。
   */
  if (key === 'analysis') {
    Taro.redirectTo({ url: '/pages/analysis/growth/index' })
    return
  }

  if (key === 'add') {
    Taro.showToast({ title: '记录入口待补充', icon: 'none' })
    return
  }

  if (key === 'journey') {
    Taro.redirectTo({ url: '/pages/journey/index' })
    return
  }

  Taro.showToast({ title: '该模块待补充', icon: 'none' })
}
