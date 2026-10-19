/**
 * 里程碑 API
 */

import { http } from '@/api/request'
import type { Milestone } from '@/pages/journey/milestones/milestoneData'
import type { CursorPage } from '@/types/common'

export interface MilestoneQuery {
  year?: string
  month?: string
  q?: string
  limit?: number
  cursor?: string | null
}

export function getMilestones(params: MilestoneQuery = {}) {
  return http.get<CursorPage<Milestone>>('/api/baby/milestones-list', { ...params })
}
