/**
 * 情绪分析 Mock 数据
 * 严格匹配 src/types/mood.ts 中的类型定义
 */

import type {
  GetMoodCalendarResponse,
  GetMoodCheckinOptionsResponse,
  MoodCalendarDay,
  MoodLegendItem,
  MoodCheckinOption,
} from '@/types/mood'

const moodCalendarDays: MoodCalendarDay[] = [
  { day: 30, type: 'empty' },
  { day: 1, type: 'happy' },
  { day: 2, type: 'discomfort' },
  { day: 3, type: 'clingy', highlighted: true },
  { day: 4, type: 'happy' },
  { day: 5, type: 'discomfort' },
  { day: 6, type: 'discomfort' },
  { day: 7, type: 'discomfort' },
  { day: 8, type: 'happy' },
  { day: 9, type: 'happy' },
  { day: 10, type: 'discomfort' },
  { day: 11, type: 'clingy' },
  { day: 12, type: 'clingy' },
  { day: 13, type: 'clingy' },
  { day: 14, type: 'clingy' },
  { day: 15, type: 'happy' },
  { day: 16, type: 'happy' },
  { day: 17, type: 'clingy', highlighted: true },
  { day: 18, type: 'happy' },
  { day: 19, type: 'happy' },
  { day: 20, type: 'discomfort' },
  { day: 21, type: 'happy' },
  { day: 22, type: 'happy' },
  { day: 23, type: 'discomfort' },
  { day: 24, type: 'happy' },
  { day: 25, type: 'happy' },
  { day: 26, type: 'discomfort' },
  { day: 27, type: 'happy' },
  { day: 28, type: 'happy' },
  { day: 29, type: 'happy' },
]

const moodLegend: MoodLegendItem[] = [
  { label: '开心', colorClass: 'bg-[#CFD8C7]' },
  { label: '黏人烦躁', colorClass: 'bg-[#E7C9B7]' },
  { label: '身体不适', colorClass: 'bg-[#C1CDD3]' },
]

const moodCheckinOptions: MoodCheckinOption[] = [
  {
    key: 'happy',
    label: '开心能量',
    emoji: '☺',
    activeColor: '#68825f',
    activeBg: '#edf5e7',
    inactiveBg: '#f4f2ee',
  },
  {
    key: 'clingy',
    label: '黏人烦躁',
    emoji: '☹',
    activeColor: '#9a6947',
    activeBg: '#f5e3d8',
    inactiveBg: '#f4f2ee',
  },
  {
    key: 'discomfort',
    label: '身体不适',
    emoji: '☹',
    activeColor: '#68828d',
    activeBg: '#e8eff2',
    inactiveBg: '#f4f2ee',
  },
]

export const moodMockRoutes = [
  {
    path: '/api/baby/mood/calendar',
    handler: (): GetMoodCalendarResponse => ({
      days: moodCalendarDays,
      legends: moodLegend,
      insight: {
        title: 'AI Mood',
        content:
          'Compared with this month\'s mood calendar, Leo showed a concentrated "clingy & fussy" pattern between June 11th and 14th. Cross-checking with milestone data, this aligns with front tooth eruption, so the discomfort is most likely caused by teething pain instead of a long-term mood regression.',
      },
    }),
  },
  {
    path: '/api/baby/mood/checkin-options',
    handler: (): GetMoodCheckinOptionsResponse => ({
      options: moodCheckinOptions,
    }),
  },
]
