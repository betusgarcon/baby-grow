import type { ReactNode } from 'react'
import { Text, View } from '@tarojs/components'
import { analysisColors } from './analysisTokens'

interface SegmentedTabItem<T extends string> {
  key: T
  label: string
}

interface SegmentedTabsProps<T extends string> {
  items: Array<SegmentedTabItem<T>>
  activeKey: T
  onChange: (key: T) => void
  size?: 'sm' | 'md'
  renderItem?: (item: SegmentedTabItem<T>, isActive: boolean) => ReactNode
}

/**
 * SegmentedTabs
 *
 * 这是 analysis 模块的通用分段切换组件。
 * 它适合处理“同一块内容里的多个视图切换”，例如：
 * - growth 页的 Last 3M / Last 6M / Since Birth
 * - sleep / diet 页的子 tab
 */
export default function SegmentedTabs<T extends string>({
  items,
  activeKey,
  onChange,
  size = 'md',
  renderItem,
}: SegmentedTabsProps<T>) {
  // 不同场景只需要调 size，就能复用同一套交互。
  // 例如顶部子 tab 用 sm，内容切换 tab 用 md。
  const minHeightClass = size === 'sm' ? 'min-h-10' : 'min-h-12'
  const labelClass = size === 'sm' ? 'text-sm' : 'text-base'

  return (
    <View
      className="w-full rounded-[28px] p-1 flex items-center"
      style={{ backgroundColor: analysisColors.inactiveBg }}
    >
      {items.map((item) => {
        const isActive = item.key === activeKey

        return (
          <View
            key={item.key}
            className={`flex-1 ${minHeightClass} rounded-[20px] px-4 flex items-center justify-center`}
            style={{
              backgroundColor: isActive ? analysisColors.activeBg : 'transparent',
            }}
            // 点击时只把 key 往外抛，真正如何切换数据或跳页由父组件决定。
            onClick={() => onChange(item.key)}
          >
            {renderItem ? (
              renderItem(item, isActive)
            ) : (
              <Text
                className={`${labelClass} text-center font-semibold`}
                style={{
                  color: isActive ? analysisColors.activeText : analysisColors.inactiveText,
                }}
              >
                {item.label}
              </Text>
            )}
          </View>
        )
      })}
    </View>
  )
}
