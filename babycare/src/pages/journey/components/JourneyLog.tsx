import { View, Text } from '@tarojs/components'
import Icon from '@/components/Icon'

interface JourneyLogProps {
  title: string
  time: string
  description?: string
  icon: string
  bgColor: string
  iconColor: string
  tags?: string[]
}

export default function JourneyLog({ title, time, description, icon, bgColor, iconColor, tags }: JourneyLogProps) {
  return (
    <View className="flex gap-3 items-start">
      <View className={`w-10 h-10 rounded-full ${bgColor} flex items-center justify-center ${iconColor} shrink-0`}>
        <Icon name={icon} className="w-5 h-5" />
      </View>
      <View className="flex-1 flex flex-col gap-1">
        <View className="flex justify-between items-start">
          <Text className="text-stone-900 text-sm font-semibold">{title}</Text>
          <Text className="text-stone-700/70 text-xs">{time}</Text>
        </View>
        {description && (
          <Text className="text-stone-700 text-xs">{description}</Text>
        )}
        {tags && tags.length > 0 && (
          <View className="flex items-center gap-1 mt-1">
            {tags.map((tag, index) => (
              <Text key={index} className="px-2 py-0.5 rounded-full bg-white text-stone-500 text-sm uppercase tracking-wider">
                {tag}
              </Text>
            ))}
          </View>
        )}
      </View>
    </View>
  )
}
