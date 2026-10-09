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

const DEFAULT_METRICS: NavBarMetrics = {
  statusBarHeight: 20,
  navBarHeight: 44,
  totalHeight: 64,
  capsuleRight: 16,
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

      setMetrics({
        statusBarHeight,
        navBarHeight,
        totalHeight: statusBarHeight + navBarHeight,
        capsuleRight: sysInfo.windowWidth - menuButton.left + 16,
      })
    } catch (error) {
      console.error('获取导航栏尺寸失败', error)
    }
  }, [])

  return metrics
}
