import { createStore, useStoreState } from './createStore'
import { buildTimelineEntryFromRecord, type JourneyEntry } from './timeline'
import {
  computeAgeLabel,
  type ProfileInfoItem,
  type ProfileInfoKey,
  type ProfilePreference,
} from './profile'
import { roleLabelOf, type FamilyMember, type FamilyRole } from './family'
import type { Wish, WishChecklistItem } from './wishes'
import type { VaccineDetail } from './vaccine'
import type { Milestone } from '@/pages/journey/milestones/milestoneData'
import type { CalendarEvent } from '@/pages/journey/calendar/calendarData'
import type { WeeklyInsight } from '@/pages/journey/weekly-insight/weeklyInsightData'
import type { MemoryItem } from '@/pages/family/memories/memoriesData'

import { getTimeline, addTimelineEntry as postTimelineEntry } from '@/api/modules/timeline'
import {
  getFamilyMembers,
  updateMemberRole as putMemberRole,
  removeFamilyMember,
  inviteFamilyMember,
} from '@/api/modules/family'
import {
  getWishes,
  createWish as postWish,
  removeWish as deleteWish,
  updateWishChecklist as putWishChecklist,
  updateWishCounter as putWishCounter,
  regenerateWishCover as postWishCover,
} from '@/api/modules/wishes'
import { getProfile, updateProfile as putProfile } from '@/api/modules/profile'
import {
  getVaccineDetail,
  updateVaccineDetail,
  deleteVaccineDetail,
} from '@/api/modules/vaccine'
import { getMilestones } from '@/api/modules/milestones'
import { getBabyProfile } from '@/api/modules/baby'
import { getCalendarEvents } from '@/api/modules/calendar'
import { getWeeklyInsight } from '@/api/modules/weeklyInsight'
import { getMemories } from '@/api/modules/memories'

/**
 * 应用级状态 + 数据加载。
 *
 * 页面只依赖这一层；取数与写回都经过 api 模块，再落到 mock 路由。
 * 接后端时只需把 mock 路由换成真实接口，页面与 store 都不用改——
 * 这是之前「每个页面各自写死一份数据」最大的问题：换数据源要改十几处。
 */

export type LoadStatus = 'idle' | 'loading' | 'ready' | 'error'

export type SliceKey =
  | 'timeline'
  | 'profile'
  | 'babyHeader'
  | 'members'
  | 'wishes'
  | 'vaccine'
  | 'milestones'
  | 'calendar'
  | 'weeklyInsight'
  | 'memories'

/**
 * 导航栏里那一组「头像 + 名字 + 月龄」。
 *
 * 单独成一个 slice，是因为它出现在几乎每个页面的顶部，而来源此前有四套：
 * 分析页读接口、首页/家庭页/里程碑页各自写死常量、画像页读另一份 store。
 * 同一个宝宝在不同页面显示成不同头像，就是这么来的。
 *
 * 统一取 `/api/baby/profile`（精简档案），与画像编辑页的 `profile` slice
 * （完整档案，走 profile-detail）刻意分开——两者用途不同，别混。
 */
export interface BabyHeaderState {
  name: string
  avatar: string
  ageLabel: string
}

export interface ProfileState {
  name: string
  birthday: string
  info: ProfileInfoItem[]
  preferences: ProfilePreference[]
}

export interface AppState {
  /** 每个数据域各自的加载状态，页面据此渲染骨架屏 / 失败重试 / 内容 */
  status: Record<SliceKey, LoadStatus>
  timeline: JourneyEntry[]
  profile: ProfileState
  babyHeader: BabyHeaderState
  members: FamilyMember[]
  wishes: Wish[]
  /** null 既可能是「还没加载」也可能是「已删除」，靠 status 区分 */
  vaccine: VaccineDetail | null
  milestones: Milestone[]
  calendarEvents: CalendarEvent[]
  weeklyInsight: WeeklyInsight | null
  memories: MemoryItem[]
  /**
   * 记忆页勾选后带进海报页的那几条。
   *
   * 走 store 而不是路由参数：勾选是多选、条数不定，塞进 query 又长又容易丢；
   * 而且海报页要与记忆页看到的是同一份数据（同一张图、同一个标题）。
   */
  posterMemories: MemoryItem[]
}

