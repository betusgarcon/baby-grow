import { View, Text, Image } from '@tarojs/components'
import fallbackAvatar from '@/assets/images/baby-journey-img.jpg'

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
  // 后端 avatar_url 可能为空（宝宝还没换过头像），空 src 会渲染成一个白圆。
  // 统一回落到本地默认图，保证任何页面看到的都是同一张头像。
  const src = avatar || fallbackAvatar

  /*
    徽章能用的宽度就是头像的宽度，所以字号跟着文案长度走：
    6M 这类 2 字符用 13px，文字几乎顶满徽章上下沿；
    1Y2M 已经接近宽度上限；2Y11M 再缩一档，免得两头被圆角裁掉。
    下限 10px 保证再长也还看得清。
  */
  const badgeFontSize = ageLabel.length > 4 ? 10 : ageLabel.length > 2 ? 11 : 13

  return (
    <View
      className="relative shrink-0 rounded-full overflow-hidden"
      style={{ width: `${size}px`, height: `${size}px` }}
    >
      <Image
        className="rounded-full object-cover bg-surface-container"
        style={{ width: `${size}px`, height: `${size}px` }}
        src={src}
        mode="aspectFill"
      />

      {/*
        徽章宽度跟随头像，不写死。写死 72px 时，在 36px 的圆里两侧各被裁掉 18px，
        「6 Months」只剩下中间那几个字母（用户看到的就是残缺的 "Mont"）。

        字号按「几乎顶满徽章上下沿」来定：文字与徽章等高，小月龄才看得清。
        文案本身已经是 6M 这样的短格式，不再需要为了塞下长文案而缩字。
      */}
      <View
        className="absolute left-0 right-0 flex items-center justify-center"
        style={{
          height: '16px',
          bottom: '0',
          backgroundColor: 'rgba(71, 85, 105, 0.56)',
        }}
      >
        <Text
          className="block text-center leading-[16px] text-[#ffffff] font-semibold"
          style={{ fontSize: `${badgeFontSize}px` }}
        >
          {ageLabel}
        </Text>
      </View>
    </View>
  )
}
