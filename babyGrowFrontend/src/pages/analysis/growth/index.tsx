import { useMemo, useState } from 'react'
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
import AsyncSection from '@/components/AsyncSection'
import EmptyState from '@/components/EmptyState'
import { useAsyncData } from '@/hooks/useAsyncData'
import { analysisColors } from '@/pages/analysis/components/analysisTokens'
import { getGrowthPage } from '@/api/modules/growth'
import { t } from '@/i18n'
import type { GrowthMetricKey, GrowthRangeKey } from '@/types/analysis'

export default function AnalysisGrowthPage() {
  // 此前是页面局部 useState + `.then().finally()`，没有 catch：请求一失败就永久
  // 停在裸的 "Loading..."，而且那个分支没套 AnalysisLayout，连页头都没有。
  const { status, data: pageData, retry } = useAsyncData(getGrowthPage)
  const [activeRange, setActiveRange] = useState<GrowthRangeKey>('birth')
  const [activeMetric, setActiveMetric] = useState<GrowthMetricKey>('weight')

  const metricCards = useMemo(() => {
    if (!pageData) return []
    return pageData.metrics.map((metric) => ({
      ...metric,
      active: metric.key === activeMetric,
    }))
  }, [pageData, activeMetric])

  // 区间/指标是本地切换的，不重新取数。
  //
  // 两级下标都必须可选链：activeRange / activeMetric 是本地默认值（'birth' / 'weight'），
  // 后端若没给出这一档（比如没有 'birth' 分桶），`pageData.trends[activeRange]` 就是
  // undefined，再取 [activeMetric] 直接抛 TypeError。这发生在 render 期间，
  // 而小程序没有错误边界——整页白屏，且看不出是数据形状的问题。
  const activeSnapshot = pageData?.trends?.[activeRange]?.[activeMetric] ?? null

  return (
    <AnalysisLayout activeCategory="growth">
      <AsyncSection
        status={status}
        onRetry={retry}
        skeletonBlocks={3}
        skeletonHeight={160}
        isEmpty={pageData?.hasData === false}
        emptyState={
          <EmptyState
            icon="metric-weight"
            title={t('analysis.growth.empty')}
            description={t('analysis.growth.emptyDesc')}
          />
        }
      >
        {pageData && activeSnapshot ? (
          <>
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
                          style={{
                            color: isActive
                              ? analysisColors.textPrimary
                              : analysisColors.textSecondary,
                          }}
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
                />
                <MetricFooter
                  age={activeSnapshot.footer?.age ?? ''}
                  value={activeSnapshot.footer?.value ?? ''}
                  badge={activeSnapshot.footer?.badge ?? ''}
                />
              </View>
            </View>

            <ChartCard
              title={t('analysis.monthlyDietComposition')}
              subtitle={t('analysis.monthlyDietSubtitle')}
              extra={t('analysis.solidsExploring')}
            >
              <DietDonutSummary
                ratio={pageData.monthlyDiet.ratio}
                title={t('analysis.formula')}
                legends={pageData.monthlyDiet.legends}
              />
              <IngredientToleranceCard
                title={pageData.monthlyDiet.badge}
                badge={t(pageData.monthlyDiet.ingredientCount === 1 ? 'analysis.itemsCount.one' : 'analysis.itemsCount.other', { count: pageData.monthlyDiet.ingredientCount })}
                ingredients={pageData.monthlyDiet.ingredients}
              />
            </ChartCard>

            <MilestoneProgressCard items={pageData.milestones} />
          </>
        ) : null}
      </AsyncSection>
    </AnalysisLayout>
  )
}
