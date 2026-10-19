import { posterContentHeight, redactGrowthText, type PosterSpec } from '../src/pages/family/poster/posterCanvas'
import type { MemoryItem } from '../src/pages/family/memories/memoriesData'

const memory = (id: string, mediaUrl?: string): MemoryItem => ({
  id,
  category: 'Milestone',
  title: `memory ${id}`,
  date: '2026-10-19',
  tone: 'green',
  tags: ['Milestone'],
  media: mediaUrl ? 'Media' : 'Text',
  mediaUrl,
})

const spec = (memories: MemoryItem[]): PosterSpec => ({
  template: 'warm',
  title: '标题',
  subtitle: '副标题',
  heading: '今日',
  body: '正文',
  meta: '2026.10.19',
  badge: 'MEMORY',
  memories,
  hideGrowth: false,
  faceSticker: false,
})

describe('海报排版计算', () => {
  afterAll(async () => {
    const { setLanguage } = await import('../src/i18n')
    setLanguage('zh')
  })

  it('没有勾选时是一张单页海报', () => {
    expect(posterContentHeight(spec([]))).toBe(700)
  })

  it('照片卡片比纯文字卡片高', () => {
    expect(posterContentHeight(spec([memory('1', 'https://x/a.png')]))).toBeGreaterThan(
      posterContentHeight(spec([memory('1')])),
    )
  })

  it('高度随勾选数量线性增长', () => {
    const one = posterContentHeight(spec([memory('1')]))
    const two = posterContentHeight(spec([memory('1'), memory('2')]))
    const three = posterContentHeight(spec([memory('1'), memory('2'), memory('3')]))

    expect(two - one).toBe(190)
    expect(three - two).toBe(190)
  })

  it('隐藏生长数据会移除测量数字', () => {
    const zh = redactGrowthText('今天状态很好。最近一次测量 8.00kg、68.0cm。')
    expect(zh).not.toContain('8.00kg')
    expect(zh).toContain('数字已隐藏')

    const en = redactGrowthText('Doing well. Latest measurement 8.0kg, 68cm.')
    expect(en).not.toContain('8.0kg')
  })
})
