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
import type { GetWeeklyDietResponse } from '@/types/diet'

const dietSubtabs = [
  { key: 'dietWeek' as const, label: '本周奶量', iconActive: 'clock-active', iconInactive: 'clock-inactive' },
  { key: 'dietMonth' as const, label: '本月膳食', iconActive: 'summary-active', iconInactive: 'summary-inactive' },
]

export default function AnalysisDietWeekPage() {
  const [pageData, setPageData] = useState<GetWeeklyDietResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getWeeklyDiet()
      .then((pageRes) => setPageData(pageRes.data))
      .finally(() => setLoading(false))
  }, [])

  if (loading || !pageData) {
    return <View><Text>Loading...</Text></View>
  }

  return (
    <AnalysisLayout
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