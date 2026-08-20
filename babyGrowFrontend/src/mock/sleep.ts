/**
 * 睡眠分析 Mock 数据
 * 严格匹配 src/types/sleep.ts 中的类型定义
 */

import type {
  GetSleepCircadianResponse,
  GetDailySleepLogsResponse,
  GetSleepEvolutionResponse,
  SleepCircadianSummary,
  DailySleepLog,
  SleepEvolutionRow,
} from '@/types/sleep'

const sleepCircadianSummary: SleepCircadianSummary = {
  totalSleepLabel: '18h 30m',
  goalLabel: 'Goal: 95%',
  nightLabel: '9h 30m',
  napLabel: '9h total',
  segments: [
    { label: 'Night Sleep', value: 9.5, color: '#97a8af' },
    { label: 'Nap Sleep', value: 9, color: '#d8a08a' },
    { label: 'Awake Time', value: 5.5, color: '#d1dbc2' },
  ],
}

const dailySleepLogs: DailySleepLog[] = [
  {
    id: 'morning',
    title: 'Morning Nap',
    range: '12:30 — 14:00',
    duration: '1h 30m',
    type: 'nap',
    icon: 'nap',
  },
  {
    id: 'afternoon',
    title: 'Afternoon Nap',
    range: '16:15 — 17:45',
    duration: '1h 30m',
    type: 'nap',
    icon: 'nap',
  },
]

const sleepEvolutionRows: SleepEvolutionRow[] = [
  {
    label: '1个月 (新生期)',
    summary: '15.5h / 碎觉频发',
    segments: [
      { startHour: 19, duration: 7, type: 'night' },
      { startHour: 2, duration: 2, type: 'awake' },
      { startHour: 4, duration: 2, type: 'night' },
      { startHour: 6, duration: 3, type: 'awake' },
      { startHour: 9, duration: 2, type: 'nap' },
      { startHour: 11, duration: 3, type: 'awake' },
      { startHour: 14, duration: 3, type: 'nap' },
      { startHour: 17, duration: 2, type: 'awake' },
    ],
  },
  {
    label: '6个月 (过渡期)',
    summary: '13.5h / 2次午睡',
    segments: [
      { startHour: 20, duration: 10, type: 'night' },
      { startHour: 6, duration: 2.5, type: 'awake' },
      { startHour: 8.5, duration: 1.5, type: 'nap' },
      { startHour: 10, duration: 2, type: 'awake' },
      { startHour: 12, duration: 2, type: 'nap' },
      { startHour: 14, duration: 4, type: 'awake' },
      { startHour: 18, duration: 2, type: 'nap' },
    ],
  },
  {
    label: '12个月 (当前)',
    summary: '12h / 单次长夜觉+1午觉',
    segments: [
      { startHour: 20, duration: 12, type: 'night' },
      { startHour: 8, duration: 4, type: 'awake' },
      { startHour: 12, duration: 2, type: 'nap' },
      { startHour: 14, duration: 4, type: 'awake' },
      { startHour: 18, duration: 2, type: 'awake' },
    ],
  },
]

export const sleepMockRoutes = [
  {
    path: '/api/baby/sleep/circadian',
    handler: (): GetSleepCircadianResponse => ({
      summary: sleepCircadianSummary,
    }),
  },
  {
    path: '/api/baby/sleep/logs',
    handler: (): GetDailySleepLogsResponse => ({
      logs: dailySleepLogs,
      insight: {
        title: '12-Month Development & Sleep',
        content:
          'At 12 months, many babies are transitioning from two naps to one. Increased standing and walking practice may trigger short-term night waking. A stable pre-sleep ritual remains the key to rhythm stability.',
      },
    }),
  },
  {
    path: '/api/baby/sleep/evolution',
    handler: (): GetSleepEvolutionResponse => ({
      rows: sleepEvolutionRows,
      insight: {
        title: 'AI Sleep Consolidation',
        content:
          'Comparing month 1, month 6 and month 12, Leo has completed a clear sleep consolidation process. Night sleep shifted from fragmented short cycles into a regular long stretch, while naps merged into a more stable single nap rhythm.',
      },
    }),
  },
]
