import { View, Text, Image } from '@tarojs/components'
import Icon from '@/components/Icon'
import ProgressBar from './ProgressBar'
import { wishProgress, wishProgressLabel, type Wish } from '@/store/wishes'

interface WishCardProps {
  wish: Wish
  onClick: () => void
  onRemove?: () => void
}

export default function WishCard({ wish, onClick, onRemove }: WishCardProps) {
  const coverUrl = wish.coverUrl

  return (
    <View
      className="relative w-full box-border p-5 rounded-3xl overflow-hidden bg-surface-container-lowest border border-outline-variant flex flex-col gap-3"
      onClick={onClick}
    >
      {/* 头图铺在内容背后，而不是在上面另开一条横向图：卡片高度不变，
          列表一屏能看到的条数也就不会缩水 */}
      {coverUrl ? (
        <>
          <Image src={coverUrl} mode="aspectFill" className="absolute inset-0 w-full h-full" />
          {/* 近白蒙层。文字是深色的，不压一层的话在任何插画上都读不出来；
              代价是图片被明显压淡。换成深色蒙层 + 白字会更醒目，但会和
              其它浅色卡片脱节——这里选择保住原有的对比度与一致性。 */}
          <View
            className="absolute inset-0"
            style={{ backgroundColor: 'rgba(255, 251, 246, 0.86)' }}
          />
        </>
      ) : null}

      {/* relative 把内容抬到上面那两层绝对定位元素之上 */}
      <View className="relative flex flex-col gap-3">
        <View className="flex items-start justify-between">
          <View className={`w-12 h-12 rounded-full flex items-center justify-center ${wish.circleClass}`}>
            <Icon name={wish.icon} className="w-6 h-6" />
          </View>

          <View
            className="p-1"
            onClick={(event) => {
              event.stopPropagation()
              onRemove?.()
            }}
          >
            <Icon name="delete" className="w-4 h-4" />
          </View>
        </View>

        <View className="flex flex-col gap-1">
          <Text className="text-page-title text-on-surface">{wish.title}</Text>
          <Text className="text-base text-on-surface-variant">{wish.description}</Text>
        </View>

        <View className="flex flex-col gap-2 pt-1">
          <View className="flex items-center justify-between">
            <Text className="text-label font-medium text-on-surface-variant">
              {wishProgressLabel(wish)}
            </Text>
            <Text className="text-label font-semibold text-secondary">
              {Math.round(wishProgress(wish) * 100)}%
            </Text>
          </View>

          <ProgressBar value={wishProgress(wish)} />
        </View>
      </View>
    </View>
  )
}
