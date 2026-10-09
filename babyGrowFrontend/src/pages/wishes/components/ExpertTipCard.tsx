import { View, Text } from '@tarojs/components'
import Icon from '@/components/Icon'
import { splitEmphasis } from '../wishesData'

/**
 * Expert Tip 卡片，勾选式与计数式详情页共用。
 * 文案里用 ** 标记的部分会加重显示——建议里的关键动作值得被强调。
 */
export default function ExpertTipCard({ tip }: { tip: string }) {
  return (
    <View className="relative w-full box-border p-6 rounded-xl bg-secondary-fixed overflow-hidden flex flex-col gap-3">
      <View className="flex items-center gap-2">
        <Icon name="expert-tip" className="w-5 h-5" />
        <Text className="text-caption font-bold text-analysis-metric-label" style={{ letterSpacing: '0.08em' }}>
          EXPERT TIP
        </Text>
      </View>

      <Text className="relative text-base text-on-surface-variant">
        {splitEmphasis(tip).map((segment, index) => (
          <Text key={index} className={segment.emphasis ? 'font-bold' : ''}>
            {segment.text}
          </Text>
        ))}
      </Text>

      {/* 右上角装饰灯泡。设计稿这层是淡化的大图标 */}
      <View className="absolute -top-3 -right-3 w-16 h-16" style={{ opacity: 0.15 }}>
        <Icon name="expert-tip" className="w-full h-full" />
      </View>
    </View>
  )
}
