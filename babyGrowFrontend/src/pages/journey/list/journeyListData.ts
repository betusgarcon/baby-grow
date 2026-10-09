/**
 * 时光旅程时间线列表的视图数据。
 * 后端接口未实现，先用本地 mock；接入 API 后整体删除即可。
 */

import firstSmileImg from '@/assets/images/first-smile-img.png'

/** 卡片形态。决定标记图标与卡片内部的排版方式 */
export type JourneyEntryType = 'memory' | 'feeding' | 'sleep'

/** 对应筛选 chip 的 key，用于按事件类型过滤 */
export type EventFilterKey = 'all' | 'milestones' | 'photos' | 'health'

export interface JourneyEntry {
  id: string
  type: JourneyEntryType
  filterKey: Exclude<EventFilterKey, 'all'>
  /** 展示用时间：单点如 "2:30 PM"，区间如 "8:00 PM - 6:30 AM" */
  time: string
  /** 卡片左上角角标文案 */
  badge: string
  title: string
  /** memory 形态 */
  image?: string
  description?: string
  /** feeding 形态 */
  amount?: string
  method?: string
  /** sleep 形态 */
  duration?: string
  /** sleep 形态：进度条填充比例 0~1 */
  progress?: number
  wakingCount?: number
}

export interface JourneyDayGroup {
  id: string
  label: string
  entries: JourneyEntry[]
}

export const eventFilters: Array<{ key: EventFilterKey; label: string }> = [
  { key: 'all', label: 'All Events' },
  { key: 'milestones', label: 'Milestones' },
  { key: 'photos', label: 'Photos' },
  { key: 'health', label: 'Health' },
]

/** 月份切换的可选项。接入接口后改为按月拉取 */
export const monthOptions = ['October 2023', 'September 2023', 'August 2023', 'July 2023']

export const defaultMonth = 'October 2023'

export const journeyTimeline: JourneyDayGroup[] = [
  {
    id: 'today',
    label: 'Today • Oct 24',
    entries: [
      {
        id: 'memory-first-laugh',
        type: 'memory',
        filterKey: 'photos',
        time: '2:30 PM',
        badge: 'MEMORY',
        title: 'First real laugh!',
        image: firstSmileImg,
        description:
          'Captured a beautiful moment during tummy time. The sound was so gentle and surprising.',
      },
      {
        id: 'feeding-bottle',
        type: 'feeding',
        filterKey: 'health',
        time: '11:15 AM',
        badge: 'FEEDING',
        title: 'Bottle',
        amount: '4 oz',
        method: 'Formula',
      },
    ],
  },
  {
    id: 'yesterday',
    label: 'Yesterday • Oct 23',
    entries: [
      {
        id: 'sleep-night',
        type: 'sleep',
        filterKey: 'health',
        time: '8:00 PM - 6:30 AM',
        badge: 'SLEEP',
        title: 'Night Sleep',
        duration: '10h 30m',
        progress: 0.92,
        wakingCount: 1,
      },
    ],
  },
]
