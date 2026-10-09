/**
 * 宝宝画像 Mock
 */

import { babyProfile, defaultBirthday } from '@/store/profile'

export const profileMockRoutes = [
  {
    path: '/api/baby/profile-detail',
    handler: () => ({
      name: babyProfile.name,
      birthday: defaultBirthday,
      info: babyProfile.info,
      preferences: babyProfile.preferences,
    }),
  },
]
