/**
 * 记录弹层的文案与「AI 识别结果」。
 *
 * 版式与文案取自 design_sources/stitch/record/ 下的 record（录入弹层）、
 * record_text（纯文字识别结果）、record_pic（图片识别结果）与 record_pic_text
 * （图文识别结果）。这几页没有 Figma 源数据（Starter 计划配额耗尽），
 * 属上一轮 AI 产物，拿到源数据后需复核。
 *
 * 识别结果有两条来源：配置了后端时走真实 AI（recognitionFromExtraction），
 * 未配置时退回本文件的演示数据（resolveRecognition），保证没有后端也能看页面。
 */

import type { ExtractResult } from '@/api/modules/ai'

/** 输入形态。识别结果按它分派 */
export type RecordInputType = 'text' | 'photo' | 'photo-text'

export type RecordTagVariant = 'outline' | 'gold' | 'silver' | 'hashtag'

export interface RecordTag {
  label: string
  variant: RecordTagVariant
  icon?: string
}

export interface RecordRecognition {
  /** 结果标题 */
  title: string
  /** 标题下的一句话 */
  subtitle: string
  /** AI 总结正文 */
  summary: string
  tags: RecordTag[]
}

export const recordSheetCopy = {
  inputTitle: 'Record a Moment',
  placeholder: 'What happened today?',
  analyzeCta: 'Analyze & Save',
  analyzingText: 'AI is organizing your moment...',
  saveCta: 'Save to Timeline',
  editCta: 'Edit',
  summaryLabel: 'AI SUMMARY',
  tagsLabel: 'DETECTED TAGS',
} as const

/** 由当前输入判断属于哪种形态：有图有字、有图无字、纯文字 */
export const resolveInputType = (text: string, hasPhoto: boolean): RecordInputType => {
  if (hasPhoto) return text.trim() ? 'photo-text' : 'photo'

  return 'text'
}

const recognitions: Record<RecordInputType, RecordRecognition> = {
  text: {
    title: 'Log Processed',
    subtitle: 'AI successfully analyzed your entry',
    summary: 'Significant milestone: First solid food intake detected.',
    tags: [
      { label: 'Nutrition', variant: 'outline', icon: 'fork_knife' },
      { label: 'Milestone - Gold', variant: 'gold', icon: 'star' },
    ],
  },
  photo: {
    title: 'AI Log Success',
    subtitle: 'Your photo has been successfully analyzed.',
    summary: 'Developmental update: First tooth appearance logged.',
    tags: [
      { label: 'Health', variant: 'outline', icon: 'event-medical' },
      { label: 'Milestone - Silver', variant: 'silver', icon: 'star' },
    ],
  },
  'photo-text': {
    title: 'AI Log Success',
    subtitle: 'Your memory has been processed and is ready to save.',
    summary: 'Developmental update: Social interaction and curiosity logged.',
    tags: [
      { label: '#social_growth', variant: 'hashtag' },
      { label: '#sensory_play', variant: 'hashtag' },
      { label: '#milestone', variant: 'hashtag' },
    ],
  },
}

export const resolveRecognition = (type: RecordInputType): RecordRecognition => recognitions[type]

/**
 * 把 AI 的结构化识别结果转成结果页的展示形态。
 *
 * 只做展示转换，不做补充创造：识别出什么就显示什么，一条都没识别到就如实说明，
 * 而不是拿一份罐头数据糊过去——用户要在这页确认后才落库。
 */
export const recognitionFromExtraction = (result?: ExtractResult | null): RecordRecognition => {
  const tags: RecordTag[] = []

  result?.milestones?.forEach((item) => {
    tags.push({
      label: item.event,
      variant: item.is_first ? 'gold' : 'outline',
      icon: 'star',
    })
  })

  result?.food?.forEach((item) => {
    tags.push({
      label: item.is_first ? `${item.name}（首次）` : item.name,
      variant: 'outline',
      icon: 'fork_knife',
    })
  })

  result?.milk?.forEach((item) => {
    const amount = item.amount_ml ? ` ${item.amount_ml}ml` : ''
    tags.push({ label: `${item.type}${amount}`, variant: 'outline', icon: 'fork_knife' })
  })

  result?.sleep?.forEach((item) => {
    const hours = item.duration_min ? `${(item.duration_min / 60).toFixed(1)}h` : ''
    tags.push({ label: `睡眠 ${hours}`.trim(), variant: 'outline', icon: 'moon' })
  })

  result?.mood?.forEach((item) => {
    tags.push({ label: item.mood ?? '情绪', variant: 'outline', icon: 'heart' })
  })

  result?.growth?.forEach((item) => {
    const parts: string[] = []
    if (item.weight_kg != null) parts.push(`${item.weight_kg}kg`)
    if (item.height_cm != null) parts.push(`${item.height_cm}cm`)
    if (item.head_cm != null) parts.push(`头围 ${item.head_cm}cm`)
    if (parts.length > 0) {
      tags.push({ label: parts.join(' · '), variant: 'outline', icon: 'profile-age' })
    }
  })

  const detected = tags.length > 0

  return {
    title: detected ? 'AI Log Success' : 'Nothing Detected',
    subtitle: detected
      ? 'AI analysed your entry. Review before saving.'
      : 'No structured record was found in this entry.',
    summary: result?.summary?.trim() || (detected ? tags.map((tag) => tag.label).join(' · ') : '—'),
    tags,
  }
}

