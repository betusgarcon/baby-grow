/**
 * 日历 Mock
 */

import { calendarEvents } from '@/pages/journey/calendar/calendarData'

export const calendarMockRoutes = [
  {
    path: '/api/baby/calendar-events',
    handler: () => calendarEvents,
  },
]
