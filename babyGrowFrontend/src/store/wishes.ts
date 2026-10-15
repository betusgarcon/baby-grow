/**
 * 心愿清单的视图数据。
 *
 * 这一组页面没有 Figma 源数据（Starter 计划配额耗尽），版式与文案取自
 * design_sources/stitch/wishes/ 下的八个目录，属上一轮 AI 产物，
 * 后续拿到 Figma 源数据后需复核。
 *
 * 后端接口未实现，先用本地 mock。
 */

/** 勾选式（博物馆 / 游泳 / 徒步 / 攀岩）与计数式（读书）两种详情形态 */
export type WishKind = 'checklist' | 'counter'

/**
 * 头图状态。
 *
 * `none`   从未请求（功能未开启，或早于该功能的数据）
 * `pending` 生成中
 * `ready`  已生成
 * `failed` 生成失败，可重试
 *
 * 字段可选，省略等价于 `none`——mock 数据与旧接口返回都不必改。
 */
export type WishCoverStatus = 'none' | 'pending' | 'ready' | 'failed'

export interface WishChecklistItem {
  id: string
  title: string
  note: string
  done: boolean
}

export interface WishCounter {
  current: number
  target: number
  /** 每次快捷加减的单位，如 Book */
  unit: string
}

export interface Wish {
  id: string
  icon: string
  /** 图标圆底配色，走 tailwind 的 wish.* token */
  circleClass: string
  title: string
  /** 列表卡片上的说明 */
  description: string
  /** 详情页 hero 上的说明。设计稿里两处文案不同，所以分开存 */
  detailSubtitle: string
  /**
   * 目标数。**含义随 kind 变化**：
   * - `counter`：目标次数，进度按「当前值 / 目标次数」算；
   * - `checklist`：不再由用户填，落库时等于清单实际条数。分母改用实际条数，
   *   是为了避免「填了 4 但只加了 2 条，却显示 1 of 4」这种自相矛盾的显示。
   *   读取进度请用 {@link wishTarget}，不要直接读这个字段。
   */
  goal: number
  /** 进度文案里的量词，如 Strokes / Museums */
  unitLabel: string
  /** 勾选式详情里清单区的小标题，如 Museum Checklist */
  checklistTitle?: string
  /** 点击卡片去向。存具体页面路径而不是路由 id，新建的心愿也能动态生成 */
  path: string
  kind: WishKind
  /** 详情 hero 上的小标签，如 Growth Wish */
  badge?: string
  checklist?: WishChecklistItem[]
  counter?: WishCounter
  /** Expert Tip，用 ** 包裹需要加重的那段 */
  expertTip?: string
  /** AI 生成的头图绝对地址。生成成功前为空 */
  coverUrl?: string
  coverStatus?: WishCoverStatus
}

/** 已完成数：勾选式看勾了几条，计数式看当前值 */
export const wishDoneCount = (wish: Wish) =>
  wish.kind === 'counter' && wish.counter
    ? wish.counter.current
    : (wish.checklist ?? []).filter((item) => item.done).length

/**
 * 进度的分母。
 *
 * 清单式用**清单的实际条数**，计数式才用 `goal`。直接读 `wish.goal` 是不对的——
 * 清单式下它可能与条数对不上。
 */
export const wishTarget = (wish: Wish) =>
  wish.kind === 'counter' ? wish.goal : (wish.checklist ?? []).length

/** 进度 0~1。从清单/计数派生，勾选一项进度就跟着变，不再另存一份写死的值 */
export const wishProgress = (wish: Wish) => {
  const target = wishTarget(wish)
  return target > 0 ? Math.min(wishDoneCount(wish) / target, 1) : 0
}

export const wishProgressLabel = (wish: Wish) =>
  `${wishDoneCount(wish)} of ${wishTarget(wish)} ${wish.unitLabel}`

export const wishesEmptyCopy = {
  title: 'No wishes yet.',
  description:
    "Start planning your baby's first adventures together! Capture every dream and milestone.",
}

