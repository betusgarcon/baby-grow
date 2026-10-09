/**
 * 心愿清单 Mock
 */

import { wishes } from '@/store/wishes'

export const wishesMockRoutes = [
  {
    path: '/api/wishes',
    handler: () => wishes,
  },
]
