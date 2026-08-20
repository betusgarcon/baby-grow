/**
 * 生长分析 Mock 数据
 * 严格匹配 src/types/growth.ts 中的类型定义
 */

import type {
  GrowthMetricKey,
  GrowthRangeKey,
  GrowthTrendSnapshot,
  GetGrowthPageResponse,
  GetGrowthTrendResponse,
  GrowthDataPoint,
  DietLegendItem,
} from '@/types/growth'

const growthMetricSnapshots: Record<GrowthRangeKey, Record<GrowthMetricKey, GrowthTrendSnapshot>> = {
  last3m: {
    height: {
      points: [
        { label: '11M', value: 75.8, referenceValue: 75.2 },
        { label: '12M', value: 77.2, referenceValue: 76.6 },
        { label: '13M', value: 79.1, referenceValue: 78.0 },
        { label: '14M', value: 82.0, referenceValue: 79.3 },
      ],
      chartLabel: 'Height (cm)',
      comparisonLabel: 'WHO Boy Height',
      footer: { age: '14 mo', value: '82 cm', badge: 'Stable (75%~85%)' },
    },
    weight: {
      points: [
        { label: '11M', value: 10.2, referenceValue: 9.6 },
        { label: '12M', value: 10.6, referenceValue: 9.9 },
        { label: '13M', value: 11.2, referenceValue: 10.2 },
        { label: '14M', value: 12.0, referenceValue: 10.4 },
      ],
      chartLabel: 'Weight (kg)',
      comparisonLabel: 'WHO Boy Weight',
      footer: { age: '14 mo', value: '12 kg', badge: 'High (85%~97%)' },
    },
    head: {
      points: [
        { label: '11M', value: 45.9, referenceValue: 45.3 },
        { label: '12M', value: 46.2, referenceValue: 45.6 },
        { label: '13M', value: 46.6, referenceValue: 45.9 },
        { label: '14M', value: 47.1, referenceValue: 46.1 },
      ],
      chartLabel: 'Head Circ. (cm)',
      comparisonLabel: 'WHO Head Circ.',
      footer: { age: '14 mo', value: '47.1 cm', badge: 'Balanced (60%~75%)' },
    },
  },
  last6m: {
    height: {
      points: [
        { label: '9M', value: 71.2, referenceValue: 70.1 },
        { label: '10M', value: 73.1, referenceValue: 72.2 },
        { label: '11M', value: 75.8, referenceValue: 75.2 },
        { label: '12M', value: 77.2, referenceValue: 76.6 },
        { label: '13M', value: 79.1, referenceValue: 78.0 },
        { label: '14M', value: 82.0, referenceValue: 79.3 },
      ],
      chartLabel: 'Height (cm)',
      comparisonLabel: 'WHO Boy Height',
      footer: { age: '14 mo', value: '82 cm', badge: 'Catch-up Stable' },
    },
    weight: {
      points: [
        { label: '9M', value: 9.0, referenceValue: 8.5 },
        { label: '10M', value: 9.6, referenceValue: 8.9 },
        { label: '11M', value: 10.2, referenceValue: 9.6 },
        { label: '12M', value: 10.6, referenceValue: 9.9 },
        { label: '13M', value: 11.2, referenceValue: 10.2 },
        { label: '14M', value: 12.0, referenceValue: 10.4 },
      ],
      chartLabel: 'Weight (kg)',
      comparisonLabel: 'WHO Boy Weight',
      footer: { age: '14 mo', value: '12 kg', badge: 'Fast Gain Window' },
    },
    head: {
      points: [
        { label: '9M', value: 45.1, referenceValue: 44.5 },
        { label: '10M', value: 45.4, referenceValue: 44.8 },
        { label: '11M', value: 45.9, referenceValue: 45.3 },
        { label: '12M', value: 46.2, referenceValue: 45.6 },
        { label: '13M', value: 46.6, referenceValue: 45.9 },
        { label: '14M', value: 47.1, referenceValue: 46.1 },
      ],
      chartLabel: 'Head Circ. (cm)',
      comparisonLabel: 'WHO Head Circ.',
      footer: { age: '14 mo', value: '47.1 cm', badge: 'Steady (65%~75%)' },
    },
  },
  birth: {
    height: {
      points: [
        { label: '0M', value: 50.0, referenceValue: 49.1 },
        { label: '1M', value: 54.0, referenceValue: 53.7 },
        { label: '2M', value: 57.5, referenceValue: 57.3 },
        { label: '3M', value: 61.0, referenceValue: 60.4 },
        { label: '4M', value: 63.2, referenceValue: 62.7 },
        { label: '5M', value: 65.3, referenceValue: 64.6 },
        { label: '6M', value: 67.1, referenceValue: 66.5 },
        { label: '7M', value: 68.4, referenceValue: 67.8 },
        { label: '8M', value: 69.5, referenceValue: 68.9 },
        { label: '9M', value: 71.2, referenceValue: 70.1 },
        { label: '10M', value: 73.1, referenceValue: 72.2 },
        { label: '11M', value: 75.8, referenceValue: 75.2 },
        { label: '12M', value: 77.2, referenceValue: 76.6 },
        { label: '13M', value: 79.1, referenceValue: 78.0 },
        { label: '14M', value: 82.0, referenceValue: 79.3 },
      ],
      chartLabel: 'Height (cm)',
      comparisonLabel: 'WHO Boy Height',
      footer: { age: '14 mo', value: '82 cm', badge: 'Tall (75%~85%)' },
    },
    weight: {
      points: [
        { label: '0M', value: 3.3, referenceValue: 3.3 },
        { label: '1M', value: 4.5, referenceValue: 4.5 },
        { label: '2M', value: 5.6, referenceValue: 5.6 },
        { label: '3M', value: 6.4, referenceValue: 6.1 },
        { label: '4M', value: 6.9, referenceValue: 6.6 },
        { label: '5M', value: 7.4, referenceValue: 7.1 },
        { label: '6M', value: 7.9, referenceValue: 7.5 },
        { label: '7M', value: 8.2, referenceValue: 7.8 },
        { label: '8M', value: 8.6, referenceValue: 8.1 },
        { label: '9M', value: 9.0, referenceValue: 8.5 },
        { label: '10M', value: 9.6, referenceValue: 8.9 },
        { label: '11M', value: 10.2, referenceValue: 9.6 },
        { label: '12M', value: 10.6, referenceValue: 9.9 },
        { label: '13M', value: 11.2, referenceValue: 10.2 },
        { label: '14M', value: 12.0, referenceValue: 10.4 },
      ],
      chartLabel: 'Weight (kg)',
      comparisonLabel: 'WHO Boy Weight',
      footer: { age: '14 mo', value: '12 kg', badge: 'High (85%~97%)' },
    },
    head: {
      points: [
        { label: '0M', value: 34.5, referenceValue: 34.5 },
        { label: '1M', value: 37.0, referenceValue: 36.5 },
        { label: '2M', value: 39.0, referenceValue: 38.3 },
        { label: '3M', value: 40.1, referenceValue: 39.9 },
        { label: '4M', value: 41.2, referenceValue: 41.0 },
        { label: '5M', value: 42.1, referenceValue: 41.8 },
        { label: '6M', value: 43.0, referenceValue: 42.7 },
        { label: '7M', value: 43.9, referenceValue: 43.4 },
        { label: '8M', value: 44.8, referenceValue: 44.1 },
        { label: '9M', value: 45.1, referenceValue: 44.5 },
        { label: '10M', value: 45.4, referenceValue: 44.8 },
        { label: '11M', value: 45.9, referenceValue: 45.3 },
        { label: '12M', value: 46.2, referenceValue: 45.6 },
        { label: '13M', value: 46.6, referenceValue: 45.9 },
        { label: '14M', value: 47.1, referenceValue: 46.1 },
      ],
      chartLabel: 'Head Circ. (cm)',
      comparisonLabel: 'WHO Head Circ.',
      footer: { age: '14 mo', value: '47.1 cm', badge: 'Balanced (60%~75%)' },
    },
  },
}

