import { View, Text, ScrollView, Picker } from '@tarojs/components'
import Icon from '@/components/Icon'
import { eventFilters, monthOptions, type EventFilterKey } from '@/store/timeline'

interface EventFilterCardProps {
  month: string
  activeFilter: EventFilterKey
  onMonthChange: (value: string) => void
  onFilterChange: (key: EventFilterKey) => void
}

/**
 * 各 chip 的配色身份。选中时统一换成深色 primary 样式，
 * 未选中时保留自己的颜色，与设计稿一致。
 */
const CHIP_TONE_CLASS: Partial<Record<EventFilterKey, string>> = {
  milestones: 'bg-tertiary-container border-tertiary-fixed-dim text-on-tertiary-container',
  photos: 'bg-secondary-container border-secondary-fixed-dim text-on-secondary-container',
  health: 'bg-surface border-outline-variant text-on-surface',
}

export default function EventFilterCard({
  month,
  activeFilter,
  onMonthChange,
  onFilterChange,
}: EventFilterCardProps) {
  const monthIndex = Math.max(monthOptions.indexOf(month), 0)

  return (
    <View className="w-full box-border p-3 rounded-lg bg-surface-container-lowest shadow-card-soft flex flex-col gap-3">
      <Picker
        mode="selector"
        range={monthOptions}
        value={monthIndex}
        onChange={(event) => onMonthChange(monthOptions[Number(event.detail.value)])}
      >
        <View className="self-start py-2 px-4 rounded-full bg-surface border border-outline-variant flex items-center gap-2">
          <Icon name="calendar" className="w-4 h-4" />
          <Text className="text-sm font-semibold text-on-surface">{month}</Text>
          <Icon name="chevron-down" className="w-3 h-2" />
        </View>
      </Picker>

      {/* chip 数量超出屏宽，用横向滚动而不是挤压 */}
      <ScrollView scrollX className="w-full" showScrollbar={false} enhanced>
        <View className="flex items-center gap-2">
          {eventFilters.map((filter) => {
            const isActive = filter.key === activeFilter
            const toneClass = CHIP_TONE_CLASS[filter.key] ?? 'bg-surface border-outline-variant text-on-surface'

            return (
              <View
                key={filter.key}
                className={`shrink-0 py-2 px-4 rounded-full border box-border ${
                  isActive ? 'bg-primary border-primary text-[#ffffff]' : toneClass
                }`}
                onClick={() => onFilterChange(filter.key)}
              >
                <Text className="text-sm font-semibold">{filter.label}</Text>
              </View>
            )
          })}
        </View>
      </ScrollView>
    </View>
  )
}
