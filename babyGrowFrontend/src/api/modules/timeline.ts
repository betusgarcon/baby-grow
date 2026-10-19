/**
 * 旅程时间线 API
 *
 * 页面只依赖 store，store 通过这一层取数——接后端时只需把 mock 路由换成
 * 真实接口，页面与 store 都不用改。
 */

import { http } from '@/api/request'
import type { JourneyEntry } from '@/store/timeline'
import type { CursorPage } from '@/types/common'

export interface TimelineQuery {
  month?: string
  filter?: string
  limit?: number
  cursor?: string | null
}

export function getTimeline(params: TimelineQuery = {}) {
  return http.get<CursorPage<JourneyEntry>>('/api/baby/timeline', { ...params })
}

export function addTimelineEntry(entry: JourneyEntry) {
  return http.post<JourneyEntry>('/api/baby/timeline', { ...entry })
}
