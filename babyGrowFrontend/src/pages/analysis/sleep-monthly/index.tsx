import { useEffect, useState } from 'react'
import { View, Text } from '@tarojs/components'
import AnalysisLayout from '@/pages/analysis/components/AnalysisLayout'
import {
  InsightCard,
  SleepEvolutionCard,
} from '@/pages/analysis/components/AnalysisCards'
import { getSleepEvolution } from '@/api/modules/sleep'
import type { GetSleepEvolutionResponse } from '@/types/sleep'

const sleepSubtabs = [
  { key: 'sleepDaily' as const, label: 'Daily Ring', iconActive: 'clock-active', iconInactive: 'clock-inactive' },
  { key: 'sleepMonthly' as const, label: 'Monthly Evolution', iconActive: 'summary-active', iconInactive: 'summary-inactive' },
]

export default function AnalysisSleepMonthlyPage() {
  const [evolutionData, setEvolutionData] = useState<GetSleepEvolutionResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getSleepEvolution()
      .then((evolutionRes) => setEvolutionData(evolutionRes.data))
      .finally(() => setLoading(false))
  }, [])

  if (loading || !evolutionData) {
    return <View><Text>Loading...</Text></View>
  }

  return (
    <AnalysisLayout
      activeCategory="sleep"
      activeSubtab="sleepMonthly"
      subtabOptions={sleepSubtabs}
    >
      <InsightCard data={evolutionData.insight} />
      <SleepEvolutionCard rows={evolutionData.rows} />
      <InsightCard data={sleepDailyInsightFallback} />
    </AnalysisLayout>
  )
}

const sleepDailyInsightFallback = {
  title: '12-Month Movement & Sleep',
  content:
    'Leo is now moving into a more stable single-nap rhythm. Short sleep disruption may still appear during standing, cruising and teething weeks, so keeping the evening ritual predictable remains the highest-impact support.',
}