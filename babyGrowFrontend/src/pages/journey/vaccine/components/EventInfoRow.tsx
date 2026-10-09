import { View, Text } from '@tarojs/components'
import Icon from '@/components/Icon'

interface EventInfoRowProps {
  icon: string
  label: string
  value: string
}

export default function EventInfoRow({ icon, label, value }: EventInfoRowProps) {
  return (
    <View className="w-full box-border p-4 rounded-3xl bg-surface-container-low flex items-center gap-4">
      <View className="w-10 h-10 shrink-0 rounded-full bg-surface-container-lowest flex items-center justify-center">
        <Icon name={icon} className="w-5 h-5" />
      </View>

      <View className="flex-1 flex flex-col">
        <Text className="text-caption text-on-surface-variant">{label}</Text>
        <Text className="text-base font-semibold text-on-surface">{value}</Text>
      </View>
    </View>
  )
}
