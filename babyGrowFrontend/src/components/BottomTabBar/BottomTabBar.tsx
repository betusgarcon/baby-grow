import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import Icon from '@/components/Icon'
import RecordSheet from '@/components/RecordSheet'
import { t, type MessageKey } from '@/i18n'

interface BottomTabBarProps {
  activeKey: string
  onTabChange: (key: string) => void
}

// 1. 将 4 个 Tab 拆分为左右两组，为中间的悬浮按钮留出空间。
// 图标名由 key 派生（`${key}-active`），所以这里不再存 icon 字段——原先那几个
// `auto_stories` / `analytics` 从未被读取，是死数据。
const leftTabs = [
  { key: 'journey', labelKey: 'tab.journey' as const },
  { key: 'analysis', labelKey: 'tab.analysis' as const },
]

const rightTabs = [
  { key: 'wishes', labelKey: 'tab.wishes' as const },
  { key: 'family', labelKey: 'tab.family' as const },
]

export default function BottomTabBar({ activeKey, onTabChange }: BottomTabBarProps) {
  /** 记录弹层由 TabBar 自己持有：加号长在这里，各页面不必各接一次 */
  const [recordOpen, setRecordOpen] = useState(false)

  // 渲染单个 Tab Item
  const renderTab = (tab: { key: string; labelKey: MessageKey }) => {
    const isActive = activeKey === tab.key
    // 动态拼接 icon 名称，比如 "journey-active" 或 "journey-inactive"
    const iconName = `${tab.key}-${isActive ? 'active' : 'inactive'}`
    return (
      <View
        key={tab.key}
        className={`flex flex-col items-center gap-1 ${
          isActive ? 'text-on-surface font-semibold' : 'text-on-surface-variant font-normal'
        } text-xs`}
        onClick={() => onTabChange(tab.key)}
      >
        <Icon name={iconName} className="w-5 h-5" />
        <Text className="text-xs">{t(tab.labelKey)}</Text>
      </View>
    )
  }

  return (
    <>
      {/* 2. 外层使用 fixed 定位吸底，并使用 pb-[env(safe-area-inset-bottom)] 适配 iPhone 底部安全区 */}
      <View className="w-full fixed bottom-0 left-0 z-50 bg-white border-t border-stone-100 pb-[env(safe-area-inset-bottom)]">

        {/*
          四等分列，中间留出悬浮按钮的位置。
          之前是「左右两组 + justify-between」：每组内部 gap-8，两组贴住屏幕两侧，
          结果是外侧两项挤在边缘、中间空出一大块；英文标签变长时右侧还会被裁掉。
          用 flex-1 让四个 tab 各自占一列，间距随屏宽自适应。
        */}
        <View className="w-full h-16 px-4 flex items-center relative">
          <View className="flex-1 flex justify-center">{renderTab(leftTabs[0])}</View>
          <View className="flex-1 flex justify-center">{renderTab(leftTabs[1])}</View>

          {/* 悬浮按钮的占位：不参与点击，只负责把中间两列推开 */}
          <View className="w-14 h-full shrink-0" />

          <View className="flex-1 flex justify-center">{renderTab(rightTabs[0])}</View>
          <View className="flex-1 flex justify-center">{renderTab(rightTabs[1])}</View>

          {/* 中间悬浮加号按钮：使用明确的 w-12 h-12 宽高，避免 padding 挤压变形 */}
          <View
            className="absolute left-1/2 -translate-x-1/2 -top-5 w-12 h-12 bg-[#406651] rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform"
            onClick={() => setRecordOpen(true)}
          >
            <Icon name="record" className="w-6 h-6" />
          </View>
        </View>
      </View>

      {/* 挂在 TabBar 之外，避免被 fixed 父级的层叠上下文限制住 */}
      <RecordSheet visible={recordOpen} onClose={() => setRecordOpen(false)} />
    </>
  )
}