const growthMetrics: GetGrowthPageResponse['metrics'] = [
  { key: 'height', label: 'HEIGHT', value: '82', unit: 'cm', percentile: '75%~85%' },
  { key: 'weight', label: 'WEIGHT', value: '12', unit: 'kg', active: true, percentile: '85%~97%' },
  { key: 'head', label: 'HEAD CIRC.', value: '47.1', unit: 'cm', percentile: '60%~75%' },
]

const monthlyDietLegend: DietLegendItem[] = [
  { label: 'Formula/Breast', value: 55, colorClass: 'bg-[#E8DDCF]' },
  { label: 'Meals (Solids)', value: 30, colorClass: 'bg-[#D3DBC3]' },
  { label: 'Fruit/Snacks', value: 15, colorClass: 'bg-[#F2EDE5]' },
]

const milestones: GetGrowthPageResponse['milestones'] = [
  { label: 'First Roll', unlocked: true, icon: 'baby-roll' },
  { label: 'First Tooth', unlocked: true, icon: 'tooth' },
  { label: 'First Word', unlocked: true, icon: 'baby-speak' },
  { label: 'Walking', unlocked: false, icon: 'baby-walk' },
]

const timeRanges: GetGrowthPageResponse['timeRanges'] = [
  { key: 'last3m', label: 'Last 3M' },
  { key: 'last6m', label: 'Last 6M' },
  { key: 'birth', label: 'Since Birth' },
]

export const growthMockRoutes = [
  {
    path: '/api/baby/growth',
    handler: (): GetGrowthPageResponse => ({
      insight: {
        title: 'AI Growth Narrative',
        content:
          "Leo's height trajectory has been very steady. Over the past three months, his height closely aligns with the 75th percentile curve. This indicates his linear skeletal development is in a very healthy, symmetrical normal state, with no signs of dropping behind or surging abnormally.",
      },
      metrics: growthMetrics,
      timeRanges,
      trends: growthMetricSnapshots,
      monthlyDiet: {
        ratio: 55,
        title: 'Monthly Diet Composition',
        legends: monthlyDietLegend,
        ingredients: ['Carrot', 'Sweet Potato', 'Avocado'],
        ingredientCount: 3,
        badge: '3 new ingredients this month',
      },
      milestones,
    }),
  },
  {
    path: '/api/baby/growth/trend',
    handler: (params: Record<string, unknown>): GetGrowthTrendResponse => {
      const { metric = 'weight', range = 'last3m' } = params as {
        metric: GrowthMetricKey
        range: GrowthRangeKey
      }
      const snapshot = growthMetricSnapshots[range]?.[metric] ?? growthMetricSnapshots.last3m.weight
      const dataPoints: GrowthDataPoint[] = snapshot.points.map((p) => ({
        label: p.label,
        value: p.value,
      }))

      return {
        snapshot,
        metrics: dataPoints,
        insight: {
          title: `${snapshot.chartLabel} Analysis`,
          content: `Current percentile: ${snapshot.footer.badge}`,
        },
      }
    },
  },
]
