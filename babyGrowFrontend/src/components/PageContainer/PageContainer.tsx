import { useEffect, useState, type ReactNode } from 'react'
import Taro from '@tarojs/taro'
import { View, ScrollView } from '@tarojs/components'

/** BottomTabBar 占用的固定高度（components/BottomTabBar 里的 h-16） */
export const TAB_BAR_HEIGHT = 64
/** 滚动内容与底部栏之间保留的呼吸间距 */
export const CONTENT_BOTTOM_GAP = 24
/** 没有底部栏时页面自身的底部留白 */
export const CONTENT_BOTTOM_PADDING = 32

interface PageContainerProps {
  /** 顶部区域，通常传 PageHeader。它参与文档流并自己占位，因此不需要为它补 padding */
  header?: ReactNode
  /** 底部栏，通常传 BottomTabBar。它自身是 fixed，页面据此为内容预留高度 */
  bottomBar?: ReactNode
  children: ReactNode
  /** 页面底色。默认暖白，多数页面如此；个别页面内容区为纯白时覆盖它 */
  background?: string
  className?: string
  contentClassName?: string
}

/**
 * 页面骨架：满屏纵向 flex，头部参与文档流，内容区独立滚动，底部栏吸底。
 *
 * 固定底部栏会盖住内容，所以内容区的高度补偿统一在这里算一次，
 * 不散落到各个 section 里。安全区从系统信息读，避免依赖小程序不一定支持的 env()。
 */
export default function PageContainer({
  header,
  bottomBar,
  children,
  background = 'bg-surface',
  className = '',
  contentClassName = '',
}: PageContainerProps) {
  const [safeAreaBottom, setSafeAreaBottom] = useState(0)

  useEffect(() => {
    try {
      const sysInfo = Taro.getSystemInfoSync()

      if (sysInfo.safeArea) {
        setSafeAreaBottom(sysInfo.screenHeight - sysInfo.safeArea.bottom)
      }
    } catch (error) {
      console.error('获取底部安全区失败', error)
    }
  }, [])

  const paddingBottom = bottomBar
    ? TAB_BAR_HEIGHT + safeAreaBottom + CONTENT_BOTTOM_GAP
    : CONTENT_BOTTOM_PADDING + safeAreaBottom

  return (
    <View className={`w-screen h-screen ${background} overflow-hidden flex flex-col ${className}`}>
      {header}

      <ScrollView scrollY className="flex-1 h-0 box-border" showScrollbar={false} enhanced>
        {/* 统一在这里留出与头部的间距。头部是紧贴内容区的，页面各补一次
            容易漏也容易重复，所以收敛到容器这一层。 */}
        <View
          className={`block px-margin-mobile pt-4 ${contentClassName}`}
          style={{ paddingBottom: `${paddingBottom}px` }}
        >
          {children}
        </View>
      </ScrollView>

      {bottomBar ? <View className="shrink-0 z-20">{bottomBar}</View> : null}
    </View>
  )
}
