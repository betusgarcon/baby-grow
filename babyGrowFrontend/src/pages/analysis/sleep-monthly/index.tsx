import AnalysisLayout from '@/pages/analysis/components/AnalysisLayout'
import {
  InsightCard,
  SleepEvolutionCard,
} from '@/pages/analysis/components/AnalysisCards'
import AsyncSection from '@/components/AsyncSection'
import EmptyState from '@/components/EmptyState'
import { useAsyncData } from '@/hooks/useAsyncData'
import { getSleepEvolution } from '@/api/modules/sleep'

const sleepSubtabs = [
  { key: 'sleepDaily' as const, label: 'Daily Ring', iconActive: 'clock-active', iconInactive: 'clock-inactive' },
  { key: 'sleepMonthly' as const, label: 'Monthly Evolution', iconActive: 'summary-active', iconInactive: 'summary-inactive' },
]

export default function AnalysisSleepMonthlyPage() {
  // 此前是 .then().finally()，没有 catch：失败后永久停在裸的 "Loading..."，
  // 而且那个分支没套 AnalysisLayout，连页头都没有
  const { status, data, retry } = useAsyncData(getSleepEvolution)

  return (
    <AnalysisLayout
      activeCategory="sleep"
      activeSubtab="sleepMonthly"
      subtabOptions={sleepSubtabs}
    >
      <AsyncSection
        status={status}
        onRetry={retry}
        skeletonBlocks={3}
        skeletonHeight={160}
        isEmpty={data?.hasData === false}
        emptyState={
          <EmptyState
            icon="moon"
            title="还没有睡眠记录"
            description="点下面中间的 + 记录几天的入睡与醒来时间，这里会按月龄对比睡眠节律的变化。"
          />
        }
      >
        {data ? (
          <>
            <InsightCard data={data.insight} />
            <SleepEvolutionCard rows={data.rows} />
            {/* 这里原本还有一张写死的 InsightCard，标题「12-Month Movement & Sleep」、
                正文以「Leo is now moving into a more stable single-nap rhythm…」开头。
                那是针对某个虚构宝宝的结论，却会原样展示给每个用户。后端目前没有
                「按月龄的阶段洞察」字段，所以先移除，而不是继续展示一句编出来的判断。 */}
          </>
        ) : null}
      </AsyncSection>
    </AnalysisLayout>
  )
}
