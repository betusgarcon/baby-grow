import { useMemo, useState } from 'react'
import { View, Text } from '@tarojs/components'
import PageContainer from '@/components/PageContainer'
import PageHeader from '@/components/PageHeader'
import EmptyState from '@/components/EmptyState'
import EventFilterCard from './components/EventFilterCard'
import TimelineEntry from './components/TimelineEntry'
import { t } from '@/i18n'
import AsyncSection from '@/components/AsyncSection'
import { defaultMonth, groupTimelineByDate, type EventFilterKey } from '@/store/timeline'
import { getTimeline } from '@/api/modules/timeline'
import { usePaginatedList } from '@/hooks/usePaginatedList'

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

  // 月份与事件类型都在服务端过滤，避免「先分页再筛选」漏掉后面的记录
  const query = useMemo(
    () => ({ month, filter: activeFilter, limit: 20 }),
    [month, activeFilter],
  )
  const { items, status, isEmpty, hasMore, loadingMore, loadMore, retry } = usePaginatedList({
    query,
    fetchPage: (params, cursor) => getTimeline({ ...params, cursor }),
  })

  const visibleGroups = useMemo(() => groupTimelineByDate(items), [items])

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
          status={status}
          isEmpty={isEmpty}
          emptyState={
            <EmptyState
              icon="calendar"
              title={t('list.empty')}
              description={t('list.emptyDesc')}
              actionText={t('list.showAll')}
              onAction={() => setActiveFilter('all')}
            />
          }
          onRetry={retry}
          skeletonBlocks={2}
          skeletonHeight={160}
        >
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

        {status === 'ready' && !isEmpty ? (
          <View className="py-4 flex items-center justify-center">
            {hasMore ? (
              <View
                className="px-6 py-3 rounded-full bg-surface-container-high active:opacity-70"
                onClick={loadMore}
              >
                <Text className="text-caption text-on-surface">
                  {loadingMore ? t('common.loading') : t('common.loadMore')}
                </Text>
              </View>
            ) : (
              <Text className="text-caption text-on-surface-variant">{t('list.allLoaded')}</Text>
            )}
          </View>
        ) : null}
        </AsyncSection>
      </View>
    </PageContainer>
  )
}
