/**
 * 里程碑列表页的视图数据。
 *
 * 后端接口未实现，先用本地 mock；接入 API 后这个文件整体删掉即可，
 * 页面只依赖下面的类型，不依赖数据来源。
 */

import { daysAgo } from '@/store/timeline'
import { t } from '@/i18n'
import { monthNames, monthShortNames } from '@/i18n/formatters'

/** 卡片档位，决定图标圆底与右上角光晕的渐变配色 */
export type MilestoneTier = 'gold' | 'silver' | 'bronze'

/** 标签色调，映射到 tailwind 里的容器色 token，页面不写死具体色值 */
export type TagTone = 'tertiary' | 'secondary' | 'primary' | 'neutral'

export interface MilestoneTag {
  label: string
  tone: TagTone
}

export interface Milestone {
  id: string
  title: string
  description: string
  /** ISO 日期（YYYY-MM-DD）。存结构而不是展示串，筛选才能按年月真实生效 */
  date: string
  /** Icon 组件里的图标名 */
  icon: string
  tier: MilestoneTier
  tags: MilestoneTag[]
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** 把 ISO 日期格式化成设计稿里的日期文案（按语言） */
export const formatMilestoneDate = (isoDate: string) => {
  const [year, month, day] = isoDate.split('-').map(Number)

  return t('date.monthDayYear', {
    year,
    month,
    day,
    monthName: monthNames()[month - 1],
  })
}

/**
 * 月份的**显示**文案。筛选值仍是 MONTH_LABELS 里的英文短名——
 * 它是与 `milestoneMonth()` 比较的键，不能换成翻译后的文案。
 */
export const milestoneMonthLabel = (value: string) => {
  if (value === 'All') return t('milestones.all')

  const index = MONTH_LABELS.indexOf(value)

  return index >= 0 ? monthShortNames()[index] : value
}

export const milestoneMonth = (isoDate: string) => MONTH_LABELS[Number(isoDate.split('-')[1]) - 1]

export const milestoneYear = (isoDate: string) => isoDate.split('-')[0]

export interface PhotoMemory {
  tag: string
  title: string
}

export const milestoneList: Milestone[] = [
  {
    id: 'first-steps',
    title: 'First Steps',
    description: 'Three unassisted steps across the living room rug. Pure joy and a lot of giggles.',
    date: daysAgo(2),
    icon: 'milestone-walk',
    tier: 'gold',
    tags: [
      { label: 'Physical', tone: 'tertiary' },
      { label: 'Major Leap', tone: 'secondary' },
    ],
  },
  {
    id: 'first-word',
    title: 'First Word',
    description: 'Said "Mama" while pointing at the cat. We\'ll take it as a win!',
    date: daysAgo(9),
    icon: 'milestone-speak',
    tier: 'silver',
    tags: [
      { label: 'Cognitive', tone: 'primary' },
      { label: 'Speech', tone: 'neutral' },
    ],
  },
  {
    id: 'slept-through-night',
    title: 'Slept Through The Night',
    description: 'A full 8 hours of uninterrupted sleep. A milestone for baby and parents alike.',
    date: daysAgo(21),
    icon: 'milestone-sleep',
    tier: 'gold',
    tags: [
      { label: 'Sleep', tone: 'tertiary' },
      { label: 'Parent Win', tone: 'secondary' },
    ],
  },
  {
    id: 'first-solid-food',
    title: 'First Solid Food',
    description: 'Tried mashed sweet potatoes. Mostly ended up on the bib, but seemed to enjoy the taste.',
    date: daysAgo(45),
    icon: 'milestone-food',
    tier: 'bronze',
    tags: [
      { label: 'Nutrition', tone: 'primary' },
      { label: 'Discovery', tone: 'neutral' },
    ],
  },
]

export const photoMemory: PhotoMemory = {
  tag: 'First Laugh',
  title: 'The sweetest sound',
}

/** 筛选区的可选项 */
export const monthOptions = ['All', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/**
 * 年份按当前年份生成，不能写死。
 *
 * 原先是 ['2025','2024','2023']，而页面默认筛的是**当年**（new Date().getFullYear()）。
 * 于是选择器的取值范围里根本没有当前年：价值上默认选中落在 index 0（显示成 2023），
 * 用户一旦真的去选一个年份，`year` 就变成 2025 或更早，而里程碑日期是相对今天生成的，
 * 结果就是**一选必空**。日历页早就是按当前年份算的，这里对齐它。
 */
const CURRENT_YEAR = new Date().getFullYear()

export const yearOptions = Array.from({ length: 6 }, (_, index) =>
  String(CURRENT_YEAR - 5 + index),
)
