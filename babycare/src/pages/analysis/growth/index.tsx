import { useEffect, useMemo, useState } from 'react'
import AnalysisLayout from '@/pages/analysis/components/AnalysisLayout'
import {
  ChartCard,
  DietDonutSummary,
  GrowthTrendChart,
  IngredientToleranceCard,
  InsightCard,
  MetricFooter,
  MetricOverviewCard,
  MilestoneProgressCard,
} from '@/pages/analysis/components/AnalysisCards'
import { View, Text } from '@tarojs/components'
import { analysisColors } from '@/pages/analysis/components/analysisTokens'
import { getGrowthPage } from '@/api/modules/growth'
import { getBabyProfile } from '@/api/modules/baby'
import type { GrowthMetricKey, GrowthRangeKey, BabyProfileSummary } from '@/types/analysis'
import type { GetGrowthPageResponse } from '@/types/growth'

const BABY_ID = 'baby-001'

export default function AnalysisGrowthPage() {
  const [profile, setProfile] = useState<BabyProfileSummary | null>(null)
  const [pageData, setPageData] = useState<GetGrowthPageResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeRange, setActiveRange] = useState<GrowthRangeKey>('birth')
  const [activeMetric, setActiveMetric] = useState<GrowthMetricKey>('weight')

  useEffect(() => {
    Promise.all([
      getBabyProfile(),
      getGrowthPage(BABY_ID),
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

  const metricCards = useMemo(
    () => {
      if (!pageData) return []
      return pageData.metrics.map((metric) => ({
        ...metric,
        active: metric.key === activeMetric,
      }))
    },
    [pageData, activeMetric]
  )

  if (loading || !profile || !pageData) {
    return <View><Text>Loading...</Text></View>
  }

  const activeSnapshot = pageData.trends[activeRange][activeMetric]

  return (
    <AnalysisLayout profile={profile} activeCategory="growth">
      <InsightCard data={pageData.insight} />

      <View
        className="w-full bg-white rounded-[32px] p-4 flex flex-col gap-3"
        style={{
          border: `1px solid ${analysisColors.cardBorder}`,
          boxShadow: '0 4px 30px rgba(0,0,0,0.04)',
        }}
      >
        <MetricOverviewCard
          metrics={metricCards}
          onMetricChange={(key) => setActiveMetric(key as GrowthMetricKey)}
        />

        <View className="pt-1 flex flex-col gap-3">
          <View
            className="w-full rounded-[28px] p-2 flex items-center"
            style={{ backgroundColor: analysisColors.inactiveBg }}
          >
            {pageData.timeRanges.map((item) => {
              const isActive = item.key === activeRange

              return (
                <View
                  key={item.key}
                  className="flex-1 min-h-12 rounded-full px-2 flex items-center justify-center"
                  style={{
                    backgroundColor: isActive ? '#FFFFFF' : 'transparent',
                    boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                  }}
                  onClick={() => setActiveRange(item.key as GrowthRangeKey)}
                >
                  <Text
                    className="text-sm font-medium text-center"
                    style={{ color: isActive ? analysisColors.textPrimary : analysisColors.textSecondary }}
                  >
                    {item.label}
                  </Text>
                </View>
              )
            })}
          </View>

          <GrowthTrendChart
            points={activeSnapshot.points}
            chartLabel={activeSnapshot.chartLabel}
            comparisonLabel={activeSnapshot.comparisonLabel}
            dataSource="mock"
          />
          <MetricFooter
            age={activeSnapshot.footer.age}
            value={activeSnapshot.footer.value}
            badge={activeSnapshot.footer.badge}
          />
        </View>
      </View>

      <ChartCard
        title="Monthly Diet Composition"
        subtitle="Monthly dietary ratio summary"
        extra="Solids Exploring"
      >
        <DietDonutSummary
          ratio={pageData.monthlyDiet.ratio}
          title="Formula"
          legends={pageData.monthlyDiet.legends}
          dataSource="mock"
        />
        <IngredientToleranceCard
          title={pageData.monthlyDiet.badge}
          badge={`${pageData.monthlyDiet.ingredientCount} items`}
          ingredients={pageData.monthlyDiet.ingredients}
        />
      </ChartCard>

      <MilestoneProgressCard items={pageData.milestones} />
    </AnalysisLayout>
  )
}