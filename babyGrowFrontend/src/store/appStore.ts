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
} from '@/api/modules/wishes'
import { getProfile, updateProfile as putProfile } from '@/api/modules/profile'
import {
  getVaccineDetail,
  updateVaccineDetail,
  deleteVaccineDetail,
} from '@/api/modules/vaccine'
import { getMilestones } from '@/api/modules/milestones'
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
  | 'members'
  | 'wishes'
  | 'vaccine'
  | 'milestones'
  | 'calendar'
  | 'weeklyInsight'
  | 'memories'

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
  members: FamilyMember[]
  wishes: Wish[]
  /** null 既可能是「还没加载」也可能是「已删除」，靠 status 区分 */
  vaccine: VaccineDetail | null
  milestones: Milestone[]
  calendarEvents: CalendarEvent[]
  weeklyInsight: WeeklyInsight | null
  memories: MemoryItem[]
}

const EMPTY_PROFILE: ProfileState = {
  name: '',
  birthday: '',
  info: [],
  preferences: [],
}

export const appStore = createStore<AppState>({
  status: {
    timeline: 'idle',
    profile: 'idle',
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
  members: [],
  wishes: [],
  vaccine: null,
  milestones: [],
  calendarEvents: [],
  weeklyInsight: null,
  memories: [],
})

export const useAppState = () => useStoreState(appStore)

const setStatus = (key: SliceKey, value: LoadStatus) => {
  appStore.set((previous) => ({ ...previous, status: { ...previous.status, [key]: value } }))
}

/**
 * 通用加载：先置 loading，成功落到数据并置 ready，失败置 error。
 * 页面用 AsyncSection 消费这个状态，失败时有重试入口。
 */
const load = async <T>(
  key: SliceKey,
  fetcher: () => Promise<{ code: number; data: T; message: string }>,
  apply: (data: T) => void,
) => {
  setStatus(key, 'loading')

  try {
    const response = await fetcher()

    if (response.code !== 0) throw new Error(response.message)

    apply(response.data)
    setStatus(key, 'ready')
  } catch (error) {
    console.error(`[store] 加载 ${key} 失败`, error)
    setStatus(key, 'error')
  }
}

/**
 * 写操作统一走这里：先更新本地让界面立刻响应，再异步落库。
 * 落库失败只记日志并提示，不回滚本地——后端接上后按需改成事务式。
 */
const persist = (label: string, request: () => Promise<unknown>) => {
  request().catch((error) => {
    console.error(`[store] ${label} 落库失败`, error)
  })
}

/* ---------------------------------------------------------------- 加载 */

export const loadTimeline = () =>
  load('timeline', getTimeline, (data) => appStore.set((p) => ({ ...p, timeline: data })))

export const loadProfile = () =>
  load('profile', getProfile, (data) => appStore.set((p) => ({ ...p, profile: data })))

export const loadMembers = () =>
  load('members', getFamilyMembers, (data) => appStore.set((p) => ({ ...p, members: data })))

export const loadWishes = () =>
  load('wishes', getWishes, (data) => appStore.set((p) => ({ ...p, wishes: data })))

export const loadVaccine = () =>
  load('vaccine', getVaccineDetail, (data) => appStore.set((p) => ({ ...p, vaccine: data })))

export const loadMilestones = () =>
  load('milestones', getMilestones, (data) => appStore.set((p) => ({ ...p, milestones: data })))

export const loadCalendarEvents = () =>
  load('calendar', getCalendarEvents, (data) =>
    appStore.set((p) => ({ ...p, calendarEvents: data })),
  )

export const loadWeeklyInsight = () =>
  load('weeklyInsight', getWeeklyInsight, (data) =>
    appStore.set((p) => ({ ...p, weeklyInsight: data })),
  )

export const loadMemories = () =>
  load('memories', getMemories, (data) => appStore.set((p) => ({ ...p, memories: data })))

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

const patchProfile = (patch: Partial<ProfileState>) => {
  appStore.set((previous) => ({ ...previous, profile: { ...previous.profile, ...patch } }))
  persist('更新宝宝画像', () => putProfile(patch))
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

export const setProfileInfoValue = (key: ProfileInfoKey, value: string) => {
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
  appStore.set((previous) => ({
    ...previous,
    members: previous.members.map((member) =>
      member.id === id ? { ...member, role, roleLabel: roleLabelOf(role) } : member,
    ),
  }))
  persist('修改成员权限', () => putMemberRole(id, role))
}

export const removeMember = (id: string) => {
  appStore.set((previous) => ({
    ...previous,
    members: previous.members.filter((member) => member.id !== id),
  }))
  persist('移出成员', () => removeFamilyMember(id))
}

/** 邀请发出后把受邀人作为「待接受」加进成员列表 */
export const addPendingMember = (name: string, role: FamilyRole) => {
  appStore.set((previous) => ({
    ...previous,
    members: [
      ...previous.members,
      {
        id: `pending-${Date.now()}`,
        name,
        role,
        roleLabel: `${roleLabelOf(role)} · Pending`,
        initial: name.trim().charAt(0).toUpperCase() || '·',
        avatarClass: 'bg-surface-container-high',
      },
    ],
  }))
  persist('邀请成员', () => inviteFamilyMember(name, role))
}

/* ---------------------------------------------------------------- 心愿 */

export const removeWish = (wishId: string) => {
  appStore.set((previous) => ({
    ...previous,
    wishes: previous.wishes.filter((wish) => wish.id !== wishId),
  }))
  persist('删除心愿', () => deleteWish(wishId))
}

export const addWish = (wish: Wish) => {
  appStore.set((previous) => ({ ...previous, wishes: [...previous.wishes, wish] }))
  persist('新建心愿', () => postWish(wish))
}

export const setWishChecklist = (wishId: string, checklist: WishChecklistItem[]) => {
  appStore.set((previous) => ({
    ...previous,
    wishes: previous.wishes.map((wish) => (wish.id === wishId ? { ...wish, checklist } : wish)),
  }))
  persist('更新心愿清单', () => putWishChecklist(wishId, checklist))
}

export const setWishCounter = (wishId: string, current: number) => {
  appStore.set((previous) => ({
    ...previous,
    wishes: previous.wishes.map((wish) =>
      wish.id === wishId && wish.counter ? { ...wish, counter: { ...wish.counter, current } } : wish,
    ),
  }))
  persist('更新心愿进度', () => putWishCounter(wishId, current))
}

/* ---------------------------------------------------------------- 事件详情 */

export const updateVaccine = (patch: Partial<VaccineDetail>) => {
  appStore.set((previous) =>
    previous.vaccine ? { ...previous, vaccine: { ...previous.vaccine, ...patch } } : previous,
  )
  persist('更新事件详情', () => updateVaccineDetail(patch))
}

export const removeVaccine = () => {
  appStore.set((previous) => ({ ...previous, vaccine: null }))
  persist('删除事件详情', deleteVaccineDetail)
}
