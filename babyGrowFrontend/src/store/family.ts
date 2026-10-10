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

/** 首页右上角的宝宝月龄标签 */
export const babyAgeLabel = '6mo 12d'

export interface ShareHighlight {
  badge: string
  title: string
  subtitle: string
}

export const shareHighlight: ShareHighlight = {
  badge: 'AI CURATED',
  title: "Leo's First Steps",
  subtitle: 'Selected for sharing',
}

/** 邀请成员时预设的亲友身份 */
export const inviteePresets = ['外公', '外婆', '爷爷', '育儿嫂']

/** 入场凭证的内容。一次性钥匙由后端生成，这里先用 mock */
export const inviteToken = {
  code: 'LEO-938-201',
  codeNote: '一次性安全钥匙 · 72小时内有效',
  title: '亲爱的一家人，入驻时光圈！',
  body: '哈啰！我是 Leo 👶。爸爸妈妈在我的专属时光手账中为您预留了专属席位，快来见证我的成长蜕变吧！',
}

/** 受邀者视角的欢迎页文案 */
export const invitedView = {
  title: "Leo's Space Pass",
  badge: '亲爱的一家人，欢迎回家！',
  body: '您的「协作者」权限口令已被自动感应激活。加入后，您将能在微信里随时查看 Leo 的每日成长。我们开始吧！',
  inviter: 'Mom (You)',
  action: '接受邀请，即刻加入空间',
}

/** 长图海报的内容与可选项 */
export const posterContent = {
  title: 'Leo 的成长手账',
  subtitle: 'GENIUS TRACK · MEMORY CAPSULE',
  badge: '辅食探索记',
  heading: '解锁甜南瓜泥',
  body: '吃辅食就像画画，今天干掉了 150g 的甜南瓜泥，脸上、手上、肚兜上全部染成可爱的暖橙色。体重稳定增长在 12kg 黄金线上。',
  meta: '2023.09.24 · 家属记录',
}

export const posterTemplates = [
  { key: 'warm', label: '温馨手账', icon: 'edit' },
  { key: 'magazine', label: '成长杂志', icon: 'photo-gallery' },
  { key: 'timeline', label: '极简时光轴', icon: 'trend-up' },
]

export const privacyToggles = [
  { key: 'growth', label: '隐藏生长数据', note: '数字转换为可爱足迹', defaultOn: true },
  { key: 'face', label: '智能眼镜贴纸', note: '一键防窥保护面部', defaultOn: false },
]

/**
 * 邀请页的角色选项。文案与成员权限页不同——这里要讲清楚「谁适用」，
 * 权限页要讲清楚「拥有什么」，所以单独一份而不是复用。
 */
export const inviteRoleOptions: Array<{ key: FamilyRole; title: string; description: string }> = [
  {
    key: 'contributor',
    title: '共享协作者 (Contributor)',
    description:
      '推荐！外公、外婆适用。允许记录宝宝起居、发表成长寄语与点赞，无法管理其他成员。',
  },
  {
    key: 'viewer',
    title: '只读看护者 (Viewer)',
    description: '保姆、朋友适用。仅允许查看照片、视频与成长数据，无写入及修改权限，保障私密性。',
  },
]
