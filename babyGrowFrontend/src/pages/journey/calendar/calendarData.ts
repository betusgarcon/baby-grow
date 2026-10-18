import type { RouteId } from '@/utils/routes'
import { daysAgo } from '@/store/timeline'
import { dayHeadingLabel, monthShortNames, monthYearLabel } from '@/i18n/formatters'

/**
 * 日历页的视图数据。
 * 后端接口未实现，先用本地 mock；接入 API 后整体删除。
 */

export type CalendarEventTone = 'vaccine' | 'milestone'

export interface CalendarEvent {
  id: string
  /** ISO 日期 YYYY-MM-DD */
  date: string
  title: string
  subtitle: string
  tone: CalendarEventTone
  /** 点击后去哪里。跳转关系直接挂在数据上，页面不写死 */
  route: RouteId
}

export interface CalendarCell {
  key: string
  /** 该格显示的日期数字；月首尾的补空为 null */
  day: number | null
  /** ISO 日期，补空格为 null */
  date: string | null
  isSelected: boolean
  /** 当天的记录点颜色，用 tailwind 类名，页面不写死色值 */
  dotClasses: string[]
}

/**
 * 表头与月份标签都要按语言生成——所以导出**函数**而不是数组。
 * 模块级常量会在模块加载时固化成当时的语言，切换语言后不会更新。
 */
export { weekdayLabelsSundayFirst as weekdayLabels } from '@/i18n/formatters'

const TONE_DOT_CLASS: Record<CalendarEventTone, string> = {
  vaccine: 'bg-secondary',
  milestone: 'bg-tertiary',
}

/**
 * 年月选择器用到的候选项。
 * 年份从当前年份往前推 5 年，必须动态生成——写死的话跨年就会少掉当前年份。
 */
const CURRENT_YEAR = new Date().getFullYear()

/** 月份候选：显示用本地化短名，选择结果仍是 1..12 的序数（不依赖文案） */
export const monthLabels = () => monthShortNames()
export const yearOptions = Array.from({ length: 6 }, (_, index) =>
  String(CURRENT_YEAR - 5 + index),
)

const pad = (value: number) => String(value).padStart(2, '0')

export const toIsoDate = (year: number, month: number, day: number) =>
  `${year}-${pad(month)}-${pad(day)}`

export const formatMonthLabel = (year: number, month: number) =>
  monthYearLabel(new Date(year, month - 1, 1))

export const formatDayHeading = (isoDate: string) => dayHeadingLabel(isoDate)

/**
 * 生成 6x7 的月历网格。固定 42 格，避免切换月份时高度跳动。
 */
export const buildMonthGrid = (
  year: number,
  month: number,
  selectedDate: string,
  events: CalendarEvent[],
): CalendarCell[] => {
  const leadingBlanks = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()

  const dotsByDate = events.reduce<Record<string, string[]>>((acc, event) => {
    acc[event.date] = [...(acc[event.date] ?? []), TONE_DOT_CLASS[event.tone]]
    return acc
  }, {})

  return Array.from({ length: 42 }, (_, index) => {
    const day = index - leadingBlanks + 1

    if (day < 1 || day > daysInMonth) {
      return { key: `blank-${index}`, day: null, date: null, isSelected: false, dotClasses: [] }
    }

    const date = toIsoDate(year, month, day)

    return {
      key: date,
      day,
      date,
      isSelected: date === selectedDate,
      dotClasses: dotsByDate[date] ?? [],
    }
  })
}

export const eventsForDate = (events: CalendarEvent[], isoDate: string) =>
  events.filter((event) => event.date === isoDate)

export const calendarEvents: CalendarEvent[] = [
  {
    id: 'vaccine-hepb-oct10',
    date: daysAgo(0),
    title: 'Vaccine: HepB',
    subtitle: '10:30 AM • Clinic Visit',
    tone: 'vaccine',
    route: 'journey-vaccine',
  },
  {
    id: 'milestone-first-smile-oct10',
    date: daysAgo(0),
    title: 'First Smile!',
    subtitle: 'Recorded by Sarah',
    tone: 'milestone',
    route: 'journey-milestones',
  },
  {
    id: 'milestone-first-word-oct02',
    date: daysAgo(3),
    title: 'First Word',
    subtitle: 'Recorded by Sarah',
    tone: 'milestone',
    route: 'journey-milestones',
  },
  {
    id: 'vaccine-flu-oct03',
    date: daysAgo(3),
    title: 'Flu Shot',
    subtitle: '02:00 PM • Clinic Visit',
    tone: 'vaccine',
    route: 'journey-vaccine',
  },
  {
    id: 'milestone-roll-over-oct03',
    date: daysAgo(3),
    title: 'Rolling Over',
    subtitle: 'Recorded by Leo',
    tone: 'milestone',
    route: 'journey-milestones',
  },
  {
    id: 'milestone-slept-through-oct09',
    date: daysAgo(6),
    title: 'Slept Through The Night',
    subtitle: 'Recorded by Sarah',
    tone: 'milestone',
    route: 'journey-milestones',
  },
]