const EMPTY_PROFILE: ProfileState = {
  name: '',
  birthday: '',
  info: [],
  preferences: [],
}

const EMPTY_BABY_HEADER: BabyHeaderState = {
  name: '',
  avatar: '',
  ageLabel: '',
}

export const appStore = createStore<AppState>({
  status: {
    timeline: 'idle',
    profile: 'idle',
    babyHeader: 'idle',
    members: 'idle',
    wishes: 'idle',
    vaccine: 'idle',
    milestones: 'idle',
    calendar: 'idle',
    weeklyInsight: 'idle',
    memories: 'idle',
  },
  timeline: [],
  profile: EMPTY_PROFILE,
  babyHeader: EMPTY_BABY_HEADER,
  members: [],
  wishes: [],
  vaccine: null,
  milestones: [],
  calendarEvents: [],
  weeklyInsight: null,
  memories: [],
  posterMemories: [],
})

export const useAppState = () => useStoreState(appStore)

const setStatus = (key: SliceKey, value: LoadStatus) => {
  appStore.set((previous) => ({ ...previous, status: { ...previous.status, [key]: value } }))
}

/**
 * 每个数据域最近一次加载的序号。
 *
 * 用来丢弃「迟到的那一次」：双击重试、或页面重新挂载，都会让同一个域同时有两个
 * 请求在飞。先发的那个若后到，就会把已经显示的新数据覆盖回旧的，而且状态也会
 * 从 ready 退回 loading/error——用户看到的是「刷新之后反而变旧了」。
 */
const loadSequence = new Map<SliceKey, number>()

/**
 * 通用加载：先置 loading，成功落到数据并置 ready，失败置 error。
 * 页面用 AsyncSection 消费这个状态，失败时有重试入口。
 */
const load = async <T>(
  key: SliceKey,
  fetcher: () => Promise<{ code: number; data: T; message: string }>,
  apply: (data: T) => void,
) => {
  const sequence = (loadSequence.get(key) ?? 0) + 1
  loadSequence.set(key, sequence)
  setStatus(key, 'loading')

  try {
    const response = await fetcher()

    if (response.code !== 0) throw new Error(response.message)

    // 已经被更新的一次加载取代了，这次的结果直接丢弃——数据和状态都不要动
    if (loadSequence.get(key) !== sequence) return

    apply(response.data)
    setStatus(key, 'ready')
  } catch (error) {
    // 同样：迟到的失败不该把新的成功状态打回 error
    if (loadSequence.get(key) !== sequence) return

    console.error(`[store] 加载 ${key} 失败`, error)
    setStatus(key, 'error')
  }
}

/**
 * 写操作统一走这里：先更新本地让界面立刻响应，再异步落库。
 *
 * 落库失败时会调 {@link rollback} 把本地恢复成操作前的样子。
 * 之前这里只 console.error、既不回滚也不上报，于是一次失败的「移出成员」
 * 让界面显示人已经移走了，服务端上他却还在家里——下次刷新又冒出来，
 * 用户完全无从判断到底成没成。宁可界面先动再弹回去，也不要显示一个假结果。
 *
 * 返回是否成功。刻意不向外抛：调用点全是「点了就走」的写法，
 * 抛出去只会变成一串无人处理的 Promise 拒绝，回滚这件事反而做不成。
 * 需要给用户提示的页面自己接这个布尔值。
 */
const persist = (
  label: string,
  request: () => Promise<unknown>,
  rollback?: () => void,
): Promise<boolean> =>
  request().then(
    () => true,
    (error) => {
      console.error(`[store] ${label} 落库失败`, error)
      rollback?.()
      return false
    },
  )

/* ---------------------------------------------------------------- 加载 */

export const loadTimeline = () =>
  load('timeline', () => getTimeline({ limit: 20 }), (page) =>
    appStore.set((p) => ({ ...p, timeline: page.items })))

export const loadProfile = () =>
  load('profile', getProfile, (data) => appStore.set((p) => ({ ...p, profile: data })))

/**
 * 加载导航栏那组「头像 + 名字 + 月龄」。
 * 启动时调一次即可，全站复用同一份，不再让各页各写各的常量。
 */
