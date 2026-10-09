import { View, Text, Image } from '@tarojs/components'
import Icon from '@/components/Icon'

interface PhotoMemoryCardProps {
  image: string
  tag: string
  title: string
  favorited?: boolean
  onToggleFavorite?: () => void
  onClick?: () => void
}

/**
 * 带照片的里程碑高亮卡。
 * 图片上叠一层底部渐变，保证白字在任何照片上都能读。
 */
export default function PhotoMemoryCard({
  image,
  tag,
  title,
  favorited = false,
  onToggleFavorite,
  onClick,
}: PhotoMemoryCardProps) {
  return (
    <View className="relative w-full h-60 rounded-3xl overflow-hidden box-border shadow-card-soft" onClick={onClick}>
      <Image src={image} className="absolute inset-0 w-full h-full" mode="aspectFill" />

      <View
        className="absolute inset-0"
        style={{ backgroundImage: 'linear-gradient(180deg, rgba(0,0,0,0) 45%, rgba(0,0,0,0.55) 100%)' }}
      />

      <View className="absolute left-0 right-0 bottom-0 p-lg flex items-end justify-between">
        <View className="flex flex-col gap-xs">
          <View className="self-start py-base px-sm rounded-full bg-surface-container-lowest">
            <Text className="text-caption text-on-surface">{tag}</Text>
          </View>
          <Text className="text-headline-lg font-semibold text-[#ffffff]">{title}</Text>
        </View>

        <View
          className="w-10 h-10 rounded-full bg-surface-container-lowest flex items-center justify-center"
          onClick={(event) => {
            event.stopPropagation()
            onToggleFavorite?.()
          }}
        >
          <Icon name="heart" className="w-5 h-5" style={favorited ? undefined : { opacity: 0.45 }} />
        </View>
      </View>
    </View>
  )
}
