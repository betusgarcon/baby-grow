import { View, Text } from '@tarojs/components'
import Icon from '@/components/Icon'
import { formatMilestoneDate, type Milestone, type MilestoneTier, type TagTone } from '../milestoneData'

/** 档位渐变。图标圆底用线性渐变。 */
const TIER_GRADIENT: Record<MilestoneTier, string> = {
  gold: 'linear-gradient(135deg, #ffe259 0%, #ffa751 100%)',
  silver: 'linear-gradient(135deg, #e0eafc 0%, #cfdef3 100%)',
  bronze: 'linear-gradient(135deg, #fad961 0%, #f76b1c 100%)',
}

/**
 * 卡片角落光晕。
 *
 * 设计稿里这层是「渐变 + 模糊」，小程序对 blur 支持不稳，但直接去掉模糊会变成
 * 一块边界清晰的实心圆，比原效果抢眼得多。这里用径向渐变衰减到全透明来近似模糊，
 * 既保住了柔和过渡，也不依赖 filter。
 */
const TIER_GLOW: Record<MilestoneTier, string> = {
  gold:
    'radial-gradient(circle, rgba(255,226,89,0.7) 0%, rgba(255,167,81,0.4) 45%, rgba(255,167,81,0) 72%)',
  silver:
    'radial-gradient(circle, rgba(224,234,252,0.85) 0%, rgba(207,222,243,0.45) 45%, rgba(207,222,243,0) 72%)',
  bronze:
    'radial-gradient(circle, rgba(250,217,97,0.7) 0%, rgba(247,107,28,0.35) 45%, rgba(247,107,28,0) 72%)',
}

/** 标签色调 → token 类名，页面不写死色值 */
const TAG_TONE_CLASS: Record<TagTone, string> = {
  tertiary: 'bg-tertiary-container text-on-tertiary-container',
  secondary: 'bg-secondary-container text-on-secondary-container',
  primary: 'bg-primary-container text-on-primary-container',
  neutral: 'bg-surface-variant text-on-surface-variant',
}

interface MilestoneCardProps {
  milestone: Milestone
}

export default function MilestoneCard({ milestone }: MilestoneCardProps) {
  const gradient = TIER_GRADIENT[milestone.tier]

  return (
    <View className="relative w-full box-border p-lg rounded-3xl bg-surface-container-lowest shadow-card-soft overflow-hidden flex flex-col gap-md">
      {/* 卡片角落装饰。这是项目允许用 absolute 的场景之一，其余内容一律走文档流。 */}
      <View
        className="absolute -top-8 -right-8 w-40 h-40"
        style={{ backgroundImage: TIER_GLOW[milestone.tier] }}
      />

      <View className="relative flex items-center justify-between">
        <View
          className="w-12 h-12 rounded-full flex items-center justify-center box-border shadow-sm"
          style={{ backgroundImage: gradient }}
        >
          <Icon name={milestone.icon} className="w-6 h-6" />
        </View>

        <View className="py-base px-sm rounded-full bg-surface-container-high">
          <Text className="text-label-md text-on-surface-variant">{formatMilestoneDate(milestone.date)}</Text>
        </View>
      </View>

      <View className="relative flex flex-col gap-xs">
        <Text className="text-headline-md font-semibold text-on-surface">{milestone.title}</Text>
        <Text className="text-body-md text-on-surface-variant">{milestone.description}</Text>
      </View>

      <View className="relative flex flex-wrap gap-xs">
        {milestone.tags.map((tag) => (
          <View key={tag.label} className={`py-base px-xs rounded-full ${TAG_TONE_CLASS[tag.tone]}`}>
            <Text className="text-caption">{tag.label}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}
