/**
 * 旅程时间线 Mock
 */

import { initialTimeline } from '@/store/timeline'

export const timelineMockRoutes = [
  {
    path: '/api/baby/timeline',
    handler: () => initialTimeline,
  },
]
