import { View, Text, Image } from '@tarojs/components'
import Icon from '@/components/Icon'
import type { JourneyEntry, JourneyEntryType } from '../journeyListData'

/** 标记圆底与角标的配色，按记录类型区分；都走 token，不写死色值 */
const TYPE_STYLE: Record<JourneyEntryType, { icon: string; markerClass: string; badgeClass: string }> = {
  memory: {
    icon: 'timeline-memory',
    markerClass: 'bg-secondary-container',
    badgeClass: 'bg-secondary-container text-on-secondary-container',
  },
  feeding: {
    icon: 'timeline-feeding',
    markerClass: 'bg-tertiary-container',
    badgeClass: 'bg-tertiary-container text-on-tertiary-container',
  },
  sleep: {
    icon: 'timeline-sleep',
    markerClass: 'bg-primary-container',
    badgeClass: 'bg-surface-variant text-on-surface-variant',
  },
}

function Badge({ label, className }: { label: string; className: string }) {
  return (
    <View className={`shrink-0 py-1 px-3 rounded-full ${className}`}>
      <Text className="text-caption font-semibold">{label}</Text>
    </View>
  )
}

function CardBody({ entry }: { entry: JourneyEntry }) {
  if (entry.type === 'memory') {
    return (
      <>
        <View className="flex items-center gap-2">
          <Badge label={entry.badge} className={TYPE_STYLE.memory.badgeClass} />
          <Text className="text-base font-semibold text-on-surface">{entry.title}</Text>
        </View>

        {entry.image ? (
          <Image src={entry.image} className="w-full h-48 rounded-[0.375rem]" mode="aspectFill" />
        ) : null}

        <Text className="text-sm text-on-surface-variant">{entry.description}</Text>
      </>
    )
  }

  if (entry.type === 'feeding') {
    return (
      <>
        <View className="flex items-center gap-2">
          <Badge label={entry.badge} className={TYPE_STYLE.feeding.badgeClass} />
          <Text className="text-base font-semibold text-on-surface">{entry.title}</Text>
        </View>

        <View className="flex items-center gap-4">
          <Text className="text-2xl font-bold text-on-surface">{entry.amount}</Text>
          <View className="w-px h-6 bg-outline-variant" />
          <Text className="text-base text-on-surface-variant">{entry.method}</Text>
        </View>
      </>
    )
  }

  return (
    <>
      <View className="flex items-center gap-2">
        <Badge label={entry.badge} className={TYPE_STYLE.sleep.badgeClass} />
        <Text className="text-base font-semibold text-on-surface">{entry.title}</Text>
      </View>

      <Text className="text-3xl font-bold text-on-surface">{entry.duration}</Text>

      <View className="w-full h-2 rounded-full bg-surface-container-high overflow-hidden">
        <View
          className="h-full rounded-full bg-primary"
          style={{ width: `${Math.round((entry.progress ?? 0) * 100)}%` }}
        />
      </View>

      {entry.wakingCount !== undefined ? (
        <Text className="self-end text-caption text-on-surface-variant">
          {entry.wakingCount} waking
        </Text>
      ) : null}
    </>
  )
}

interface TimelineEntryProps {
  entry: JourneyEntry
}

export default function TimelineEntry({ entry }: TimelineEntryProps) {
  const style = TYPE_STYLE[entry.type]

  return (
    <View className="flex items-start gap-4 py-1">
      {/* 标记本身不透明，会挡住背后的时间线竖线，所以不需要额外的同色描边——
          早先试过给它叠一个页面底色的描边类，结果和标记自己的 bg 抢优先级，
          白底白页面把标记弄成了隐形。 */}
      <View
        className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center shadow-sm z-10 ${style.markerClass}`}
      >
        <Icon name={style.icon} className="w-3.5 h-3.5" />
      </View>

      <View className="flex-1 flex flex-col gap-1">
        <Text className="text-caption text-on-surface-variant">{entry.time}</Text>

        <View className="w-full box-border p-4 rounded-lg bg-surface border border-outline-variant shadow-card-soft flex flex-col gap-2">
          <CardBody entry={entry} />
        </View>
      </View>
    </View>
  )
}
