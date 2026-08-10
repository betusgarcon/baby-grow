import { PropsWithChildren, useEffect, useState } from 'react'
import Taro from '@tarojs/taro'
import { View, Text, Image, ScrollView } from '@tarojs/components'
import BottomTabBar from '@/components/BottomTabBar'
import type {
  AnalysisCategoryKey,
  AnalysisSubtabKey,
  BabyProfileSummary,
} from '@/types/analysis'
import { handleBottomTabNavigation, navigateToAnalysisPage } from '@/utils/analysisNavigation'
import SegmentedTabs from './SegmentedTabs'
import { analysisColors } from './analysisTokens'

interface AnalysisLayoutProps extends PropsWithChildren {
  profile: BabyProfileSummary
  activeCategory: AnalysisCategoryKey
  activeSubtab?: AnalysisSubtabKey
  subtabOptions?: Array<{ key: AnalysisSubtabKey; label: string }>
}

const categoryConfigs: Array<{
  key: AnalysisCategoryKey
  label: string
  icon: string
}> = [
  {
    key: 'growth',
    label: 'Grow',
    icon: '↗',
  },
  {
    key: 'sleep',
    label: 'Sleep',
    icon: '☾',
  },
  {
    key: 'diet',
    label: 'Diet',
    icon: '⌇',
  },
  {
    key: 'mood',
    label: 'Mood',
    icon: '☺',
  },
]

export default function AnalysisLayout({
  profile,
  activeCategory,
  activeSubtab,
  subtabOptions,
  children,
}: AnalysisLayoutProps) {
  // 小程序的胶囊按钮位置会影响“可安全显示的头部宽度”。
  // 这里先读取系统信息，再反推出当前设备最合适的顶部高度和右侧留白。
  const [navInfo, setNavInfo] = useState({
    statusBarHeight: 20,
    navBarHeight: 44,
    totalHeight: 64,
    capsuleRight: 16,
  })

  useEffect(() => {
    try {
      const sysInfo = Taro.getSystemInfoSync()
      const menuButton = Taro.getMenuButtonBoundingClientRect()

      // 微信右上角胶囊的位置是动态的。
      // 这里通过系统信息 + 胶囊按钮位置反推 header 可用空间，
      // 避免标题和右上角原生按钮发生遮挡。
      const statusBarHeight = sysInfo.statusBarHeight || 20
      const navBarHeight = (menuButton.top - statusBarHeight) * 2 + menuButton.height

      setNavInfo({
        statusBarHeight,
        navBarHeight,
        totalHeight: statusBarHeight + navBarHeight,
        capsuleRight: sysInfo.windowWidth - menuButton.left + 16,
      })
    } catch (error) {
      console.error('获取分析页头部尺寸失败', error)
    }
  }, [])

  return (
    <View className="w-screen h-screen bg-surface overflow-hidden flex flex-col">
      <View
        className="w-full shrink-0 z-20 box-border"
        style={{ backgroundColor: 'rgba(255, 248, 241, 0.95)', paddingTop: `${navInfo.statusBarHeight + 6}px` }}
      >
        <View
          className="w-full px-5 flex justify-between items-center box-border"
          style={{
            height: `${navInfo.navBarHeight}px`,
            // 右侧额外 padding 是为了给微信原生胶囊预留操作空间。
            paddingRight: `${navInfo.capsuleRight}px`,
          }}
        >
          <View className="flex items-center gap-3">
            {/* 头像容器本身就是裁切层。
                年龄条虽然故意做得比头像更宽，但会被圆形容器裁掉，
                最终形成“头像底部半透明遮罩”的设计效果。 */}
            <View className="relative w-11 h-11 rounded-full overflow-hidden">
              <Image
                className="w-11 h-11 rounded-full object-cover bg-stone-200"
                src={profile.avatar}
              />
              <View
                className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center"
                style={{
                  width: '72px',
                  height: '16px',
                  bottom: '1px',
                  backgroundColor: 'rgba(71, 85, 105, 0.56)',
                }}
              >
                <Text className="block text-center text-sm leading-[14px] text-white font-medium">
                  {profile.ageLabel}
                </Text>
              </View>
            </View>

            <Text className="text-[36px] leading-8 font-semibold text-slate-600">
              {profile.name}
            </Text>
          </View>

        </View>

        <View className="px-4 pt-3 pb-3 flex items-center justify-center gap-2">
          {categoryConfigs.map((category) => {
            const isActive = category.key === activeCategory

            return (
              <View
                key={category.key}
                className="flex-1 h-11 rounded-full flex items-center justify-center gap-1.5"
                style={{
                  backgroundColor: isActive ? analysisColors.activeBg : analysisColors.inactiveBg,
                  color: isActive ? analysisColors.activeText : analysisColors.inactiveText,
                }}
                // 主 tab 只负责类目跳转，不直接操心页面内容。
                onClick={() => navigateToAnalysisPage(category.key)}
              >
                <Text className="text-sm">{category.icon}</Text>
                <Text className={`text-base leading-6 ${isActive ? 'font-semibold' : 'font-normal'}`}>
                  {category.label}
                </Text>
              </View>
            )
          })}
        </View>
      </View>

      <ScrollView scrollY className="flex-1 h-0" showScrollbar={false} enhanced>
        <View className="px-4 pt-2 pb-28 flex flex-col gap-2">
          {subtabOptions?.length ? (
            // 子 tab 和主 tab 拆开渲染，这样 growth/sleep/diet 这类页面
            // 可以在不影响顶部结构的前提下自由扩展二级切换。
            <SegmentedTabs
              items={subtabOptions}
              activeKey={activeSubtab as AnalysisSubtabKey}
              onChange={navigateToAnalysisPage}
              size="sm"
            />
          ) : null}

          {children}
        </View>
      </ScrollView>

      <View className="shrink-0 z-20">
        <BottomTabBar activeKey="analysis" onTabChange={handleBottomTabNavigation} />
      </View>
    </View>
  )
}
