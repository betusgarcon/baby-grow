/**
 * 每周小记 Mock
 */

import { weeklyInsight } from '@/pages/journey/weekly-insight/weeklyInsightData'

export const weeklyInsightMockRoutes = [
  {
    path: '/api/baby/weekly-insight',
    handler: () => weeklyInsight,
  },
]
