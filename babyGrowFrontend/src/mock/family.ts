/**
 * 家庭分享 Mock
 */

import { familyMembers } from '@/store/family'

export const familyMockRoutes = [
  {
    path: '/api/family/members',
    handler: () => familyMembers,
  },
]
