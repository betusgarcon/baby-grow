/**
 * 家庭分享·记忆检索 API
 */

import { http } from '@/api/request'
import type { MemoryItem } from '@/pages/family/memories/memoriesData'

export function getMemories() {
  return http.get<MemoryItem[]>('/api/family/memories')
}
