import { useMemo, useState } from 'react'
import { View, Text } from '@tarojs/components'
import PageContainer from '@/components/PageContainer'
import PageHeader from '@/components/PageHeader'
import AsyncSection from '@/components/AsyncSection'
import EmptyState from '@/components/EmptyState'
import { navigateToRoute } from '@/utils/routes'
import { useAppState } from '@/store'
import { t } from '@/i18n'
import babyAvatar from '@/assets/images/baby-journey-img.jpg'
import MilestoneCard from './components/MilestoneCard'
import MilestoneFilterCard from './components/MilestoneFilterCard'
import PhotoMemoryCard from './components/PhotoMemoryCard'
import { photoMemory } from './milestoneData'
import { getMilestones } from '@/api/modules/milestones'
import { usePaginatedList } from '@/hooks/usePaginatedList'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'

const ALL_MONTHS = 'All'

export default function JourneyMilestonesPage() {
  const { babyHeader } = useAppState()

  const [month, setMonth] = useState(ALL_MONTHS)
  // 默认筛当年。里程碑日期是相对今天生成的，写死年份会把数据全滤掉
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [keyword, setKeyword] = useState('')
  const [favorited, setFavorited] = useState(false)

  const debouncedKeyword = useDebouncedValue(keyword, 300)
  const query = useMemo(
    () => ({
      year,
      month: month === ALL_MONTHS ? undefined : month,
      q: debouncedKeyword.trim() || undefined,
      limit: 20,
    }),
    [year, month, debouncedKeyword],
  )

  const { items, status, isEmpty, hasMore, loadingMore, loadMore, retry } = usePaginatedList({
    query,
    fetchPage: (params, cursor) => getMilestones({ ...params, cursor }),
  })

  // 这里原先有一个 resetFilters，只被空态里的「Reset filters」按钮调用。
  // 那个按钮是多余的：空态最常见的情形就是**什么都没筛**（月=All、年=当年、关键词为空）
  // 而宝宝还没有里程碑——此时点「重置筛选」不做任何事，反而让人以为「是筛选条件挡住了数据」。
  // 按钮和这个函数一并删掉。月份/年份/关键词在顶部筛选卡里本来就能逐个改回。

  return (
    <PageContainer
      background="bg-surface-container-lowest"
      header={
        <PageHeader
          showBack
          title={t('milestones.title')}
          profile={{ avatar: babyHeader.avatar, ageLabel: babyHeader.ageLabel }}
        />
      }
    >
      <AsyncSection
        status={status}
        isEmpty={isEmpty}
        emptyState={
          <EmptyState
            icon="star"
            title={t('milestones.empty')}
            description={t('milestones.emptyDesc')}
          />
        }
        onRetry={retry}
        skeletonBlocks={3}
        skeletonHeight={180}
      >
      <View className="flex flex-col gap-xl">
        {/* 标题与说明已由顶部导航栏承担，这里不再重复一遍 */}
        <MilestoneFilterCard
          month={month}
          year={year}
          keyword={keyword}
          onMonthChange={setMonth}
          onYearChange={setYear}
          onKeywordChange={setKeyword}
        />

        <View className="flex flex-col gap-lg">
          {items.map((milestone) => (
            <MilestoneCard key={milestone.id} milestone={milestone} />
          ))}

          {status === 'ready' && !isEmpty ? (
            <PhotoMemoryCard
              image={babyAvatar}
              tag={photoMemory.tag}
              title={photoMemory.title}
              favorited={favorited}
              onToggleFavorite={() => setFavorited((previous) => !previous)}
              onClick={() => navigateToRoute('family-poster')}
            />
          ) : null}
        </View>

        {status === 'ready' && !isEmpty ? (
          <View className="py-md flex items-center justify-center">
            {hasMore ? (
              <View
                className="px-6 py-3 rounded-full bg-surface-container-high active:opacity-70"
                onClick={loadMore}
              >
                <Text className="text-body-sm text-on-surface">
                  {loadingMore ? t('common.loading') : t('common.loadMore')}
                </Text>
              </View>
            ) : (
              <Text className="text-body-sm text-on-surface-variant">{t('milestones.allLoaded')}</Text>
            )}
          </View>
        ) : null}
      </View>
      </AsyncSection>
    </PageContainer>
  )
}
