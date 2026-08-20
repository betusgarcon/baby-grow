import { View, Text } from '@tarojs/components'
import Icon from '@/components/Icon'

interface BottomTabBarProps {
  activeKey: string
  onTabChange: (key: string) => void
}

// 1. 将 4 个 Tab 拆分为左右两组，为中间的悬浮按钮留出空间
const leftTabs = [
  { key: 'journey', label: 'Journey', icon: 'auto_stories' },
  { key: 'analysis', label: 'Analysis', icon: 'analytics' },
]

const rightTabs = [
  { key: 'wishes', label: 'Wishes', icon: 'auto_awesome' },
  { key: 'family', label: 'Family', icon: 'group' },
]

export default function BottomTabBar({ activeKey, onTabChange }: BottomTabBarProps) {
  // 渲染单个 Tab Item
  const renderTab = (tab: { key: string; label: string }) => {
    const isActive = activeKey === tab.key
    // 动态拼接 icon 名称，比如 "journey-active" 或 "journey-inactive"
    const iconName = `${tab.key}-${isActive ? 'active' : 'inactive'}`
    return (
      <View
        key={tab.key}
        className={`flex flex-col items-center gap-1 ${
          isActive ? 'text-neutral-800 font-bold' : 'text-neutral-400 font-normal'
        } text-xs`}
        onClick={() => onTabChange(tab.key)}
      >
        <Icon name={iconName} className="w-5 h-5" />
        <Text className="text-xs">{tab.label}</Text>
      </View>
    )
  }

  return (
    // 2. 外层使用 fixed 定位吸底，并使用 pb-[env(safe-area-inset-bottom)] 适配 iPhone 底部安全区
    <View className="w-full fixed bottom-0 left-0 z-50 bg-white border-t border-stone-100 pb-[env(safe-area-inset-bottom)]">
      
      {/* 3. 内容展示容器：固定 64px (h-16)，左右两侧使用 gap-8 隔开 */}
      <View className="w-full h-16 px-6 flex justify-between items-center relative">
        
        {/* 左侧 2 个菜单 */}
        <View className="flex items-center gap-8">
          {leftTabs.map(renderTab)}
        </View>

        {/* 右侧 2 个菜单 */}
        <View className="flex items-center gap-8">
          {rightTabs.map(renderTab)}
        </View>

        {/* 中间悬浮加号按钮：使用明确的 w-12 h-12 宽高，避免 padding 挤压变形 */}
        <View
          className="absolute left-1/2 -translate-x-1/2 -top-5 w-12 h-12 bg-[#406651] rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform"
          onClick={() => onTabChange('add')}
        >
          <Icon name="record" className="w-6 h-6" />
        </View>
      </View>
    </View>
  )
}
