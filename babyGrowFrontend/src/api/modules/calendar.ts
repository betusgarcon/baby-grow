/**
 * 日历 API
 */

import { http } from '@/api/request'
import type { CalendarEvent } from '@/pages/journey/calendar/calendarData'

export function getCalendarEvents() {
  return http.get<CalendarEvent[]>('/api/baby/calendar-events')
}
