import { useEffect, useState } from 'react'
import { View, Text } from '@tarojs/components'
import AnalysisLayout from '@/pages/analysis/components/AnalysisLayout'
import {
  ChartCard,
  DietDonutSummary,
  IngredientToleranceCard,
  InsightCard,
} from '@/pages/analysis/components/AnalysisCards'
import { getMonthlyDiet } from '@/api/modules/diet'
import type { GetMonthlyDietResponse } from '@/types/diet'

const dietSubtabs = [
  { key: 'dietWeek' as const, label: '本周奶量', iconActive: 'clock-active', iconInactive: 'clock-inactive' },
  { key: 'dietMonth' as const, label: '本月膳食', iconActive: 'summary-active', iconInactive: 'summary-inactive' },
]

export default function AnalysisDietMonthPage() {
  const [pageData, setPageData] = useState<GetMonthlyDietResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getMonthlyDiet()
      .then((pageRes) => setPageData(pageRes.data))
      .finally(() => setLoading(false))
  }, [])

  if (loading || !pageData) {
    return <View><Text>Loading...</Text></View>
  }

  return (
    <AnalysisLayout
      activeCategory="diet"
      activeSubtab="dietMonth"
      subtabOptions={dietSubtabs}
    >
      <ChartCard
        title={pageData.title}
        subtitle={pageData.subtitle}
        extra={pageData.extra}
      >
        <DietDonutSummary
          ratio={pageData.donut.ratio}
          title={pageData.donut.title}
          legends={pageData.donut.legends}
          dataSource="mock"
        />
        <IngredientToleranceCard
          title={pageData.ingredients.badge}
          badge="已成功建立耐受"
          ingredients={pageData.ingredients.list}
        />
      </ChartCard>

      <InsightCard data={pageData.insight} />
    </AnalysisLayout>
  )
}