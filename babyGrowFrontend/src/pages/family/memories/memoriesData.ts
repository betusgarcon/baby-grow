import { t, type MessageKey } from '@/i18n'

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
  /** 展示串，随语言变化；不要拿它做解析或比较 */
  date: string
  /** 稳定 ISO 日期，时间筛选只认它 */
  dateIso?: string
  tone: MemoryTone
  /** 供筛选面板匹配的分类标签，与卡片上展示的 category 不一定同名 */
  tags: string[]
  media: 'Media' | 'Text'
}

/**
 * 分类角标。后端存的是规范码（MOMENT / MILESTONE…），显示时才翻译；
 * 未知取值（用户自定义）保持原样。
 */
const CATEGORY_KEYS: Record<string, MessageKey> = {
  MOMENT: 'memories.catMoment',
  MEMORY: 'memories.catMemory',
  PHOTO: 'memories.catPhoto',
  MILESTONE: 'memories.catMilestone',
  DIET: 'memories.catDiet',
  SMILES: 'memories.catSmile',
  OUTDOOR: 'memories.catOutdoor',
}

export const memoryCategoryLabel = (category: string): string => {
  const key = CATEGORY_KEYS[category.trim().toUpperCase()]
  return key ? t(key) : category
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

/**
 * 筛选面板的候选组。
 *
 * **取值与显示分开**：`value` 是与数据比较的稳定键（`item.tags` / `item.media` /
 * `matchesTimeRange` 都比它），`labelKey` 才是给人看的文案。
 * 此前两者是同一个字符串，一翻译筛选就会静默失效。
 */
export const filterGroups = [
  {
    key: 'time',
    labelKey: 'memories.timeRange',
    options: [
      { value: 'all', labelKey: 'memories.allTime' },
      { value: 'last7', labelKey: 'memories.last7Days' },
      { value: 'month', labelKey: 'memories.thisMonth' },
    ],
  },
  {
    key: 'category',
    labelKey: 'memories.categories',
    options: [
      { value: 'Milestone', labelKey: 'memories.catMilestone' },
      { value: 'Diet', labelKey: 'memories.catDiet' },
      { value: 'Smiles', labelKey: 'memories.catSmile' },
      { value: 'Outdoor', labelKey: 'memories.catOutdoor' },
    ],
  },
  {
    key: 'media',
    labelKey: 'memories.mediaType',
    options: [
      { value: 'Media', labelKey: 'memories.mediaMedia' },
      { value: 'Text', labelKey: 'memories.mediaText' },
    ],
  },
] as const

export type FilterKey = (typeof filterGroups)[number]['key']

export const defaultFilters: Record<FilterKey, string> = {
  time: 'all',
  category: '',
  media: '',
}
