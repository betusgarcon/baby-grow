/**
 * 时光旅程时间线列表的视图数据。
 *
 * 时间线改成扁平数组 + ISO 日期：分组由 groupTimelineByDate 现算。
 * 这样记录弹层保存的新条目可以直接 push 进来，而不必去改某一个分组。
 *
 * 后端接口未实现，先用本地 mock；接入 API 后整体删除即可。
 */

import firstSmileImg from '@/assets/images/first-smile-img.jpg'
import { t, type MessageKey } from '@/i18n'
import { monthDayLabel, monthYearLabel, relativeDayLabel } from '@/i18n/formatters'

/** 卡片形态。决定标记图标与卡片内部的排版方式 */
export type JourneyEntryType = 'memory' | 'feeding' | 'sleep'

/** 对应筛选 chip 的 key，用于按事件类型过滤 */
export type EventFilterKey = 'all' | 'milestones' | 'photos' | 'health'

export interface JourneyEntry {
  id: string
  /** ISO 日期 YYYY-MM-DD。存结构而不是展示串，分组和筛选才能按日期真实生效 */
  date: string
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

export interface TimelineGroup {
  date: string
  label: string
  entries: JourneyEntry[]
}

export const eventFilters: Array<{ key: EventFilterKey; labelKey: MessageKey }> = [
  { key: 'all', labelKey: 'list.filter.all' },
  { key: 'milestones', labelKey: 'list.filter.milestones' },
  { key: 'photos', labelKey: 'list.filter.photos' },
  { key: 'health', labelKey: 'list.filter.health' },
]

const pad = (value: number) => String(value).padStart(2, '0')

export const toIsoDate = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

/** 相对今天往前推 n 天。mock 用相对日期，好让「今天 / 昨天」的分组标题是真的 */
export const daysAgo = (days: number) => {
  const date = new Date()

  date.setDate(date.getDate() - days)

  return toIsoDate(date)
}

/** 当前的 HH:MM，供新记录作为展示时间 */
export const currentTimeLabel = () => {
  const now = new Date()

  return `${pad(now.getHours())}:${pad(now.getMinutes())}`
}

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())

const diffDaysFromToday = (isoDate: string) => {
  const [year, month, day] = isoDate.split('-').map(Number)
  const target = startOfDay(new Date(year, month - 1, day))

  return Math.round((startOfDay(new Date()).getTime() - target.getTime()) / 86400000)
}

/** 「几天前」这种口语化标签，首页的 Recent Milestones 用 */
export const relativeLabelOf = (isoDate: string) => relativeDayLabel(diffDaysFromToday(isoDate))

/** 分组标题：今天 / 昨天 / 具体日期 */
export const formatDayLabel = (isoDate: string) => {
  const formatted = monthDayLabel(isoDate)
  const days = diffDaysFromToday(isoDate)

  if (days === 0) return t('date.todayWith', { date: formatted })
  if (days === 1) return t('date.yesterdayWith', { date: formatted })

  return formatted
}

/** 按月分组并排序（近的在前），供页面直接渲染 */
export const groupTimelineByDate = (entries: JourneyEntry[]): TimelineGroup[] => {
  const grouped = new Map<string, JourneyEntry[]>()

  entries.forEach((entry) => {
    grouped.set(entry.date, [...(grouped.get(entry.date) ?? []), entry])
  })

  return [...grouped.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([date, list]) => ({ date, label: formatDayLabel(date), entries: list }))
}

/**
 * 月份切换的可选项：从当月往前推 4 个月。
 *
 * 值是 `YYYY-MM`（稳定的比较键），显示走 `monthOptionLabel()`——
 * 不能把本地化文案当值，否则换语言后选择器就认不出当前选中项了。
 */
export const monthOptions = Array.from({ length: 4 }, (_, index) => {
  const date = new Date()

  date.setMonth(date.getMonth() - index)

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`
})

export const monthOptionLabel = (value: string) => {
  const [year, month] = value.split('-').map(Number)

  return monthYearLabel(new Date(year, month - 1, 1))
}

export const defaultMonth = monthOptions[0]

/** 初始时间线。记录弹层保存的新条目会追加到这个数组后面 */
export const initialTimeline: JourneyEntry[] = [
  {
    id: 'memory-first-laugh',
    date: daysAgo(0),
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
    date: daysAgo(0),
    type: 'feeding',
    filterKey: 'health',
    time: '11:15 AM',
    badge: 'FEEDING',
    title: 'Bottle',
    amount: '4 oz',
    method: 'Formula',
  },
  {
    id: 'sleep-night',
    date: daysAgo(1),
    type: 'sleep',
    filterKey: 'health',
    time: '8:00 PM - 6:30 AM',
    badge: 'SLEEP',
    title: 'Night Sleep',
    duration: '10h 30m',
    progress: 0.92,
    wakingCount: 1,
  },
]

/**
 * 由记录弹层的识别结果构造一条时间线条目。
 * 有图归到 Photos，纯文字归到 Health——沿用现有的四个筛选分类。
 */
export const buildTimelineEntryFromRecord = (params: {
  title: string
  summary: string
  text: string
  photo: string | null
}): JourneyEntry => ({
  id: `record-${Date.now()}`,
  date: daysAgo(0),
  type: 'memory',
  filterKey: params.photo ? 'photos' : 'health',
  time: currentTimeLabel(),
  badge: 'AI LOG',
  title: params.title,
  image: params.photo ?? undefined,
  description: params.text.trim() || params.summary,
})
