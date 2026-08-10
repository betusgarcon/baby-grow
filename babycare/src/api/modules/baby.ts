/**
 * 宝宝资料 API
 * 页面只调用这些函数，不直接访问 mock
 */

import { http } from '@/api/request'
import type { BabyProfileResponse } from '@/types/baby'

/** 获取宝宝资料 */
export function getBabyProfile() {
  return http.get<BabyProfileResponse>('/api/baby/profile')
}
