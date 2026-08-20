/**
 * 宝宝资料 Mock 数据
 */

import type { BabyProfileResponse } from '@/types/baby'
import babyAvatar from '@/assets/images/baby-journey-img.png'

export const babyMockRoutes = [
  {
    path: '/api/baby/profile',
    handler: (): BabyProfileResponse => ({
      profile: {
        id: 'baby-001',
        name: 'Leo',
        ageLabel: '1Y2M',
        statusLabel: 'Analysis • Mock Data',
        avatar: babyAvatar,
        gender: 'male',
        birthday: '2024-06-15',
      },
    }),
  },
]
