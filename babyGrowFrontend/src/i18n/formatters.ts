import { t } from './index'
import type { MessageKey } from './messages'

/**
 * 日期与星期标签。
 *
 * 为什么放在这里而不是让各页面各自拼：中英文的日期**结构**不同——
 * 中文「10月12日」、英文「October 12」；直接替换单词拼不出正确语序。
 * 所以对外提供的是「给我一个日期，我给你本地化的整串」。
 */

const MONTH_NAME_KEYS: MessageKey[] = [
  'date.monthName.1',
  'date.monthName.2',
  'date.monthName.3',
  'date.monthName.4',
  'date.monthName.5',
  'date.monthName.6',
  'date.monthName.7',
  'date.monthName.8',
  'date.monthName.9',
  'date.monthName.10',
  'date.monthName.11',
  'date.monthName.12',
]

const MONTH_SHORT_KEYS: MessageKey[] = [
  'date.monthShort.1',
  'date.monthShort.2',
  'date.monthShort.3',
  'date.monthShort.4',
  'date.monthShort.5',
  'date.monthShort.6',
  'date.monthShort.7',
  'date.monthShort.8',
  'date.monthShort.9',
  'date.monthShort.10',
  'date.monthShort.11',
  'date.monthShort.12',
]

const WEEKDAY_MON_FIRST_KEYS: MessageKey[] = [
  'date.weekday.mon',
  'date.weekday.tue',
  'date.weekday.wed',
  'date.weekday.thu',
  'date.weekday.fri',
  'date.weekday.sat',
  'date.weekday.sun',
]

export const monthNames = (): string[] => MONTH_NAME_KEYS.map((key) => t(key))

export const monthShortNames = (): string[] => MONTH_SHORT_KEYS.map((key) => t(key))

/** 周一开头的七天标签（日历表头） */
export const weekdayLabelsMondayFirst = (): string[] =>
  WEEKDAY_MON_FIRST_KEYS.map((key) => t(key))

/** 周日开头的七天标签 */
export const weekdayLabelsSundayFirst = (): string[] => {
  const labels = weekdayLabelsMondayFirst()

  return [labels[6], ...labels.slice(0, 6)]
}

/** 「2026年10月」/「October 2026」 */
export const monthYearLabel = (date: Date): string =>
  t('date.monthYear', {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    monthName: monthNames()[date.getMonth()],
  })

/** 「10月12日」/「October 12」 */
export const monthDayLabel = (isoDate: string): string => {
  const [, month, day] = isoDate.split('-').map(Number)

  return t('date.monthDay', { month, day, monthName: monthNames()[month - 1] })
}

/** 日历页的当日标题：「10月12日 · 当日安排」/「OCTOBER 12 HIGHLIGHTS」 */
export const dayHeadingLabel = (isoDate: string): string => {
  const [, month, day] = isoDate.split('-').map(Number)

  return t('date.dayHeading', { month, day, monthName: monthNames()[month - 1] })
}

/** 「今天 / 昨天 / 3 天前 / 2 周前 / 1 个月前」 */
export const relativeDayLabel = (days: number): string => {
  if (days <= 0) return t('date.today')
  if (days === 1) return t('date.yesterday')
  if (days < 7) return t('date.daysAgo', { days })
  if (days < 14) return t('date.weeksAgo.one')
  if (days < 30) return t('date.weeksAgo.other', { weeks: Math.floor(days / 7) })

  return t('date.monthsAgo.other', { months: Math.floor(days / 30) })
}
