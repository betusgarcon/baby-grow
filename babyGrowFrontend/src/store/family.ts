/**
 * 家庭分享模块的视图数据。
 *
 * 这一组页面没有 Figma 源数据（Starter 计划配额未恢复），版式与文案取自
 * design_sources/stitch/family_share/，属上一轮 AI 产物，后续拿到 Figma
 * 源数据后需复核。
 *
 * 后端接口未实现，先用本地 mock。
 */

export type FamilyRole = 'admin' | 'contributor' | 'viewer'

export interface FamilyMember {
  id: string
  name: string
  /** 展示用权限文案，如 Admin · Full Access */
  roleLabel: string
  role: FamilyRole
  initial: string
  /** 头像底色，走 family.* token */
  avatarClass: string
  isSelf?: boolean
  /** pending = 已邀请但对方还没接受。后端下发，缺省视为已加入 */
  status?: 'active' | 'pending'
  /** 待接受成员的一次性邀请口令 */
  inviteCode?: string
  inviteExpiresAt?: string
}

export interface FamilyRoleOption {
  key: FamilyRole
  title: string
  description: string
}

export const familyMembers: FamilyMember[] = [
  {
    id: 'mom',
    name: 'Mom (You)',
    roleLabel: 'Admin · Full Access',
    role: 'admin',
    initial: 'M',
    avatarClass: 'bg-family-clay',
    isSelf: true,
  },
  {
    id: 'dad',
    name: 'Dad',
    roleLabel: 'Admin · Full Access',
    role: 'admin',
    initial: 'D',
    avatarClass: 'bg-family-sage',
  },
  {
    id: 'grandma',
    name: 'Grandma Jane',
    roleLabel: 'Viewer · Read Only',
    role: 'viewer',
    initial: 'G',
    avatarClass: 'bg-family-lilac',
  },
]

export const familyRoleOptions: FamilyRoleOption[] = [
  {
    key: 'admin',
    title: '超级管理员 (Admin)',
    description: '拥有全部记录与所有成员管理权限',
  },
  {
    key: 'contributor',
    title: '共享协作者 (Contributor)',
    description: '允许上传照片并帮忙记录每日生活起居',
  },
  {
    key: 'viewer',
    title: '只读看护者 (Viewer)',
    description: '仅可查看成长数据与时间轴，防止误触修改',
  },
]

/** 角色 → 列表里那行权限文案 */
export const roleLabelOf = (role: FamilyRole) => {
  if (role === 'admin') return 'Admin · Full Access'
  if (role === 'contributor') return 'Contributor · Can Record'

  return 'Viewer · Read Only'
}

/**
 * 分享高亮卡片。
 *
 * 存的是**键**而不是字符串：这些都是模块级常量，在模块加载时就求值了；
 * 直接存 `t()` 的结果不会随语言切换更新（reLaunch 也不会重新执行模块）。
 */
export const shareHighlight = {
  badgeKey: 'family.shareBadge',
  titleKey: 'family.shareTitle',
  subtitleKey: 'family.shareSubtitle',
} as const

/** 邀请成员时预设的亲友身份（键） */
export const inviteePresets = [
  'invite.preset.maternalGrandpa',
  'invite.preset.maternalGrandma',
  'invite.preset.paternalGrandpa',
  'invite.preset.nanny',
] as const

/*
 * 入场凭证与受邀欢迎页的文案已移到 `i18n/messages.ts`（`invite.*` / `invited.*`）。
 * 这里原本是 `inviteToken` 与 `invitedView` 两个模块级对象：模块加载时求值，
 * 切换语言不会更新；而且 `invitedView` 里那条 `inviter: 'Mom (You)'` 是编的
 * （接受接口只回 familyId/role，没有邀请人信息），已一并删除。
 */

/*
 * 海报的兜底文案已移到 `i18n/messages.ts`（`poster.default*`）。
 * 页面在渲染时用它，模块加载时不再固化一份。
 *
 * 这里保留一条约束：兜底必须一眼看出是占位。此前它带着「150g 的甜南瓜泥」
 * 「12kg 黄金线」「2023.09.24」这类编造的具体数字与日期，接口一失败，
 * 用户看到的是一张**别人的**成长海报。
 */

export const posterTemplates = [
  { key: 'warm', labelKey: 'poster.templateWarm', icon: 'edit' },
  { key: 'magazine', labelKey: 'poster.templateMagazine', icon: 'photo-gallery' },
  { key: 'timeline', labelKey: 'poster.templateTimeline', icon: 'trend-up' },
] as const

export const privacyToggles = [
  { key: 'growth', labelKey: 'poster.privacyGrowth', noteKey: 'poster.privacyGrowthNote', defaultOn: true },
  { key: 'face', labelKey: 'poster.privacyFace', noteKey: 'poster.privacyFaceNote', defaultOn: false },
] as const

/**
 * 邀请页的角色选项。文案与成员权限页不同——这里要讲清楚「谁适用」，
 * 权限页要讲清楚「拥有什么」，所以单独一份而不是复用。
 *
 * 存键不存文案：这是模块级常量，渲染时才翻译。
 */
export const inviteRoleOptions: Array<{
  key: FamilyRole
  titleKey: 'invite.roleContributor' | 'invite.roleViewer'
  descriptionKey: 'invite.roleContributorDesc' | 'invite.roleViewerDesc'
}> = [
  {
    key: 'contributor',
    titleKey: 'invite.roleContributor',
    descriptionKey: 'invite.roleContributorDesc',
  },
  {
    key: 'viewer',
    titleKey: 'invite.roleViewer',
    descriptionKey: 'invite.roleViewerDesc',
  },
]
