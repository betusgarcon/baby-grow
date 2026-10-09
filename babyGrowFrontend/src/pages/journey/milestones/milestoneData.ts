/**
 * 里程碑列表页的视图数据。
 *
 * 后端接口未实现，先用本地 mock；接入 API 后这个文件整体删掉即可，
 * 页面只依赖下面的类型，不依赖数据来源。
 */

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

/** 把 ISO 日期格式化成设计稿里的 "Oct 12, 2023" */
export const formatMilestoneDate = (isoDate: string) => {
  const [year, month, day] = isoDate.split('-')

  return `${MONTH_LABELS[Number(month) - 1]} ${Number(day)}, ${year}`
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
    date: '2023-10-12',
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
    date: '2023-09-05',
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
    date: '2023-08-20',
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
    date: '2023-07-10',
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

export const yearOptions = ['2025', '2024', '2023']