export const wishes: Wish[] = [
  {
    id: 'swim',
    icon: 'wish-swim',
    circleClass: 'bg-wish-swim',
    title: 'Learn to Swim',
    description: 'Mastering the basics of water safety and movement.',
    detailSubtitle: 'Developmental milestone goal',
    goal: 4,
    unitLabel: 'Strokes',
    checklistTitle: 'Swimming Checklist',
    path: '/pages/wishes/detail/index?wish=swim',
    kind: 'checklist',
    checklist: [
      { id: 'freestyle', title: 'Freestyle', note: 'Achieved 2 days ago', done: true },
      { id: 'breaststroke', title: 'Breaststroke', note: 'Learning coordination', done: false },
      { id: 'backstroke', title: 'Backstroke', note: 'Floating and gliding', done: false },
      { id: 'butterfly', title: 'Butterfly', note: 'Advanced movement', done: false },
    ],
    expertTip:
      'Start with bubble blowing and facial immersion to build confidence before introducing arm movements. **Playful learning is key for this age group.**',
  },
  {
    id: 'museum',
    icon: 'wish-museum',
    circleClass: 'bg-wish-museum',
    title: 'Visit 10 Museums',
    description: 'Exploring culture, art, and history around the city.',
    detailSubtitle: 'Exploring culture, art, and history through tiny, curious eyes.',
    goal: 10,
    unitLabel: 'Museums',
    checklistTitle: 'Museum Checklist',
    path: '/pages/wishes/detail/index?wish=museum',
    kind: 'checklist',
    checklist: [
      { id: 'natural-history', title: 'Natural History Museum', note: 'Visited on May 12', done: true },
      { id: 'science-center', title: 'Science Center', note: 'Visited on June 4', done: true },
      { id: 'art-gallery', title: 'Art Gallery', note: 'Visited on July 20', done: true },
      {
        id: 'discovery',
        title: "Children's Discovery Museum",
        note: 'Recommended for ages 1-5',
        done: false,
      },
      {
        id: 'modern-art',
        title: 'Modern Art Museum',
        note: 'High-contrast exhibits available',
        done: false,
      },
      { id: 'maritime', title: 'Maritime Museum', note: 'Harbor views, stroller friendly', done: false },
      { id: 'childrens-zoo', title: "Children's Zoo", note: 'Petting area on weekends', done: false },
      { id: 'transport', title: 'Transport Museum', note: 'Vintage trains to climb on', done: false },
      { id: 'planetarium', title: 'Planetarium', note: 'Dark inside, bring a blanket', done: false },
      { id: 'folk-art', title: 'Folk Art Museum', note: 'Craft corner for toddlers', done: false },
    ],
    expertTip:
      "Museums are great sensory experiences. Focus on **high-contrast exhibits** and take plenty of breaks. 15-20 minutes is often enough for a toddler's focus.",
  },
  {
    id: 'trails',
    icon: 'wish-terrain',
    circleClass: 'bg-wish-trails',
    title: 'Local Trails',
    description: 'Connecting with nature on weekend mornings.',
    detailSubtitle: 'Getting outdoors and into the green, one short walk at a time.',
    goal: 3,
    unitLabel: 'Trails',
    checklistTitle: 'Trail Checklist',
    path: '/pages/wishes/detail/index?wish=trails',
    kind: 'checklist',
    checklist: [
      { id: 'riverside', title: 'Riverside Loop', note: 'Walked on May 30', done: true },
      { id: 'hilltop', title: 'Hilltop Path', note: 'Stroller friendly', done: false },
      { id: 'forest', title: 'Forest Boardwalk', note: 'Shaded, good for summer', done: false },
    ],
    expertTip:
      'Short and frequent outings beat one long hike. **Let them touch leaves and bark** — sensory contact is what makes a walk memorable.',
  },
  {
    id: 'books',
    icon: 'wish-book',
    circleClass: 'bg-wish-books',
    title: '100 Books Before K',
    description: 'Building a lifelong love for reading and stories.',
    detailSubtitle: 'Building a lifelong love for reading and stories.',
    goal: 100,
    unitLabel: 'Books',
    path: '/pages/wishes/counter/index?wish=books',
    kind: 'counter',
    badge: 'Growth Wish',
    counter: { current: 34, target: 100, unit: 'Book' },
    expertTip:
      'Reading aloud with expressive voices and pointing to pictures helps develop vocabulary and early literacy skills. **Make it a joyful bonding time.**',
  },
  {
    id: 'climbing',
    icon: 'wish-terrain',
    circleClass: 'bg-wish-climbing',
    title: 'Climbing',
    description: 'Developing strength and confidence on the wall.',
    detailSubtitle: 'Developing strength and confidence on the wall.',
    goal: 5,
    unitLabel: 'Levels',
    checklistTitle: 'Climbing Checklist',
    path: '/pages/wishes/detail/index?wish=climbing',
    kind: 'checklist',
    checklist: [
      { id: 'level-1', title: 'Level 1 · Low Wall', note: 'Cleared on June 18', done: true },
      { id: 'level-2', title: 'Level 2 · Grip Board', note: 'Working on hand strength', done: false },
      { id: 'level-3', title: 'Level 3 · Traverse', note: 'Sideways movement', done: false },
      { id: 'level-4', title: 'Level 4 · Overhang', note: 'Needs spotting', done: false },
      { id: 'level-5', title: 'Level 5 · Full Route', note: 'Top out unaided', done: false },
    ],
    expertTip:
      'Always spot from below and keep the wall low. **Confidence grows faster than strength**, so let them repeat an easy level as long as they like.',
  },
]

/**
 * Expert Tip 里用 ** 包裹的部分要加重显示。
 * 拆成片段交给页面渲染，避免把文案写成一堆嵌套节点。
 */
export const splitEmphasis = (text: string) =>
  text
    .split(/\*\*(.+?)\*\*/g)
    .map((segment, index) => ({ text: segment, emphasis: index % 2 === 1 }))
    .filter((segment) => segment.text.length > 0)
