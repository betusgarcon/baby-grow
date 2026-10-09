import { View, Text } from '@tarojs/components'
import Icon from '@/components/Icon'
import { formatMilestoneDate, type Milestone, type MilestoneTier, type TagTone } from '../milestoneData'

/** 档位渐变。图标圆底与右上角光晕共用同一组色，只是透明度不同。 */
const TIER_GRADIENT: Record<MilestoneTier, string> = {
  gold: 'linear-gradient(135deg, #ffe259 0%, #ffa751 100%)',
  silver: 'linear-gradient(135deg, #e0eafc 0%, #cfdef3 100%)',
  bronze: 'linear-gradient(135deg, #fad961 0%, #f76b1c 100%)',
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
      {/* 卡片角落装饰。这是项目允许用 absolute 的场景之一，其余内容一律走文档流。
          设计稿里这层还带模糊，小程序对 blur 支持不稳，这里只降透明度、不做模糊。 */}
      <View
        className="absolute -top-6 -right-6 w-32 h-32 rounded-full"
        style={{ backgroundImage: gradient, opacity: 0.25 }}
      />

      <View className="relative flex items-center justify-between">
        <View
          className="w-12 h-12 rounded-full flex items-center justify-center box-border shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
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
