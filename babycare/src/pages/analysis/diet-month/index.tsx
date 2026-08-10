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
import { getBabyProfile } from '@/api/modules/baby'
import type { BabyProfileSummary } from '@/types/analysis'
import type { GetMonthlyDietResponse } from '@/types/diet'

const BABY_ID = 'baby-001'

const dietSubtabs = [
  { key: 'dietWeek' as const, label: '本周奶量' },
  { key: 'dietMonth' as const, label: '本月膳食' },
]

export default function AnalysisDietMonthPage() {
  const [profile, setProfile] = useState<BabyProfileSummary | null>(null)
  const [pageData, setPageData] = useState<GetMonthlyDietResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getBabyProfile(),
      getMonthlyDiet(BABY_ID),
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