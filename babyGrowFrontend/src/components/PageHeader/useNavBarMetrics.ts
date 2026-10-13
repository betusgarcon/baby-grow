import { useEffect, useState } from 'react'
import Taro from '@tarojs/taro'

export interface NavBarMetrics {
  statusBarHeight: number
  navBarHeight: number
  /** 状态栏 + 导航栏的总高度 */
  totalHeight: number
  /** 微信右上角胶囊占用的右侧宽度，头部右侧要让出这么多，否则会被胶囊压住 */
  capsuleRight: number
}

/**
 * 胶囊本体宽约 87px，右边缘再内缩 7px，所以从屏幕右边算起它占掉约 94px。
 * 这是「必须让开」的最小量，不是「胶囊宽度」。
 */
const CAPSULE_CLEARANCE = 94
/** 图标与胶囊之间留的视觉间距 */
const CAPSULE_GAP = 14
const SAFE_CAPSULE_RIGHT = CAPSULE_CLEARANCE + CAPSULE_GAP

const DEFAULT_METRICS: NavBarMetrics = {
  statusBarHeight: 20,
  navBarHeight: 44,
  totalHeight: 64,
  // 兜底值必须「够大」而不是「够小」：偏大只是留白多一点，偏小会让右上角图标直接被
  // 胶囊盖住——而胶囊是原生层，盖住之后点击也一并被它吃掉。宁可保守。
  capsuleRight: SAFE_CAPSULE_RIGHT,
}

/**
 * 微信右上角胶囊的位置随机型变化，头部高度和右侧留白都要据此反推。
 *
 * 拿不到胶囊信息时退回 DEFAULT_METRICS。除了 try/catch，还要校验取值是否合理：
 * H5 端 getMenuButtonBoundingClientRect() 会返回全零，直接换算会得出
 * 「右侧留白比屏幕还宽」这种把整行挤没的结果。
 */
export function useNavBarMetrics(): NavBarMetrics {
  const [metrics, setMetrics] = useState(DEFAULT_METRICS)

  useEffect(() => {
    try {
      const sysInfo = Taro.getSystemInfoSync()
      const menuButton = Taro.getMenuButtonBoundingClientRect()

      const usable =
        menuButton.height > 0 &&
        menuButton.left > 0 &&
        sysInfo.windowWidth > menuButton.left &&
        menuButton.top >= (sysInfo.statusBarHeight || 0)

      if (!usable) return

      const statusBarHeight = sysInfo.statusBarHeight || DEFAULT_METRICS.statusBarHeight
      const navBarHeight = (menuButton.top - statusBarHeight) * 2 + menuButton.height

      // 再兜一层：即便量出来的值偏小（少数机型/基础库会返回异常值），也不允许小于安全宽度，
      // 否则右上角图标又会被胶囊压住
      const measured = sysInfo.windowWidth - menuButton.left
      const clearance = Math.max(measured, CAPSULE_CLEARANCE) + CAPSULE_GAP

      setMetrics({
        statusBarHeight,
        navBarHeight,
        totalHeight: statusBarHeight + navBarHeight,
        capsuleRight: clearance,
      })
    } catch (error) {
      console.error('获取导航栏尺寸失败', error)
    }
  }, [])

  return metrics
}
