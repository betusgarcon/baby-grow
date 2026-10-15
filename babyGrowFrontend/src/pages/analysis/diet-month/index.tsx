import AnalysisLayout from '@/pages/analysis/components/AnalysisLayout'
import {
  ChartCard,
  DietDonutSummary,
  IngredientToleranceCard,
  InsightCard,
} from '@/pages/analysis/components/AnalysisCards'
import AsyncSection from '@/components/AsyncSection'
import EmptyState from '@/components/EmptyState'
import { useAsyncData } from '@/hooks/useAsyncData'
import { getMonthlyDiet } from '@/api/modules/diet'

const dietSubtabs = [
  { key: 'dietWeek' as const, label: '本周奶量', iconActive: 'clock-active', iconInactive: 'clock-inactive' },
  { key: 'dietMonth' as const, label: '本月膳食', iconActive: 'summary-active', iconInactive: 'summary-inactive' },
]

export default function AnalysisDietMonthPage() {
  // 此前是 .then().finally()，没有 catch：失败后永久停在裸的 "Loading..."，
  // 而且那个分支没套 AnalysisLayout，连页头都没有
  const { status, data: pageData, retry } = useAsyncData(getMonthlyDiet)

  return (
    <AnalysisLayout
      activeCategory="diet"
      activeSubtab="dietMonth"
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
            title="还没有辅食记录"
            description="点下面中间的 + 记下宝宝吃了什么，这里会按类别显示构成与已尝试的食材。"
          />
        }
      >
        {pageData ? (
          <>
            <ChartCard
              title={pageData.title}
              subtitle={pageData.subtitle}
              extra={pageData.extra}
            >
              <DietDonutSummary
                ratio={pageData.donut.ratio}
                title={pageData.donut.title}
                legends={pageData.donut.legends}
              />
              <IngredientToleranceCard
                title={pageData.ingredients.badge}
                badge="已成功建立耐受"
                ingredients={pageData.ingredients.list}
              />
            </ChartCard>

            <InsightCard data={pageData.insight} />
          </>
        ) : null}
      </AsyncSection>
    </AnalysisLayout>
  )
}
