/**
 * 里程碑 Mock
 */

import { milestoneList } from '@/pages/journey/milestones/milestoneData'

export const milestonesMockRoutes = [
  {
    path: '/api/baby/milestones-list',
    handler: () => milestoneList,
  },
]
