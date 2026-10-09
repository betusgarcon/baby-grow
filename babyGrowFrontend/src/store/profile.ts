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
  /** 选择器型属性的可选项；age 走生日日期选择器，不用这个 */
  options?: string[]
  /** 图标圆底配色，走 token */
  circleClass: string
}

export interface ProfilePreference {
  id: string
  icon: string
  label: string
  value: string
}

const pad = (value: number) => String(value).padStart(2, '0')

const toIsoDate = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

/**
 * 默认生日取「今天往前推 6 个月」，这样初次进入时算出来的年龄就是设计稿上的 6 Months。
 * 之所以存生日而不是直接存年龄，是因为年龄会随时间自己变，存生日才是唯一真值。
 */
export const defaultBirthday = (() => {
  const date = new Date()

  date.setMonth(date.getMonth() - 6)

  return toIsoDate(date)
})()

export const todayIsoDate = () => toIsoDate(new Date())

/**
 * 由生日算出当前年龄的展示文案。
 * 不足 1 岁按月，满 1 岁按 X Y M，与设计稿的 6 Months / 1Y2M 两种写法一致。
 */
export const computeAgeLabel = (birthday: string, today = todayIsoDate()) => {
  const [by, bm, bd] = birthday.split('-').map(Number)
  const [ty, tm, td] = today.split('-').map(Number)

  let months = (ty - by) * 12 + (tm - bm)
  if (td < bd) months -= 1
  if (months < 0) months = 0

  if (months < 12) return `${months} Months`

  const years = Math.floor(months / 12)
  const rest = months % 12

  return rest === 0 ? `${years}Y` : `${years}Y${rest}M`
}

export const babyProfile = {
  name: 'Leo',
  badge: 'Little Lion',
  avatar: babyAvatar,
  info: [
    {
      key: 'age' as ProfileInfoKey,
      icon: 'profile-age',
      label: 'Age',
      value: computeAgeLabel(defaultBirthday),
      circleClass: 'bg-tertiary-fixed',
    },
    {
      key: 'gender' as ProfileInfoKey,
      icon: 'profile-gender',
      label: 'Gender',
      value: 'Boy',
      options: ['Boy', 'Girl'],
      circleClass: 'bg-secondary-container',
    },
    {
      key: 'constellation' as ProfileInfoKey,
      icon: 'profile-constellation',
      label: 'Constellation',
      value: 'Leo',
      options: [
        'Aries',
        'Taurus',
        'Gemini',
        'Cancer',
        'Leo',
        'Virgo',
        'Libra',
        'Scorpio',
        'Sagittarius',
        'Capricorn',
        'Aquarius',
        'Pisces',
      ],
      circleClass: 'bg-surface-container',
    },
  ] as ProfileInfoItem[],
  preferences: [
    { id: 'toy', icon: 'profile-toy', label: 'Favorite Toy', value: 'Soft blocks' },
    { id: 'sleep', icon: 'profile-sleep', label: 'Sleep Routine', value: 'Loves white noise' },
    { id: 'feeding', icon: 'fork_knife', label: 'Feeding', value: 'Just started solids' },
  ] as ProfilePreference[],
}

/** 手动新增偏好时的默认图标，新增项没有专属图标可用 */
export const newPreferenceIcon = 'heart'
