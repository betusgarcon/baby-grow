import { View, Text } from '@tarojs/components'
import Icon from '@/components/Icon'

interface WeeklyInsightProps {
  icon?: string // 1. 声明 icon可先属性
  title: string
  content: string
}

export default function WeeklyInsight({ icon, title, content }: WeeklyInsightProps) {
  return (
    <View 
      className="w-full p-6 rounded-[32px] shadow-sm border border-white/40 backdrop-blur-sm flex flex-col gap-3"
      style={{ background: 'radial-gradient(at 87% 3%, rgba(254, 226, 226, 0.4), rgba(231, 229, 228, 0.6))' }}
    >
      <View className="w-full flex justify-between items-center">
        <View className="flex items-center gap-2 text-on-surface-variant">
          {/* 3. 使用动态传入的 icon，若未传则默认降级为 'star' */}
          <Icon name={icon || 'star'} className="w-4 h-4" />          
          <Text className="text-eyebrow uppercase">{title}</Text>
        </View>
        <Text className="text-label font-medium text-secondary underline">More</Text>
      </View>
      <Text className="text-body text-on-surface-variant">{content}</Text>
    </View>
  )
}
