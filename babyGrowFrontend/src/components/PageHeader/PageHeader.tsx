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
   *
   * 传了 `name` 就会在头像右侧把名字一起渲染出来（紧贴头像、整组靠左），
   * 此时不再渲染居中标题——因为那是「宝宝是谁」，不是「这是哪一页」。
   * 页面标题（Journey / Family 这类）才走居中。
   */
  profile?: { avatar: string; ageLabel: string; name?: string }
  /** 点头像的去向。多数页面是进宝宝画像 */
  onProfilePress?: () => void
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
  onProfilePress,
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
    <View onClick={onProfilePress}>
      {/*
        头像要比导航栏行矮一档。行高是照着微信胶囊算出来的（(胶囊top − 状态栏) × 2 + 胶囊高），
        典型值恰好也是 44。取满 44 会撑满整行、底部那枚年龄徽章贴死行底；减 4 后上下各留 2px，
        在不顶到行边界的前提下把头像放到最大。
      */}
      <ProfileAvatar
        avatar={profile.avatar}
        ageLabel={profile.ageLabel}
        size={Math.min(48, navBarHeight - 4)}
      />
    </View>
  ) : null

  // 名字靠左、页面标题居中，两者可以并存：名字回答「宝宝是谁」，
  // 居中那一位回答「这是哪一页」。此前有名字就把标题整个吞掉，
  // 于是分析页头像旁边一直空着一块。
  const showCenteredTitle = titleAlign === 'center' && Boolean(title)

  return (
    <View
      className="w-full shrink-0 z-20 box-border"
      style={{
        paddingTop: `${statusBarHeight + 6}px`,
        // 与页面底色同为白：卡片是暖色 #fff3ea，底部只有留白才不会把卡片的边界糊掉
        backgroundColor: translucent ? 'rgba(255, 255, 255, 0.92)' : '#ffffff',
      }}
    >
      <View
        className="w-full px-5 flex items-center box-border relative"
        style={{ height: `${navBarHeight}px` }}
      >
        {/* 左区：返回键 / 头像（可能带名字） / 自定义内容 / 左对齐的标题 */}
        <View className="flex-1 min-w-0 flex items-center gap-3">
          {showBack ? backButton : null}
          {profileAvatar}
          {profile?.name ? (
            <Text className="text-section-title text-on-surface truncate">{profile.name}</Text>
          ) : null}
          {leading}
          {!showCenteredTitle && title ? (
            <Text className="text-page-title text-on-surface truncate">{title}</Text>
          ) : null}
        </View>

        {/*
          右侧要让开微信胶囊。父容器只有 px-5 的 20px，这里再补 (capsuleRight − 20)
          把它推到胶囊左侧。

          刻意用 margin 而不是给父容器加 padding-right：后者会把整行压窄，
          而居中标题要的是「相对屏幕」居中——一旦居中基准变成被压窄的内容区，
          标题就会整体偏左（左边让 64px、右边让 64+108px，中心自然左移）。
        */}
        <View
          className="shrink-0 flex items-center justify-end"
          style={{
            marginRight: right ? `${Math.max(0, capsuleRight - 20)}px` : undefined,
          }}
        >
          {right}
        </View>

        {/*
          居中标题单独用一层绝对定位铺满整行。inset-0 相对的是 padding box，
          即包含 px-5 那 20px 的整条宽度，所以它的中心正好落在屏幕中心，
          与左右各占多宽完全无关。
        */}
        {showCenteredTitle ? (
          <View
            className="absolute inset-0 flex flex-col items-center justify-center"
            style={{ pointerEvents: 'none' }}
          >
            <Text
              className="text-page-title text-on-surface truncate"
              style={{ maxWidth: '56%' }}
            >
              {title}
            </Text>
            {subtitle ? (
              <Text
                className="text-caption text-on-surface-variant truncate"
                style={{ maxWidth: '56%' }}
              >
                {subtitle}
              </Text>
            ) : null}
          </View>
        ) : null}
      </View>

      {below}
    </View>
  )
}
