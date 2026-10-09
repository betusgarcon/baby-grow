import type { ReactNode } from 'react'
import { View, Text } from '@tarojs/components'
import Icon from '@/components/Icon'
import { navigateBack } from '@/utils/routes'
import { useNavBarMetrics } from './useNavBarMetrics'

interface PageHeaderProps {
  /** 标题。showBack 且 titleAlign 为 center 时按三等分布局自动居中，不需要绝对定位 */
  title?: string
  /** 显示返回键，走 navigateBack（栈内无上一页时退回旅程首页） */
  showBack?: boolean
  /**
   * 标题对齐。旅程各页是居中标题，事件详情页是紧挨返回键的左对齐标题，
   * 设计稿里两种都存在，所以做成选项而不是二选一。
   */
  titleAlign?: 'center' | 'start'
  /** 标题下的小字，如每周小记的日期区间 */
  subtitle?: string
  /** 左侧自定义内容，用于首页那类「头像 + 宝宝名」的头部 */
  leading?: ReactNode
  /** 右侧操作区，会自动让开微信胶囊 */
  right?: ReactNode
  /** 主导航行下方的附加区域，例如分类 tab、子 tab */
  below?: ReactNode
  /** 头部半透明，让下方滚动内容微微透出 */
  translucent?: boolean
}

export default function PageHeader({
  title,
  showBack = false,
  titleAlign = 'center',
  subtitle,
  leading,
  right,
  below,
  translucent = false,
}: PageHeaderProps) {
  const { statusBarHeight, navBarHeight, capsuleRight } = useNavBarMetrics()

  const backButton = (
    <View className="w-9 h-9 -ml-2 shrink-0 flex items-center justify-center" onClick={navigateBack}>
      <Icon name="back" className="w-5 h-5" />
    </View>
  )

  return (
    <View
      className="w-full shrink-0 z-20 box-border"
      style={{
        paddingTop: `${statusBarHeight + 6}px`,
        backgroundColor: translucent ? 'rgba(255, 248, 241, 0.95)' : '#fff8f1',
      }}
    >
      <View
        className="w-full px-5 flex items-center box-border"
        style={{
          height: `${navBarHeight}px`,
          // 只有右侧真有内容时才给微信胶囊让位。
          // 无条件留白会把整行压窄，居中标题跟着偏左——这正是之前几个页面
          // 标题看着没居中的原因。
          paddingRight: right ? `${capsuleRight}px` : undefined,
        }}
      >
        {showBack && titleAlign === 'center' ? (
          // 左右两个等宽槽位保证标题真正居中，避免用 absolute 摆标题
          <>
            <View className="w-16 flex items-center">{backButton}</View>
            <View className="flex-1 flex flex-col items-center">
              <Text className="text-headline-md font-bold text-secondary truncate">{title}</Text>
              {subtitle ? (
                <Text className="text-caption text-on-surface-variant">{subtitle}</Text>
              ) : null}
            </View>
            <View className="w-16 flex items-center justify-end">{right}</View>
          </>
        ) : (
          <>
            {showBack ? backButton : null}
            {leading ? <View className="shrink-0 flex items-center gap-2">{leading}</View> : null}

            {title ? (
              <Text
                className={`flex-1 min-w-0 truncate text-2xl font-semibold text-on-surface ${
                  titleAlign === 'center' ? 'text-center' : ''
                }`}
              >
                {title}
              </Text>
            ) : (
              <View className="flex-1" />
            )}

            {right ? <View className="shrink-0 flex items-center">{right}</View> : null}
          </>
        )}
      </View>

      {below}
    </View>
  )
}
