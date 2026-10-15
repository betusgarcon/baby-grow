import AnalysisLayout from '@/pages/analysis/components/AnalysisLayout'
import {
  ChartCard,
  InsightCard,
  NarrativeNote,
  WeeklyMilkChart,
} from '@/pages/analysis/components/AnalysisCards'
import AsyncSection from '@/components/AsyncSection'
import EmptyState from '@/components/EmptyState'
import { useAsyncData } from '@/hooks/useAsyncData'
import { getWeeklyDiet } from '@/api/modules/diet'

const dietSubtabs = [
  { key: 'dietWeek' as const, label: '本周奶量', iconActive: 'clock-active', iconInactive: 'clock-inactive' },
  { key: 'dietMonth' as const, label: '本月膳食', iconActive: 'summary-active', iconInactive: 'summary-inactive' },
]

export default function AnalysisDietWeekPage() {
  // 此前是 .then().finally()，没有 catch：失败后永久停在裸的 "Loading..."，
  // 而且那个分支没套 AnalysisLayout，连页头都没有
  const { status, data: pageData, retry } = useAsyncData(getWeeklyDiet)

  return (
    <AnalysisLayout
      activeCategory="diet"
      activeSubtab="dietWeek"
      subtabOptions={dietSubtabs}
    >
      <AsyncSection
        status={status}
        onRetry={retry}
        skeletonBlocks={3}
        skeletonHeight={160}
        isEmpty={pageData?.hasData === false}
        emptyState={
          <EmptyState
            icon="fork_knife"
            title="还没有奶量记录"
            description="点下面中间的 + 记下每天喝了多少，这里会按天显示并与建议区间对照。"
          />
        }
      >
        {pageData ? (
          <>
            <ChartCard title="" subtitle="">
              <WeeklyMilkChart
                bars={pageData.bars}
                averageLabel={pageData.averageLabel}
                standardLabel={pageData.standardLabel}
              />
              <NarrativeNote text={pageData.narrativeNote} />
            </ChartCard>

            <InsightCard data={pageData.insight} />
          </>
        ) : null}
      </AsyncSection>
    </AnalysisLayout>
  )
}
