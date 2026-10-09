import type { ReactNode } from 'react'
import { View, Text } from '@tarojs/components'
import Icon from '@/components/Icon'
import { navigateBack } from '@/utils/routes'
import { useNavBarMetrics } from './useNavBarMetrics'
import ProfileAvatar from './ProfileAvatar'

interface PageHeaderProps {
  /** 标题。默认居中，与全站统一 */
  title?: string
  /** 显示返回键，走 navigateBack（栈内无上一页时退回旅程首页） */
  showBack?: boolean
  /**
   * 宝宝头像 + 年龄徽章。tab 根页面用它替代返回键。
   * 年龄徽章压在头像圆内下沿，由圆形裁切出「底部半透明遮罩」的效果——
   * 这套样式原先只写死在分析模块里，现在收敛到这里供全站复用。
   */
  profile?: { avatar: string; ageLabel: string }
  /**
   * 标题对齐。默认居中；个别页面需要紧挨返回键的左对齐标题时才传 start。
   */
  titleAlign?: 'center' | 'start'
  /** 标题下的小字，如每周小记的日期区间 */
  subtitle?: string
  /** 左侧自定义内容，profile 覆盖不了时用 */
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
  profile,
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

  const profileAvatar = profile ? (
    <ProfileAvatar avatar={profile.avatar} ageLabel={profile.ageLabel} />
  ) : null

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
          // 无条件留白会把整行压窄，居中标题跟着偏左。
          paddingRight: right ? `${capsuleRight}px` : undefined,
        }}
      >
        {titleAlign === 'center' ? (
          // 左右两个等宽槽位保证标题真正居中，避免用 absolute 摆标题
          <>
            <View className="w-16 flex items-center">{showBack ? backButton : profileAvatar}</View>

            <View className="flex-1 flex flex-col items-center">
              <Text className="text-2xl font-semibold text-slate-600 truncate">{title}</Text>
              {subtitle ? (
                <Text className="text-caption text-on-surface-variant">{subtitle}</Text>
              ) : null}
            </View>

            <View className="w-16 flex items-center justify-end">{right}</View>
          </>
        ) : (
          <>
            <View className="flex-1 flex items-center gap-3 min-w-0">
              {showBack ? backButton : null}
              {profileAvatar}
              {leading}
              {title ? (
                <Text className="text-2xl font-semibold text-slate-600 truncate">{title}</Text>
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
