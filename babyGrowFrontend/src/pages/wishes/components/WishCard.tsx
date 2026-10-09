import { View, Text } from '@tarojs/components'
import Icon from '@/components/Icon'
import ProgressBar from './ProgressBar'
import { wishProgress, wishProgressLabel, type Wish } from '@/store/wishes'

interface WishCardProps {
  wish: Wish
  onClick: () => void
  onRemove?: () => void
}

export default function WishCard({ wish, onClick, onRemove }: WishCardProps) {
  return (
    <View
      className="w-full box-border p-5 rounded-3xl bg-surface-container-lowest border border-outline-variant flex flex-col gap-3"
      onClick={onClick}
    >
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
        <Text className="text-2xl font-bold text-on-surface">{wish.title}</Text>
        <Text className="text-base text-on-surface-variant">{wish.description}</Text>
      </View>

      <View className="flex flex-col gap-2 pt-1">
        <View className="flex items-center justify-between">
          <Text className="text-sm font-semibold text-on-surface-variant">
            {wishProgressLabel(wish)}
          </Text>
          <Text className="text-sm font-bold text-secondary">
            {Math.round(wishProgress(wish) * 100)}%
          </Text>
        </View>

        <ProgressBar value={wishProgress(wish)} />
      </View>
    </View>
  )
}
