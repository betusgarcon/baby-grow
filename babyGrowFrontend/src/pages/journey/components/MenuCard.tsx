import { View, Text } from '@tarojs/components'
import Icon from '@/components/Icon' // 引入通用 Icon 组件

interface MenuCardProps {
  icon?: string      // 1. 声明可选的 icon 属性
  mealType: string
  title: string
  description: string
  bgColor: string
}

export default function MenuCard({ icon, mealType, title, description, bgColor }: MenuCardProps) {
  return (
    <View className={`min-w-[180px] p-4 ${bgColor} rounded-[32px] flex flex-col items-start gap-2 shrink-0`}>

      {/* 第一行：Icon 与 mealType 在同一行，且左对齐 */}
      <View className="flex flex-row items-center gap-1.5">
        <Icon name={icon || 'breakfast'} className="w-4 h-4 text-stone-700" />
        <Text className="text-neutral-600 text-xs font-semibold uppercase">{mealType}</Text>
      </View>

      <Text className="text-stone-900 text-base font-semibold">{title}</Text>
      <Text className="text-stone-700 text-xs text-center">{description}</Text>
    </View>
  )
}
