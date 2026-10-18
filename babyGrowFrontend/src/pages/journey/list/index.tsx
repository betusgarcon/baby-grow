import { useEffect, useMemo, useState } from 'react'
import { View, Text } from '@tarojs/components'
import PageContainer from '@/components/PageContainer'
import PageHeader from '@/components/PageHeader'
import EmptyState from '@/components/EmptyState'
import type { SectionState } from '@/types/common'
import EventFilterCard from './components/EventFilterCard'
import TimelineEntry from './components/TimelineEntry'
import { useAppState, loadTimeline } from '@/store'
import { t } from '@/i18n'
import AsyncSection from '@/components/AsyncSection'
import { defaultMonth, groupTimelineByDate, type EventFilterKey } from '@/store/timeline'

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

  // 时间线来自 store：记录弹层保存的新条目会立刻出现在这里
  const { timeline, status } = useAppState()

  useEffect(() => {
    loadTimeline()
  }, [])

  const visibleGroups = useMemo(() => {
    const filtered =
      activeFilter === 'all'
        ? timeline
        : timeline.filter((entry) => entry.filterKey === activeFilter)

    return groupTimelineByDate(filtered)
  }, [timeline, activeFilter])

  // 空态由数据条件驱动：筛选后没有记录时是真实的空结果，不是少渲染一点。
  const state: SectionState = visibleGroups.length > 0 ? 'content' : 'empty'

  return (
    <PageContainer
      background={PAGE_BACKGROUND}
      header={<PageHeader showBack title={t('journey.title')} />}
    >
      <View className="flex flex-col gap-4">
        <EventFilterCard
          month={month}
          activeFilter={activeFilter}
          onMonthChange={setMonth}
          onFilterChange={setActiveFilter}
        />

        <AsyncSection
          status={status.timeline}
          onRetry={loadTimeline}
          skeletonBlocks={2}
          skeletonHeight={160}
        >
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
                <View key={group.date} className="flex flex-col">
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
            title={t('list.empty')}
            description={t('list.emptyDesc')}
            actionText={t('list.showAll')}
            onAction={() => setActiveFilter('all')}
          />
        )}

        {/*
          数据是一次性取全的，没有分页可加载。此前这里摆了个「more」按钮，
          点下去只弹一句「已加载全部」——按钮样式不变，等于给了个永远不会
          起作用的假控件。没有更多就直接说出来，别让它看着还能点。
        */}
        {state === 'content' ? (
          <View className="py-4 flex items-center justify-center">
            <Text className="text-caption text-on-surface-variant">{t('list.allLoaded')}</Text>
          </View>
        ) : null}
        </AsyncSection>
      </View>
    </PageContainer>
  )
}
