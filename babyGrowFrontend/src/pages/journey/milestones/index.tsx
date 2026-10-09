import { useEffect, useMemo, useState } from 'react'
import Taro from '@tarojs/taro'
import { View, Text } from '@tarojs/components'
import PageContainer from '@/components/PageContainer'
import PageHeader, { ProfileAvatar } from '@/components/PageHeader'
import AsyncSection from '@/components/AsyncSection'
import EmptyState from '@/components/EmptyState'
import Icon from '@/components/Icon'
import { navigateToRoute } from '@/utils/routes'
import { useAppState, loadMilestones } from '@/store'
import type { SectionState } from '@/types/common'
import babyAvatar from '@/assets/images/baby-journey-img.png'
import MilestoneCard from './components/MilestoneCard'
import MilestoneFilterCard from './components/MilestoneFilterCard'
import PhotoMemoryCard from './components/PhotoMemoryCard'
import {
  milestoneMonth,
  milestoneYear,
  photoMemory,
  type Milestone,
} from './milestoneData'

const ALL_MONTHS = 'All'

/** 按月份 / 年份 / 关键词过滤。三者都是本地筛选，接入接口后改为查询参数即可。 */
const filterMilestones = (milestones: Milestone[], month: string, year: string, keyword: string) => {
  const normalizedKeyword = keyword.trim().toLowerCase()

  return milestones.filter((milestone) => {
    if (month !== ALL_MONTHS && milestoneMonth(milestone.date) !== month) return false
    if (year && milestoneYear(milestone.date) !== year) return false

    if (normalizedKeyword) {
      const haystack = `${milestone.title} ${milestone.description}`.toLowerCase()
      if (!haystack.includes(normalizedKeyword)) return false
    }

    return true
  })
}

export default function JourneyMilestonesPage() {
  // 里程碑来自 store：与首页 Recent Milestones 同源
  const { milestones, status } = useAppState()

  const [month, setMonth] = useState(ALL_MONTHS)
  // 默认筛当年。里程碑日期是相对今天生成的，写死年份会把数据全滤掉
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [keyword, setKeyword] = useState('')
  const [favorited, setFavorited] = useState(false)

  useEffect(() => {
    loadMilestones()
  }, [])

  const visibleMilestones = useMemo(
    () => filterMilestones(milestones, month, year, keyword),
    [milestones, month, year, keyword],
  )

  // 空态是独立业务状态，由数据条件驱动，而不是写死一张截图。
  const state: SectionState = visibleMilestones.length > 0 ? 'content' : 'empty'

  const resetFilters = () => {
    setMonth(ALL_MONTHS)
    setKeyword('')
  }

  return (
    <PageContainer
      background="bg-surface-container-lowest"
      header={
        <PageHeader
          showBack
          title="Milestones"
          right={<ProfileAvatar avatar={babyAvatar} ageLabel="6M" size={40} />}
        />
      }
    >
      <AsyncSection status={status.milestones} onRetry={loadMilestones} skeletonBlocks={3} skeletonHeight={180}>
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
          {state === 'content' ? (
            <>
              {visibleMilestones.map((milestone) => (
                <MilestoneCard key={milestone.id} milestone={milestone} />
              ))}

              <PhotoMemoryCard
                image={babyAvatar}
                tag={photoMemory.tag}
                title={photoMemory.title}
                favorited={favorited}
                onToggleFavorite={() => setFavorited((previous) => !previous)}
                onClick={() => navigateToRoute('family-poster')}
              />
            </>
          ) : (
            <EmptyState
              icon="star"
              title="No milestones yet"
              description="Try a different month or keyword, or record a moment to see it here."
              actionText="Reset filters"
              onAction={resetFilters}
            />
          )}
        </View>

        <View className="py-md flex items-center justify-center">
          <View
            className="h-11 px-lg rounded-full border border-tertiary flex items-center gap-xs"
            onClick={() => Taro.showToast({ title: '已加载全部里程碑', icon: 'none' })}
          >
            <Icon name="chevron-down" className="w-3 h-2" />
            <Text className="text-body-md text-tertiary">more</Text>
          </View>
        </View>
      </View>
      </AsyncSection>
    </PageContainer>
  )
}
