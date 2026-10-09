import { View, Text } from '@tarojs/components'
import Icon from '@/components/Icon'
import type { CalendarEvent, CalendarEventTone } from '../calendarData'

/** 圆底与图标按事件类型区分。图标复用现有资源，不为近似的绿色再出一份 */
const TONE_STYLE: Record<CalendarEventTone, { icon: string; circleClass: string }> = {
  vaccine: { icon: 'calendar-vaccine', circleClass: 'bg-secondary-container' },
  milestone: { icon: 'happy-mood', circleClass: 'bg-tertiary-fixed' },
}

interface HighlightCardProps {
  event: CalendarEvent
  onClick: () => void
}

export default function HighlightCard({ event, onClick }: HighlightCardProps) {
  const style = TONE_STYLE[event.tone]

  return (
    <View
      className="w-full box-border p-4 rounded-xl bg-surface-container-lowest border border-outline-variant shadow-card-soft flex items-center gap-4"
      onClick={onClick}
    >
      <View className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center ${style.circleClass}`}>
        <Icon name={style.icon} className="w-5 h-5" />
      </View>

      <View className="flex-1 flex flex-col">
        <Text className="text-base font-semibold text-on-surface">{event.title}</Text>
        <Text className="text-caption text-on-surface-variant">{event.subtitle}</Text>
      </View>

      <Icon name="chevron-right" className="w-2 h-3" />
    </View>
  )
}
