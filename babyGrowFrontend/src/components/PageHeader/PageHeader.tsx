import type { ReactNode } from 'react'
import { View, Text } from '@tarojs/components'
import Icon from '@/components/Icon'
import { navigateBack } from '@/utils/routes'
import { useNavBarMetrics } from './useNavBarMetrics'

interface PageHeaderProps {
  /** 居中标题。传了 showBack 时按三等分布局自动居中，不需要绝对定位 */
  title?: string
  /** 显示返回键，走 navigateBack（栈内无上一页时退回旅程首页） */
  showBack?: boolean
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
  leading,
  right,
  below,
  translucent = false,
}: PageHeaderProps) {
  const { statusBarHeight, navBarHeight, capsuleRight } = useNavBarMetrics()

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
        style={{ height: `${navBarHeight}px`, paddingRight: `${capsuleRight}px` }}
      >
        {showBack ? (
          // 左右两个等宽槽位保证标题真正居中，避免用 absolute 摆标题
          <>
            <View className="w-16 flex items-center">
              <View className="w-9 h-9 -ml-2 flex items-center justify-center" onClick={navigateBack}>
                <Icon name="back" className="w-5 h-5" />
              </View>
            </View>
            <Text className="flex-1 text-center text-headline-md font-bold text-secondary truncate">
              {title}
            </Text>
            <View className="w-16 flex items-center justify-end">{right}</View>
          </>
        ) : (
          <>
            <View className="flex-1 flex items-center gap-3 min-w-0">
              {leading}
              {title ? (
                <Text className="text-[24px] leading-8 font-semibold text-on-surface truncate">
                  {title}
                </Text>
              ) : null}
            </View>
            {right}
          </>
        )}
      </View>

      {below}
    </View>
  )
}
