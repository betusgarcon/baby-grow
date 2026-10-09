/**
 * 宝宝画像 API
 */

import { http } from '@/api/request'
import type { ProfileState } from '@/store/appStore'

export function getProfile() {
  return http.get<ProfileState>('/api/baby/profile-detail')
}

export function updateProfile(patch: Partial<ProfileState>) {
  return http.put<ProfileState>('/api/baby/profile-detail', { ...patch })
}
