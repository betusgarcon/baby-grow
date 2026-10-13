import { useEffect, useState } from 'react'
import { View, Text } from '@tarojs/components'
import AnalysisLayout from '@/pages/analysis/components/AnalysisLayout'
import {
  CircadianRingCard,
  DailySleepLogCard,
  InsightCard,
} from '@/pages/analysis/components/AnalysisCards'
import { getSleepCircadian, getDailySleepLogs } from '@/api/modules/sleep'
import type { GetSleepCircadianResponse, GetDailySleepLogsResponse } from '@/types/sleep'

const sleepSubtabs = [
  { key: 'sleepDaily' as const, label: 'Daily Ring', iconActive: 'clock-active', iconInactive: 'clock-inactive' },
  { key: 'sleepMonthly' as const, label: 'Monthly Evolution', iconActive: 'summary-active', iconInactive: 'summary-inactive' },
]

export default function AnalysisSleepDailyPage() {
  const [circadianData, setCircadianData] = useState<GetSleepCircadianResponse | null>(null)
  const [logsData, setLogsData] = useState<GetDailySleepLogsResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getSleepCircadian(), getDailySleepLogs()])
      .then(([circadianRes, logsRes]) => {
        setCircadianData(circadianRes.data)
        setLogsData(logsRes.data)
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading || !circadianData || !logsData) {
    return <View><Text>Loading...</Text></View>
  }

  return (
    <AnalysisLayout
      activeCategory="sleep"
      activeSubtab="sleepDaily"
      subtabOptions={sleepSubtabs}
    >
      <CircadianRingCard summary={circadianData.summary} dataSource="mock" />
      <DailySleepLogCard logs={logsData.logs} />
      <InsightCard data={logsData.insight} />
    </AnalysisLayout>
  )
}