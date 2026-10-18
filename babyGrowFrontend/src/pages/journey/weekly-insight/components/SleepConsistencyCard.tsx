import { View, Text } from '@tarojs/components'
import { weekdayLabels, type SleepConsistency } from '../weeklyInsightData'

export default function SleepConsistencyCard({ sleep }: { sleep: SleepConsistency }) {
  // 柱高按当周最大值归一，最低留 20% 以免短柱看不见。
  //
  // 两处兜底：dailyHours 缺失时 `.map` 会抛；而当周全是 0 时 maxHours 为 0，
  // 除法得到 Infinity，样式里就会出现 `height: Infinity%`。
  const dailyHours = sleep.dailyHours ?? []
  const maxHours = Math.max(...dailyHours, 0)
  const heightOf = (hours: number) => (maxHours > 0 ? Math.max((hours / maxHours) * 100, 20) : 20)

  return (
    <View className="w-full box-border p-6 rounded-lg bg-card shadow-card-soft flex flex-col gap-4">
      <View className="flex items-start justify-between">
        <View className="flex flex-col">
          <Text className="text-xl font-semibold text-on-surface">{sleep.title}</Text>
          <Text className="text-caption text-on-surface-variant">{sleep.subtitle}</Text>
        </View>

        <View className="py-1 px-3 rounded-full bg-surface-container-high">
          <Text className="text-caption font-bold text-secondary">{sleep.status}</Text>
        </View>
      </View>

      <View className="w-full h-32 flex items-end justify-between gap-2">
        {dailyHours.map((hours, index) => (
          <View
            key={index}
            className="flex-1 rounded-full bg-tertiary-fixed"
            style={{ height: `${heightOf(hours)}%` }}
          />
        ))}
      </View>

      <View className="w-full flex justify-between">
        {weekdayLabels().map((label, index) => (
          <View key={`${label}-${index}`} className="flex-1 flex justify-center">
            <Text className="text-caption text-on-surface-variant">{label}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}
