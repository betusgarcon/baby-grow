import AnalysisLayout from '@/pages/analysis/components/AnalysisLayout'
import {
  CircadianRingCard,
  DailySleepLogCard,
  InsightCard,
} from '@/pages/analysis/components/AnalysisCards'
import AsyncSection from '@/components/AsyncSection'
import EmptyState from '@/components/EmptyState'
import { useAsyncData } from '@/hooks/useAsyncData'
import { getSleepCircadian, getDailySleepLogs } from '@/api/modules/sleep'
import { t } from '@/i18n'
import type { ApiResponse } from '@/types/common'
import type { GetSleepCircadianResponse, GetDailySleepLogsResponse } from '@/types/sleep'

const sleepSubtabs = [
  { key: 'sleepDaily' as const, labelKey: 'analysis.subtab.sleepDaily' as const, iconActive: 'clock-active', iconInactive: 'clock-inactive' },
  { key: 'sleepMonthly' as const, labelKey: 'analysis.subtab.sleepMonthly' as const, iconActive: 'summary-active', iconInactive: 'summary-inactive' },
]

/** 这一页要两个接口，合成一个取数函数交给 useAsyncData */
interface SleepDailyData {
  circadian: GetSleepCircadianResponse
  logs: GetDailySleepLogsResponse
}

async function fetchSleepDaily(): Promise<ApiResponse<SleepDailyData>> {
  const [circadianRes, logsRes] = await Promise.all([getSleepCircadian(), getDailySleepLogs()])

  if (circadianRes.code !== 0) throw new Error(circadianRes.message)
  if (logsRes.code !== 0) throw new Error(logsRes.message)

  return { ...circadianRes, data: { circadian: circadianRes.data, logs: logsRes.data } }
}

export default function AnalysisSleepDailyPage() {
  // 此前是 Promise.all(...).finally()，没有 catch：失败后永久停在裸的 "Loading..."，
  // 而且那个分支没套 AnalysisLayout，连页头都没有
  const { status, data, retry } = useAsyncData(fetchSleepDaily)

  return (
    <AnalysisLayout
      activeCategory="sleep"
      activeSubtab="sleepDaily"
      subtabOptions={sleepSubtabs}
    >
      <AsyncSection
        status={status}
        onRetry={retry}
        skeletonBlocks={3}
        skeletonHeight={160}
        isEmpty={data?.circadian.hasData === false}
        emptyState={
          <EmptyState
            icon="moon"
            title={t('analysis.sleep.empty')}
            description={t('analysis.sleepDaily.emptyDesc')}
          />
        }
      >
        {data ? (
          <>
            <CircadianRingCard summary={data.circadian.summary} />
            <DailySleepLogCard logs={data.logs.logs} />
            <InsightCard data={data.logs.insight} />
          </>
        ) : null}
      </AsyncSection>
    </AnalysisLayout>
  )
}
