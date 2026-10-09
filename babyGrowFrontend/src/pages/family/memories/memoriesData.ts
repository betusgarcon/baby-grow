/**
 * 家庭分享·记忆检索的视图数据。
 * 版式与文案取自 design_sources/stitch/family_share/，属上一轮 AI 产物。
 * 后端接口未实现，先用本地 mock。
 */

/** 卡片角标的配色。设计稿里六种分类各有识别色，按 analysis / wish 的先例收成一组 */
export type MemoryTone = 'green' | 'peach' | 'grey' | 'blue'

export interface MemoryItem {
  id: string
  category: string
  title: string
  date: string
  tone: MemoryTone
  /** 供筛选面板匹配的分类标签，与卡片上展示的 category 不一定同名 */
  tags: string[]
  media: 'Media' | 'Text'
}

export const TONE_CLASS: Record<MemoryTone, { pill: string; photo: string }> = {
  green: { pill: 'bg-tertiary-fixed text-on-tertiary-container', photo: 'bg-tertiary-container' },
  peach: {
    pill: 'bg-secondary-container text-on-secondary-container',
    photo: 'bg-secondary-container',
  },
  grey: {
    pill: 'bg-surface-container-high text-on-surface-variant',
    photo: 'bg-surface-container-high',
  },
  blue: { pill: 'bg-primary-container text-on-primary-container', photo: 'bg-primary-container' },
}

export const memoryItems: MemoryItem[] = [
  {
    id: 'first-crawl',
    category: 'MILESTONE',
    title: 'First Crawl',
    date: 'Oct 12, 2023',
    tone: 'green',
    tags: ['Milestone'],
    media: 'Media',
  },
  {
    id: 'first-steps',
    category: 'BIG MOMENT',
    title: 'First Steps',
    date: 'Oct 14, 2023',
    tone: 'blue',
    tags: ['Milestone'],
    media: 'Media',
  },
  {
    id: 'sweet-potato',
    category: 'FOODIE',
    title: 'Sweet Potato Puree',
    date: 'Oct 15, 2023',
    tone: 'peach',
    tags: ['Diet'],
    media: 'Media',
  },
  {
    id: 'morning-giggles',
    category: 'HAPPY',
    title: 'Morning Giggles',
    date: 'Oct 18, 2023',
    tone: 'grey',
    tags: ['Smiles'],
    media: 'Media',
  },
  {
    id: 'park-adventure',
    category: 'OUTDOORS',
    title: 'Park Adventure',
    date: 'Oct 20, 2023',
    tone: 'green',
    tags: ['Outdoor'],
    media: 'Media',
  },
  {
    id: 'tiny-hands',
    category: 'DETAILS',
    title: 'Tiny Hands',
    date: 'Oct 21, 2023',
    tone: 'grey',
    tags: [],
    media: 'Text',
  },
]

/** 筛选面板的候选组，按设计稿的三个维度 */
export const filterGroups = [
  { key: 'time', label: 'Time Range', options: ['All Time', 'Last 7 Days', 'This Month'] },
  { key: 'category', label: 'Categories', options: ['Milestone', 'Diet', 'Smiles', 'Outdoor'] },
  { key: 'media', label: 'Media Type', options: ['Media', 'Text'] },
] as const

export type FilterKey = (typeof filterGroups)[number]['key']

export const defaultFilters: Record<FilterKey, string> = {
  time: 'All Time',
  category: '',
  media: '',
}
