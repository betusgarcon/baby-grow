/**
 * 里程碑 API
 */

import { http } from '@/api/request'
import type { Milestone } from '@/pages/journey/milestones/milestoneData'

export function getMilestones() {
  return http.get<Milestone[]>('/api/baby/milestones-list')
}
