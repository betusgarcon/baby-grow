import { useMemo, useState } from 'react'
import Taro from '@tarojs/taro'
import { View, Text } from '@tarojs/components'
import PageContainer from '@/components/PageContainer'
import PageHeader from '@/components/PageHeader'
import EmptyState from '@/components/EmptyState'
import Icon from '@/components/Icon'
import type { SectionState } from '@/types/common'
import EventFilterCard from './components/EventFilterCard'
import TimelineEntry from './components/TimelineEntry'
import { defaultMonth, journeyTimeline, type EventFilterKey } from './journeyListData'

const PAGE_BACKGROUND = 'bg-surface-container-lowest'

/**
 * 时间线竖线。两端淡出，避免首尾像被裁断一样生硬。
 * 用内联 style 是因为它需要渐变值，且内联样式不会被 pxtransform 改单位。
 */
const CONNECTOR_GRADIENT =
  'linear-gradient(180deg, rgba(232,225,217,0) 0%, #e8e1d9 6%, #e8e1d9 94%, rgba(232,225,217,0) 100%)'

export default function JourneyListPage() {
  const [month, setMonth] = useState(defaultMonth)
  const [activeFilter, setActiveFilter] = useState<EventFilterKey>('all')

  const visibleGroups = useMemo(() => {
    if (activeFilter === 'all') return journeyTimeline

    return journeyTimeline
      .map((group) => ({
        ...group,
        entries: group.entries.filter((entry) => entry.filterKey === activeFilter),
      }))
      .filter((group) => group.entries.length > 0)
  }, [activeFilter])

  // 空态由数据条件驱动：筛选后没有记录时是真实的空结果，不是少渲染一点。
  const state: SectionState = visibleGroups.length > 0 ? 'content' : 'empty'

  return (
    <PageContainer
      background={PAGE_BACKGROUND}
      header={<PageHeader showBack title="Journey" />}
    >
      <View className="flex flex-col gap-4">
        <EventFilterCard
          month={month}
          activeFilter={activeFilter}
          onMonthChange={setMonth}
          onFilterChange={setActiveFilter}
        />

        {state === 'content' ? (
          <View className="relative flex flex-col">
            {/* 时间线竖线。这是项目允许用 absolute 的场景之一（连线），
                内容层用 relative 抬到它上面，标记再用同色描边把线断开。 */}
            <View
              className="absolute top-0 bottom-0 w-px"
              style={{ left: '1rem', backgroundImage: CONNECTOR_GRADIENT }}
            />

            <View className="relative flex flex-col">
              {visibleGroups.map((group) => (
                <View key={group.id} className="flex flex-col">
                  <View className="py-2 flex flex-col">
                    <View className="self-start py-2 px-4 rounded-full bg-surface-container-high border border-outline-variant">
                      <Text className="text-caption text-on-surface-variant">{group.label}</Text>
                    </View>
                  </View>

                  {group.entries.map((entry) => (
                    <TimelineEntry key={entry.id} entry={entry} />
                  ))}
                </View>
              ))}
            </View>
          </View>
        ) : (
          <EmptyState
            icon="calendar"
            title="No records here"
            description="This month has no events of the selected type yet."
            actionText="Show all events"
            onAction={() => setActiveFilter('all')}
          />
        )}

        {/* 空态下没有「更多」可加载，按钮跟着一起收起来 */}
        {state === 'content' ? (
          <View className="py-4 flex items-center justify-center">
            <View
              className="h-11 px-6 rounded-full border border-tertiary flex items-center gap-2"
              onClick={() => Taro.showToast({ title: '已加载全部记录', icon: 'none' })}
            >
              <Icon name="chevron-down" className="w-3 h-2" />
              <Text className="text-base text-tertiary">more</Text>
            </View>
          </View>
        ) : null}
      </View>
    </PageContainer>
  )
}
