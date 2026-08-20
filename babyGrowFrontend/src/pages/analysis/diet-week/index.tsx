import { useEffect, useState } from 'react'
import { View, Text } from '@tarojs/components'
import AnalysisLayout from '@/pages/analysis/components/AnalysisLayout'
import {
  ChartCard,
  InsightCard,
  NarrativeNote,
  WeeklyMilkChart,
} from '@/pages/analysis/components/AnalysisCards'
import { getWeeklyDiet } from '@/api/modules/diet'
import { getBabyProfile } from '@/api/modules/baby'
import type { BabyProfileSummary } from '@/types/analysis'
import type { GetWeeklyDietResponse } from '@/types/diet'

const BABY_ID = 'baby-001'

const dietSubtabs = [
  { key: 'dietWeek' as const, label: '本周奶量', iconActive: 'clock-active', iconInactive: 'clock-inactive' },
  { key: 'dietMonth' as const, label: '本月膳食', iconActive: 'summary-active', iconInactive: 'summary-inactive' },
]

export default function AnalysisDietWeekPage() {
  const [profile, setProfile] = useState<BabyProfileSummary | null>(null)
  const [pageData, setPageData] = useState<GetWeeklyDietResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getBabyProfile(),
      getWeeklyDiet(BABY_ID),
    ])
      .then(([profileRes, pageRes]) => {
        const p = profileRes.data.profile
        setProfile({
          name: p.name,
          ageLabel: p.ageLabel,
          avatar: p.avatar,
          statusLabel: p.statusLabel || '',
        })
        setPageData(pageRes.data)
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading || !profile || !pageData) {
    return <View><Text>Loading...</Text></View>
  }

  return (
    <AnalysisLayout
      profile={profile}
      activeCategory="diet"
      activeSubtab="dietWeek"
      subtabOptions={dietSubtabs}
    >
      <ChartCard title="" subtitle="">
        <WeeklyMilkChart
          bars={pageData.bars}
          averageLabel={pageData.averageLabel}
          standardLabel={pageData.standardLabel}
          dataSource="mock"
        />
        <NarrativeNote text={pageData.narrativeNote} />
      </ChartCard>

      <InsightCard data={pageData.insight} />
    </AnalysisLayout>
  )
}