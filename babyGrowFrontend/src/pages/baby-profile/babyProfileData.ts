import babyAvatar from '@/assets/images/baby-journey-img.png'

/**
 * 宝宝档案的视图数据。
 *
 * 这一组页面没有 Figma 源数据（Starter 计划配额耗尽），版式与文案取自
 * design_sources/stitch/journey/ 下的 baby_profile_view、baby_profile_edit_state、
 * baby_profile_preference_management 与 baby_profile_change_photo，
 * 属上一轮 AI 产物，后续拿到 Figma 源数据后需复核。
 *
 * 后端接口未实现，先用本地 mock。
 */

export type ProfileInfoKey = 'age' | 'gender' | 'constellation'

export interface ProfileInfoItem {
  key: ProfileInfoKey
  icon: string
  label: string
  value: string
  /** 编辑态下的可选项 */
  options: string[]
  /** 图标圆底配色，走 token */
  circleClass: string
}

export interface ProfilePreference {
  id: string
  icon: string
  label: string
  value: string
}

export interface BabyProfileData {
  name: string
  badge: string
  avatar: string
  info: ProfileInfoItem[]
  preferences: ProfilePreference[]
}

export const babyProfile: BabyProfileData = {
  name: 'Leo',
  badge: 'Little Lion',
  avatar: babyAvatar,
  info: [
    {
      key: 'age',
      icon: 'profile-age',
      label: 'Age',
      value: '6 Months',
      options: ['3 Months', '6 Months', '9 Months', '12 Months'],
      circleClass: 'bg-tertiary-fixed',
    },
    {
      key: 'gender',
      icon: 'profile-gender',
      label: 'Gender',
      value: 'Boy',
      options: ['Boy', 'Girl'],
      circleClass: 'bg-secondary-container',
    },
    {
      key: 'constellation',
      icon: 'profile-constellation',
      label: 'Constellation',
      value: 'Leo',
      options: ['Leo', 'Cancer', 'Virgo', 'Aries'],
      circleClass: 'bg-surface-container',
    },
  ],
  preferences: [
    { id: 'toy', icon: 'profile-toy', label: 'Favorite Toy', value: 'Soft blocks' },
    { id: 'sleep', icon: 'profile-sleep', label: 'Sleep Routine', value: 'Loves white noise' },
    { id: 'feeding', icon: 'fork_knife', label: 'Feeding', value: 'Just started solids' },
  ],
}

/** 新增偏好时的候选项，避免编辑态出现空行 */
export const preferenceTemplates: ProfilePreference[] = [
  { id: 'bath', icon: 'sunny', label: 'Bath Time', value: 'Every evening' },
  { id: 'outdoor', icon: 'star', label: 'Outdoor', value: 'Loves the stroller' },
  { id: 'music', icon: 'moon', label: 'Music', value: 'Calms down to piano' },
]
