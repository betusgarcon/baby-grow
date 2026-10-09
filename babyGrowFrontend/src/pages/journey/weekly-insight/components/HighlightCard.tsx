import { View, Text } from '@tarojs/components'
import Icon from '@/components/Icon'
import { TONE_CLASS } from './MetricCard'
import type { DevelopmentHighlight } from '../weeklyInsightData'

export default function HighlightCard({ highlight }: { highlight: DevelopmentHighlight }) {
  const tone = TONE_CLASS[highlight.tone]

  return (
    // 左侧色条是这张卡的识别特征，用固定宽度的兄弟节点而不是 border-left，
    // 这样圆角处也能被正确裁切
    <View className="w-full box-border rounded-3xl bg-surface-container-lowest overflow-hidden flex">
      <View className={`w-1 shrink-0 ${tone.bar}`} />

      <View className="flex-1 p-4 flex items-start gap-4">
        <View className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center ${tone.pill}`}>
          <Icon name={highlight.icon} className="w-5 h-5" />
        </View>

        <View className="flex-1 flex flex-col gap-1">
          <View className="flex items-center justify-between">
            <Text className="text-base font-semibold text-on-surface">{highlight.title}</Text>
            <Text className="text-caption font-semibold text-on-surface-variant">
              {highlight.date}
            </Text>
          </View>

          <Text className="text-sm text-on-surface-variant">{highlight.description}</Text>
        </View>
      </View>
    </View>
  )
}
