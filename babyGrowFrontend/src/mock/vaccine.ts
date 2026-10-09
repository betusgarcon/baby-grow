/**
 * 事件详情（疫苗）Mock
 */

import { vaccineDetail } from '@/store/vaccine'

export const vaccineMockRoutes = [
  {
    path: '/api/baby/vaccine',
    handler: () => vaccineDetail,
  },
]
