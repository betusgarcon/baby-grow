/**
 * 家庭分享·记忆检索 Mock
 */

import { memoryItems } from '@/pages/family/memories/memoriesData'

export const memoriesMockRoutes = [
  {
    path: '/api/family/memories',
    handler: () => memoryItems,
  },
]
