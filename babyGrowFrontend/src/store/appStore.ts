import { createStore, useStoreState } from './createStore'
import { buildTimelineEntryFromRecord, initialTimeline, type JourneyEntry } from './timeline'
import {
  babyProfile,
  computeAgeLabel,
  defaultBirthday,
  type ProfileInfoItem,
  type ProfileInfoKey,
  type ProfilePreference,
} from './profile'
import { familyMembers, roleLabelOf, type FamilyMember, type FamilyRole } from './family'
import { wishes as initialWishes, type Wish, type WishChecklistItem } from './wishes'

/**
 * 应用级状态。
 *
 * 在此之前项目没有任何跨页状态：改名字、增删偏好、改成员权限、勾选清单、
 * 加计数器——一退出页面全部还原。单看每页都能操作，串起来却是个记不住
 * 事的应用。这里把可编辑的数据集中起来，至少保证本次会话内跨页可见。
 *
 * 这是内存态，重启小程序会回到初始值；接后端或落 storage 时只需替换这里的
 * 初始化与各 action 的实现，页面不用改。
 */
export interface ProfileState {
  name: string
  birthday: string
  info: ProfileInfoItem[]
  preferences: ProfilePreference[]
}

export interface AppState {
  timeline: JourneyEntry[]
  profile: ProfileState
  members: FamilyMember[]
  wishes: Wish[]
}

export const appStore = createStore<AppState>({
  timeline: initialTimeline,
  profile: {
    name: babyProfile.name,
    birthday: defaultBirthday,
    info: babyProfile.info,
    preferences: babyProfile.preferences,
  },
  members: familyMembers,
  wishes: initialWishes,
})

export const useAppState = () => useStoreState(appStore)

/* ---------------------------------------------------------------- 时间线 */

export const appendTimelineEntry = (entry: JourneyEntry) => {
  appStore.set((previous) => ({ ...previous, timeline: [entry, ...previous.timeline] }))
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
 * 改生日。年龄不单独存，改完生日立刻重算——年龄会随时间自己变，
 * 存生日才是唯一真值。
 */
export const setProfileBirthday = (birthday: string) => {
  appStore.set((previous) => ({
    ...previous,
    profile: {
      ...previous.profile,
      birthday,
      info: previous.profile.info.map((item) =>
        item.key === 'age' ? { ...item, value: computeAgeLabel(birthday) } : item,
      ),
    },
  }))
}

export const setProfileInfoValue = (key: ProfileInfoKey, value: string) => {
  if (key === 'age') {
    setProfileBirthday(value)
    return
  }

  appStore.set((previous) => ({
    ...previous,
    profile: {
      ...previous.profile,
      info: previous.profile.info.map((item) => (item.key === key ? { ...item, value } : item)),
    },
  }))
}

export const setProfilePreferences = (preferences: ProfilePreference[]) => {
  appStore.set((previous) => ({ ...previous, profile: { ...previous.profile, preferences } }))
}

/** 整份还原。页面在进入编辑前存一份快照，Cancel 时用它回滚 */
export const restoreProfile = (profile: ProfileState) => {
  appStore.set((previous) => ({ ...previous, profile }))
}

/* ---------------------------------------------------------------- 家庭成员 */

export const setMemberRole = (id: string, role: FamilyRole) => {
  appStore.set((previous) => ({
    ...previous,
    members: previous.members.map((member) =>
      member.id === id ? { ...member, role, roleLabel: roleLabelOf(role) } : member,
    ),
  }))
}

export const removeMember = (id: string) => {
  appStore.set((previous) => ({
    ...previous,
    members: previous.members.filter((member) => member.id !== id),
  }))
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
}

/* ---------------------------------------------------------------- 心愿 */

export const removeWish = (wishId: string) => {
  appStore.set((previous) => ({
    ...previous,
    wishes: previous.wishes.filter((wish) => wish.id !== wishId),
  }))
}

export const setWishChecklist = (wishId: string, checklist: WishChecklistItem[]) => {
  appStore.set((previous) => ({
    ...previous,
    wishes: previous.wishes.map((wish) => (wish.id === wishId ? { ...wish, checklist } : wish)),
  }))
}

export const setWishCounter = (wishId: string, current: number) => {
  appStore.set((previous) => ({
    ...previous,
    wishes: previous.wishes.map((wish) =>
      wish.id === wishId && wish.counter ? { ...wish, counter: { ...wish.counter, current } } : wish,
    ),
  }))
}
