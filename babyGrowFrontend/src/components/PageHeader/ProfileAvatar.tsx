import { View, Text, Image } from '@tarojs/components'

interface ProfileAvatarProps {
  avatar: string
  ageLabel: string
  /** 尺寸，默认导航栏用的 44px */
  size?: number
}

/**
 * 宝宝头像 + 年龄徽章。
 *
 * 徽章故意做得比头像宽，靠外层的圆形容器裁掉两侧，
 * 呈现「头像底部一条半透明遮罩」的效果。这套样式原先只写死在分析模块里，
 * 现在抽出来供所有出现头像的地方共用。
 */
export default function ProfileAvatar({ avatar, ageLabel, size = 44 }: ProfileAvatarProps) {
  return (
    <View
      className="relative shrink-0 rounded-full overflow-hidden"
      style={{ width: `${size}px`, height: `${size}px` }}
    >
      <Image
        className="rounded-full object-cover bg-surface-container"
        style={{ width: `${size}px`, height: `${size}px` }}
        src={avatar}
        mode="aspectFill"
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
        <Text className="block text-center text-sm leading-[14px] text-[#ffffff] font-medium">
          {ageLabel}
        </Text>
      </View>
    </View>
  )
}
