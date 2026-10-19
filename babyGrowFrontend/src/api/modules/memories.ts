/**
 * 家庭分享·记忆检索 API
 */

import { http } from '@/api/request'
import type { MemoryItem } from '@/pages/family/memories/memoriesData'
import type { CursorPage } from '@/types/common'

export interface MemoryQuery {
  range?: string
  category?: string
  media?: string
  q?: string
  limit?: number
  cursor?: string | null
}

export function getMemories(params: MemoryQuery = {}) {
  return http.get<CursorPage<MemoryItem>>('/api/family/memories', { ...params })
}
