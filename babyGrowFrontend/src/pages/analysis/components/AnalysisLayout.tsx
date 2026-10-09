import type { PropsWithChildren } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import BottomTabBar from '@/components/BottomTabBar'
import PageHeader from '@/components/PageHeader'
import Icon from '@/components/Icon'
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
  subtabOptions?: Array<{ key: AnalysisSubtabKey; label: string; iconActive?: string; iconInactive?: string }>
}

const categoryConfigs: Array<{
  key: AnalysisCategoryKey
  label: string
  icon: string
  iconInactive: string
}> = [
  {
    key: 'growth',
    label: 'Grow',
    icon: 'tab-grow-active',
    iconInactive: 'tab-grow-inactive',
  },
  {
    key: 'sleep',
    label: 'Sleep',
    icon: 'tab-sleep-active',
    iconInactive: 'tab-sleep-inactive',
  },
  {
    key: 'diet',
    label: 'Diet',
    icon: 'tab-diet-active',
    iconInactive: 'tab-diet-inactive',
  },
  {
    key: 'mood',
    label: 'Mood',
    icon: 'tab-mood-active',
    iconInactive: 'tab-mood-inactive',
  },
]

export default function AnalysisLayout({
  profile,
  activeCategory,
  activeSubtab,
  subtabOptions,
  children,
}: AnalysisLayoutProps) {
  return (
    <View className="w-screen h-screen bg-surface overflow-hidden flex flex-col">
      {/* 头部改由公共 PageHeader 承担：头像 + 年龄徽章的样式原先只写死在这里，
          导致其余页面各写各的。收敛之后全站头部只有一处实现。 */}
      <PageHeader
        translucent
        title={profile.name}
        profile={{ avatar: profile.avatar, ageLabel: profile.ageLabel }}
        below={
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
                  <Icon
                    name={isActive ? category.icon : category.iconInactive}
                    className="w-4 h-4"
                    style={!isActive ? { opacity: 0.5 } : undefined}
                  />
                  <Text className={`text-base leading-6 ${isActive ? 'font-semibold' : 'font-normal'}`}>
                    {category.label}
                  </Text>
                </View>
              )
            })}
          </View>
        }
      />

      <ScrollView scrollY className="flex-1 h-0 pb-[140px] box-border" showScrollbar={false} enhanced>
        <View className="px-4 pt-2 pb-[140px] flex flex-col gap-2">
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