export const loadBabyHeader = () =>
  load('babyHeader', getBabyProfile, (data) =>
    appStore.set((p) => {
      // `data.profile` 可能是 undefined：包了一层 data 的接口在「查不到」时
      // 完全可能回 {code:0, data:{}}。直接取 .name 就是 TypeError，
      // 而它长在导航栏上——一崩全站每个页面的顶部都进错误态。
      const profile = data?.profile ?? EMPTY_BABY_HEADER

      return {
        ...p,
        babyHeader: {
          name: profile.name ?? '',
          avatar: profile.avatar ?? '',
          ageLabel: profile.ageLabel ?? '',
        },
      }
    }),
  )

export const loadMembers = () =>
  load('members', getFamilyMembers, (data) => appStore.set((p) => ({ ...p, members: data })))

export const loadWishes = () =>
  load('wishes', getWishes, (data) => appStore.set((p) => ({ ...p, wishes: data })))

export const loadVaccine = () =>
  load('vaccine', getVaccineDetail, (data) => appStore.set((p) => ({ ...p, vaccine: data })))

export const loadMilestones = () =>
  load('milestones', () => getMilestones({ limit: 20 }), (page) =>
    appStore.set((p) => ({ ...p, milestones: page.items })))

export const loadCalendarEvents = () =>
  load('calendar', getCalendarEvents, (data) =>
    appStore.set((p) => ({ ...p, calendarEvents: data })),
  )

export const loadWeeklyInsight = () =>
  load('weeklyInsight', getWeeklyInsight, (data) =>
    appStore.set((p) => ({ ...p, weeklyInsight: data })),
  )

export const loadMemories = () =>
  load('memories', () => getMemories({ limit: 20 }), (page) =>
    appStore.set((p) => ({ ...p, memories: page.items })))

/** 记忆页勾选后写这里，海报页据此渲染。纯本地状态，不涉及后端 */
export const setPosterMemories = (items: MemoryItem[]) => {
  appStore.set((previous) => ({ ...previous, posterMemories: items }))
}

/* ---------------------------------------------------------------- 时间线 */

export const appendTimelineEntry = (entry: JourneyEntry) => {
  appStore.set((previous) => ({ ...previous, timeline: [entry, ...previous.timeline] }))
  persist('新增时间线记录', () => postTimelineEntry(entry))
}

/** 由记录弹层的结果构造并写入一条时间线条目，返回新条目 */
export const saveRecordToTimeline = (params: {
  title: string
  summary: string
  text: string
  photo: string | null
}) => {
  const entry = buildTimelineEntryFromRecord(params)

  appendTimelineEntry(entry)

  return entry
}

/* ---------------------------------------------------------------- 宝宝画像 */

/**
 * 只改本地，不落库。
 *
 * 编辑模式（整体编辑 / 偏好管理）期间每一步操作都只更新本地状态，
 * 等用户点 Save Changes 才由 {@link commitProfile} 提交一次。此前这里
 * 直接 persist，改一项就发一个 PUT——拖几下偏好能打出十几个请求。
 */
const patchProfile = (patch: Partial<ProfileState>) => {
  appStore.set((previous) => ({ ...previous, profile: { ...previous.profile, ...patch } }))
}

/**
 * 把当前本地档案整体提交一次。退出编辑模式时调用。
 *
 * 提交全量而非单字段，所以一次编辑无论改了几处，后端都只收到一个请求。
 */
export const commitProfile = () => {
  persist('更新宝宝画像', () => putProfile(appStore.get().profile))
}

/**
 * 改生日。年龄不单独存，改完生日立刻重算——年龄会随时间自己变，
 * 存生日才是唯一真值。
 */
export const setProfileBirthday = (birthday: string) => {
  const info = appStore
    .get()
    .profile.info.map((item) =>
      item.key === 'age' ? { ...item, value: computeAgeLabel(birthday) } : item,
    )

  patchProfile({ birthday, info })
}

/**
 * 改宝宝名字。
 *
 * 顺带同步 `babyHeader`——导航栏那个名字和画像是同一个值的两个展示位，
 * 只改一边会切页后对不上。
 */
