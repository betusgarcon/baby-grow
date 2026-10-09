/**
 * 旅程时间线 API
 *
 * 页面只依赖 store，store 通过这一层取数——接后端时只需把 mock 路由换成
 * 真实接口，页面与 store 都不用改。
 */

import { http } from '@/api/request'
import type { JourneyEntry } from '@/store/timeline'

export function getTimeline() {
  return http.get<JourneyEntry[]>('/api/baby/timeline')
}

export function addTimelineEntry(entry: JourneyEntry) {
  return http.post<JourneyEntry>('/api/baby/timeline', { ...entry })
}
