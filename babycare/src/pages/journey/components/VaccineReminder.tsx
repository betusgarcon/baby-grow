import { View, Text } from '@tarojs/components'
import Icon from '@/components/Icon'

interface VaccineReminderProps {
  icon?: string // 1. 声明 icon可先属性
  title: string
  date: string
}

export default function VaccineReminder({ icon, title, date }: VaccineReminderProps) {
  return (
    <View className="w-full p-4 bg-rose-200/30 rounded-[32px] shadow-sm border border-red-700/20 flex items-start gap-3">
      <View className="text-red-700 shrink-0 mt-0.5">
        <Icon name={icon || 'injection'} className="w-5 h-5" />
      </View>
      <View className="flex-1 flex flex-col gap-1">
        <Text className="text-red-800 text-sm font-semibold">{title}</Text>
        <Text className="text-red-800/80 text-xs">{date}</Text>
      </View>
    </View>
  )
}