export const setProfileName = (name: string) => {
  appStore.set((previous) => ({
    ...previous,
    profile: { ...previous.profile, name },
    babyHeader: { ...previous.babyHeader, name },
  }))
}

export const setProfileInfoValue = (key: ProfileInfoKey, value: string) => {
  // name 不在 info 数组里（它是档案顶层的字段），单独走
  if (key === 'name') {
    setProfileName(value)
    return
  }

  if (key === 'age') {
    setProfileBirthday(value)
    return
  }

  patchProfile({
    info: appStore
      .get()
      .profile.info.map((item) => (item.key === key ? { ...item, value } : item)),
  })
}

export const setProfilePreferences = (preferences: ProfilePreference[]) => {
  patchProfile({ preferences })
}

/** 整份还原。页面在进入编辑前存一份快照，Cancel 时用它回滚 */
export const restoreProfile = (profile: ProfileState) => {
  patchProfile(profile)
}

/* ---------------------------------------------------------------- 家庭成员 */

export const setMemberRole = (id: string, role: FamilyRole) => {
  const before = appStore.get().members.find((member) => member.id === id)

  appStore.set((previous) => ({
    ...previous,
    members: previous.members.map((member) =>
      member.id === id ? { ...member, role, roleLabel: roleLabelOf(role) } : member,
    ),
  }))

  return persist(
    '修改成员权限',
    () => putMemberRole(id, role),
    () => {
      if (!before) return
      appStore.set((previous) => ({
        ...previous,
        members: previous.members.map((member) => (member.id === id ? before : member)),
      }))
    },
  )
}

export const removeMember = (id: string) => {
  // 整份存下来用于回滚：成员列表不长，而「把走的那个人按回原来的位置」比
  // 只把他的数据补回去更不容易漏掉 roleLabel 之类的派生字段。
  const before = appStore.get().members

  appStore.set((previous) => ({
    ...previous,
    members: previous.members.filter((member) => member.id !== id),
  }))

  return persist(
    '移出成员',
    () => removeFamilyMember(id),
    () => appStore.set((previous) => ({ ...previous, members: before })),
  )
}

/**
 * 邀请一位亲友：先在本地放一条占位，再用服务端返回的那条替换它。
 *
 * **这份响应不能丢**。里面有一次性邀请口令，而口令只在「创建它的那一次响应」里
 * 带得回来——成员列表只对 admin 展示它（见 FamilyService.toView 的 includeInviteCode）。
 * 换个说法：一个 contributor 发出的邀请，如果响应被丢掉，那串口令就彻底拿不到了，
 * 接下来的凭证页会显示「暂无待接受的邀请」，邀请等于发不出去。
 *
 * 所以这里走 addWish 那种「用响应覆盖本地」的写法，而不是 persist 的「发出后不管」。
 */
export const addPendingMember = (name: string, role: FamilyRole) => {
  // 本地先生成的这条 id 只用于占位；服务端会另给一条真正的 pending 行。
  const placeholderId = `pending-${Date.now()}`

  appStore.set((previous) => ({
    ...previous,
    members: [
      ...previous.members,
      {
        id: placeholderId,
        name,
        role,
        roleLabel: `${roleLabelOf(role)} · Pending`,
        initial: name.trim().charAt(0).toUpperCase() || '·',
        avatarClass: 'bg-surface-container-high',
      },
    ],
  }))

  return inviteFamilyMember(name, role).then(
    (response) => {
      if (response.code !== 0) throw new Error(response.message)

      appStore.set((previous) => ({
        ...previous,
        members: previous.members.map((member) =>
          member.id === placeholderId ? response.data : member,
        ),
      }))
      return true
    },
    (error) => {
      console.error('[store] 邀请成员失败', error)
      appStore.set((previous) => ({
        ...previous,
        members: previous.members.filter((member) => member.id !== placeholderId),
      }))
      return false
    },
  )
}

/* ---------------------------------------------------------------- 心愿 */

export const removeWish = (wishId: string) => {
  const before = appStore.get().wishes

  appStore.set((previous) => ({
    ...previous,
    wishes: previous.wishes.filter((wish) => wish.id !== wishId),
  }))

  return persist(
    '删除心愿',
    () => deleteWish(wishId),
    () => appStore.set((previous) => ({ ...previous, wishes: before })),
  )
}

