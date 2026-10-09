/**
 * 记录弹层的文案与「AI 识别结果」。
 *
 * 版式与文案取自 design_sources/stitch/record/ 下的 record（录入弹层）、
 * record_text（纯文字识别结果）、record_pic（图片识别结果）与 record_pic_text
 * （图文识别结果）。这几页没有 Figma 源数据（Starter 计划配额耗尽），
 * 属上一轮 AI 产物，拿到源数据后需复核。
 *
 * 后端未实现，识别结果由本文件的 mock 按输入类型给出，
 * 接入真实接口后只需把 resolveRecognition 换成请求即可，弹层不用改。
 */

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
