import { View, Text, Image } from '@tarojs/components'
import type { Wish } from '@/store/wishes'

/**
 * 心愿详情页与计数页共用的顶部头图区。
 *
 * 这两处原本各自写了一份一模一样的渐变占位块（逐字重复，含 badge/title/subtitle 三段），
 * 现在合并到这里，头图状态也只有一处需要判断。
 *
 * 头图是创建心愿时由 AI 异步生成的，所以有四种形态：
 * 有图 → 显示图；生成中 → 渐变 + 提示；失败 → 渐变 + 重试入口；没开启 → 纯渐变。
 */

/** 没有头图时的占位。取自设计稿的同色系浅底 */
const PLACEHOLDER_GRADIENT = 'linear-gradient(160deg, #faf2ea 0%, #e8e1d9 100%)'

/** 压在图上的一层：下深上透，让白色文字在任何浅色插画上都读得出来 */
const SCRIM_GRADIENT = 'linear-gradient(180deg, rgba(0,0,0,0) 35%, rgba(0,0,0,0.55) 100%)'

interface WishHeroProps {
  wish: Wish
  /** 生成失败时的重试入口。不传则不显示 */
  onRetryCover?: () => void
}

export default function WishHero({ wish, onRetryCover }: WishHeroProps) {
  const { coverUrl, coverStatus } = wish
  const hasCover = Boolean(coverUrl)

  return (
    <View className="relative w-full h-56 rounded-3xl overflow-hidden flex flex-col justify-end p-6 gap-2">
      {hasCover && coverUrl ? (
        <>
          <Image src={coverUrl} mode="aspectFill" className="absolute inset-0 w-full h-full" />
          <View className="absolute inset-0" style={{ backgroundImage: SCRIM_GRADIENT }} />
        </>
      ) : (
        <View className="absolute inset-0" style={{ backgroundImage: PLACEHOLDER_GRADIENT }} />
      )}

      {/* relative 把内容抬到上面那两层绝对定位元素之上 */}
      <View className="relative flex flex-col gap-2">
        {wish.badge ? (
          <View className="self-start py-1 px-3 rounded-full bg-secondary-container">
            <Text className="text-caption font-bold text-on-secondary-container">{wish.badge}</Text>
          </View>
        ) : null}

        <Text className={`text-2xl font-bold ${hasCover ? 'text-[#ffffff]' : 'text-on-surface'}`}>
          {wish.title}
        </Text>
        <Text className={`text-base ${hasCover ? 'text-[#f4f4f4]' : 'text-on-surface-variant'}`}>
          {wish.detailSubtitle}
        </Text>

        {coverStatus === 'pending' ? (
          <Text className={`text-caption ${hasCover ? 'text-[#f4f4f4]' : 'text-on-surface-variant'}`}>
            头图生成中…
          </Text>
        ) : null}

        {coverStatus === 'failed' && onRetryCover ? (
          <View
            className="self-start py-1 px-3 rounded-full bg-surface-container"
            onClick={onRetryCover}
          >
            <Text className="text-caption font-semibold text-on-surface">重新生成头图</Text>
          </View>
        ) : null}
      </View>
    </View>
  )
}
