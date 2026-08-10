import { useEffect, useState } from 'react'
import { View, Text } from '@tarojs/components'
import AnalysisLayout from '@/pages/analysis/components/AnalysisLayout'
import {
  CircadianRingCard,
  DailySleepLogCard,
  InsightCard,
} from '@/pages/analysis/components/AnalysisCards'
import { getSleepCircadian, getDailySleepLogs } from '@/api/modules/sleep'
import { getBabyProfile } from '@/api/modules/baby'
import type { BabyProfileSummary } from '@/types/analysis'
import type { GetSleepCircadianResponse, GetDailySleepLogsResponse } from '@/types/sleep'

const BABY_ID = 'baby-001'

const sleepSubtabs = [
  { key: 'sleepDaily' as const, label: 'Daily Ring' },
  { key: 'sleepMonthly' as const, label: 'Monthly Evolution' },
]

export default function AnalysisSleepDailyPage() {
  const [profile, setProfile] = useState<BabyProfileSummary | null>(null)
  const [circadianData, setCircadianData] = useState<GetSleepCircadianResponse | null>(null)
  const [logsData, setLogsData] = useState<GetDailySleepLogsResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getBabyProfile(),
      getSleepCircadian(BABY_ID),
      getDailySleepLogs(BABY_ID),
    ])
      .then(([profileRes, circadianRes, logsRes]) => {
        const p = profileRes.data.profile
        setProfile({
          name: p.name,
          ageLabel: p.ageLabel,
          avatar: p.avatar,
          statusLabel: p.statusLabel || '',
        })
        setCircadianData(circadianRes.data)
        setLogsData(logsRes.data)
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading || !profile || !circadianData || !logsData) {
    return <View><Text>Loading...</Text></View>
  }

  return (
    <AnalysisLayout
      profile={profile}
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