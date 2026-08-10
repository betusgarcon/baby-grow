/**
 * 饮食分析 Mock 数据
 * 严格匹配 src/types/diet.ts 中的类型定义
 */

import type {
  GetWeeklyDietResponse,
  GetMonthlyDietResponse,
  DietBarItem,
  DietRatioItem,
} from '@/types/diet'

const weeklyBars: DietBarItem[] = [
  { label: 'Mon', value: 710 },
  { label: 'Tue', value: 650 },
  { label: 'Wed', value: 600 },
  { label: 'Thu', value: 750, highlighted: true },
  { label: 'Fri', value: 680 },
  { label: 'Sat', value: 700 },
  { label: 'Sun', value: 670 },
]

const dietLegends: DietRatioItem[] = [
  { label: 'Formula/Breast', value: 55, colorClass: 'bg-[#E8DDCF]' },
  { label: 'Meals (Solids)', value: 30, colorClass: 'bg-[#D3DBC3]' },
  { label: 'Fruit/Snacks', value: 15, colorClass: 'bg-[#F2EDE5]' },
]

export const dietMockRoutes = [
  {
    path: '/api/baby/diet/weekly',
    handler: (): GetWeeklyDietResponse => ({
      bars: weeklyBars,
      averageLabel: 'Average: 676 ml/day',
      standardLabel: 'Standard: 700 ml/day',
      narrativeNote:
        'This week showed a slightly lower milk intake on Wednesday. No significant pattern of concern was observed.',
      insight: {
        title: 'AI 1Y2M Feeding Suggestion',
        content:
          'Because Leo has fully adapted to semi-solid food, the milk portion can gradually stay within 500ml–600ml. Introduce more finely chopped textures like shredded chicken or tiny noodles to support chewing strength and oral motor development.',
      },
    }),
  },
  {
    path: '/api/baby/diet/monthly',
    handler: (): GetMonthlyDietResponse => ({
      title: 'Monthly Diet Composition',
      subtitle: 'October 2024',
      extra: '3 new ingredients introduced',
      donut: {
    ratio: 55,
        title: 'Diet Ratio',
        legends: dietLegends,
      },
      ingredients: {
        title: 'New Ingredients This Month',
        badge: '3 items',
        list: ['Carrot', 'Sweet Potato', 'Avocado'],
      },
      insight: {
        title: 'AI Nutrition Analysis',
        content:
          'Leo\'s dietary composition is well-balanced. The ratio of formula to solids is appropriate for his age. Consider introducing more protein-rich foods like egg yolk and minced meat.',
      },
    }),
  },
]