/**
 * 新建心愿。
 *
 * **这里不同于其它写操作的「先改本地、再异步落库」。** 心愿的响应里有几项只有后端
 * 知道：清单式的目标数按实际条数派生、头图的生成状态与地址。本地猜不出正确的值，
 * 猜错会让界面与数据库不一致（列表显示错的「x of y」，或者挂着一个永不消失的「生成中」）。
 * 所以用响应覆盖本地，而不是先塞一个本地造的对象进去。
 *
 * 失败时向上抛，由页面提示；本地也不会留下一条根本没存上的心愿。
 */
export const addWish = (wish: Wish) =>
  postWish(wish).then((response) => {
    if (response.code !== 0) throw new Error(response.message)

    appStore.set((previous) => ({ ...previous, wishes: [...previous.wishes, response.data] }))
  })

/**
 * 改本地清单。
 *
 * 勾选是高频操作，勾几下就发几个 PUT 毫无必要——改完先留在本地，
 * 由页面在退出编辑（Save Changes）时调 {@link commitWishChecklist} 提交一次。
 */
export const setWishChecklist = (wishId: string, checklist: WishChecklistItem[]) => {
  appStore.set((previous) => ({
    ...previous,
    wishes: previous.wishes.map((wish) => (wish.id === wishId ? { ...wish, checklist } : wish)),
  }))
}

/** 把某个心愿的清单提交一次 */
export const commitWishChecklist = (wishId: string) => {
  const wish = appStore.get().wishes.find((item) => item.id === wishId)

  if (!wish) return

  persist('更新心愿清单', () => putWishChecklist(wishId, wish.checklist ?? []))
}

/** 改本地计数。同上，+1 / -1 连点不该连发请求 */
export const setWishCounter = (wishId: string, current: number) => {
  appStore.set((previous) => ({
    ...previous,
    wishes: previous.wishes.map((wish) =>
      wish.id === wishId && wish.counter ? { ...wish, counter: { ...wish.counter, current } } : wish,
    ),
  }))
}

/** 把某个心愿的计数提交一次 */
export const commitWishCounter = (wishId: string) => {
  const wish = appStore.get().wishes.find((item) => item.id === wishId)

  if (!wish?.counter) return

  persist('更新心愿进度', () => putWishCounter(wishId, wish.counter!.current))
}

/**
 * 重新生成头图。只有「生成失败后重试」与「想换一张」会走到这里。
 *
 * 不复用 persist：它把响应丢掉了，而这里的响应正是刚置为 pending 的心愿，
 * 拿来覆盖本地就能立刻把页面切到「生成中」，不必等下一次整页刷新。
 *
 * 失败会向上抛，由调用页面决定怎么提示——这个 store 不依赖 Taro。
 */
export const regenerateWishCover = (wishId: string) =>
  postWishCover(wishId).then((response) => {
    if (response.code !== 0) throw new Error(response.message)

    appStore.set((previous) => ({
      ...previous,
      wishes: previous.wishes.map((wish) => (wish.id === wishId ? response.data : wish)),
    }))
  })

/* ---------------------------------------------------------------- 事件详情 */

export const updateVaccine = (patch: Partial<VaccineDetail>) => {
  const before = appStore.get().vaccine

  appStore.set((previous) =>
    previous.vaccine ? { ...previous, vaccine: { ...previous.vaccine, ...patch } } : previous,
  )

  return persist(
    '更新事件详情',
    () => updateVaccineDetail(patch),
    () => appStore.set((previous) => ({ ...previous, vaccine: before })),
  )
}

export const removeVaccine = () => {
  // 乐观地把详情清空（页面据此退出）。删失败时要能原样回来，
  // 否则用户看到「已删除」，实际记录还在。
  const before = appStore.get().vaccine

  appStore.set((previous) => ({ ...previous, vaccine: null }))

  return persist(
    '删除事件详情',
    deleteVaccineDetail,
    () => appStore.set((previous) => ({ ...previous, vaccine: before })),
  )
}
