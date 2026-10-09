import { View, Text } from '@tarojs/components'
import Icon from '@/components/Icon'
import type { MetricSummary, InsightTone } from '../weeklyInsightData'

/** 与 HighlightCard 共用同一套色调映射，两处都走 token */
export const TONE_CLASS: Record<InsightTone, { pill: string; bar: string }> = {
  tertiary: { pill: 'bg-tertiary-container text-on-tertiary-container', bar: 'bg-tertiary' },
  secondary: { pill: 'bg-secondary-container text-on-secondary-container', bar: 'bg-secondary-fixed-dim' },
}

export default function MetricCard({ metric }: { metric: MetricSummary }) {
  return (
    <View className="flex-1 box-border p-4 rounded-lg bg-surface-container-lowest shadow-card-soft flex flex-col gap-2">
      <View className="flex items-center gap-2">
        <Icon name={metric.icon} className="w-4 h-4" />
        <Text className="text-sm font-semibold text-on-surface-variant">{metric.label}</Text>
      </View>

      <View className="flex items-end gap-1 pt-1">
        <Text className="text-2xl font-bold text-secondary">{metric.value}</Text>
        <Text className="text-caption text-on-surface-variant">{metric.unit}</Text>
      </View>

      <View
        className={`self-start py-1 px-2 rounded-full flex items-center gap-1 ${TONE_CLASS[metric.tone].pill}`}
      >
        <Icon name="trend-up" className="w-3 h-3" />
        <Text className="text-caption font-semibold">{metric.delta}</Text>
      </View>
    </View>
  )
}
