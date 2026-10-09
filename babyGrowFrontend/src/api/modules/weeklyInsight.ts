/**
 * 每周小记 API
 */

import { http } from '@/api/request'
import type { WeeklyInsight } from '@/pages/journey/weekly-insight/weeklyInsightData'

export function getWeeklyInsight() {
  return http.get<WeeklyInsight>('/api/baby/weekly-insight')
}
