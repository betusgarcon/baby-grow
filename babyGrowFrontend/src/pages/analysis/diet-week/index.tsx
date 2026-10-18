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
import { t } from '@/i18n'

const dietSubtabs = [
  { key: 'dietWeek' as const, labelKey: 'analysis.subtab.dietWeek' as const, iconActive: 'clock-active', iconInactive: 'clock-inactive' },
  { key: 'dietMonth' as const, labelKey: 'analysis.subtab.dietMonth' as const, iconActive: 'summary-active', iconInactive: 'summary-inactive' },
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
            title={t('analysis.dietWeek.empty')}
            description={t('analysis.dietWeek.emptyDesc')}
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
