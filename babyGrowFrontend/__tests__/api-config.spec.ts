/**
 * mock / 真实后端的路由判定。
 *
 * 这是分阶段接入的核心开关：已接通的前缀走真实请求，其余继续走 mock。
 * 判错会出现两种后果——该真实请求的被 mock 吃掉（联调看不到后端），
 * 或该 mock 的打到不存在的接口（整片页面报错），所以把边界钉在这里。
 */

import { REAL_API_PATHS, setConfig, shouldUseMock } from '../src/api/config'

const reset = (partial: Partial<Parameters<typeof setConfig>[0]> = {}) =>
  setConfig({ baseUrl: 'http://localhost:8080', useMock: true, realPaths: [...REAL_API_PATHS], ...partial })

describe('shouldUseMock', () => {
  afterEach(() => setConfig({ baseUrl: '', useMock: true, realPaths: [] }))

  it('放行已接通的鉴权、档案、记录闭环与分析模块', () => {
    reset()

    expect(shouldUseMock('/api/auth/login')).toBe(false)
    expect(shouldUseMock('/api/auth/me')).toBe(false)
    expect(shouldUseMock('/api/baby/profile')).toBe(false)
    expect(shouldUseMock('/api/baby/profile-detail')).toBe(false)
    expect(shouldUseMock('/api/baby/timeline')).toBe(false)
    expect(shouldUseMock('/api/baby/media')).toBe(false)
    expect(shouldUseMock('/api/baby/records/extract')).toBe(false)
    expect(shouldUseMock('/api/baby/records/recognize')).toBe(false)
    expect(shouldUseMock('/api/baby/records/commit')).toBe(false)
    expect(shouldUseMock('/api/baby/ai-tasks/12')).toBe(false)
    expect(shouldUseMock('/api/baby/growth')).toBe(false)
    expect(shouldUseMock('/api/baby/growth/trend')).toBe(false)
    expect(shouldUseMock('/api/baby/sleep/circadian')).toBe(false)
    expect(shouldUseMock('/api/baby/sleep/evolution')).toBe(false)
    expect(shouldUseMock('/api/baby/diet/weekly')).toBe(false)
    expect(shouldUseMock('/api/baby/diet/monthly')).toBe(false)
    expect(shouldUseMock('/api/baby/mood/calendar')).toBe(false)
    expect(shouldUseMock('/api/baby/mood/checkin-options')).toBe(false)
    expect(shouldUseMock('/api/baby/menu/today')).toBe(false)
    expect(shouldUseMock('/api/family/members')).toBe(false)
    expect(shouldUseMock('/api/family/invite')).toBe(false)
    expect(shouldUseMock('/api/family/memories')).toBe(false)
    expect(shouldUseMock('/api/wishes')).toBe(false)
    expect(shouldUseMock('/api/wishes/checklist')).toBe(false)
    expect(shouldUseMock('/api/wishes/counter')).toBe(false)
    expect(shouldUseMock('/api/baby/vaccine')).toBe(false)
    expect(shouldUseMock('/api/baby/milestones-list')).toBe(false)
    expect(shouldUseMock('/api/baby/calendar-events')).toBe(false)
    expect(shouldUseMock('/api/baby/weekly-insight')).toBe(false)
    expect(shouldUseMock('/api/family/poster')).toBe(false)
  })

  it('全部接口都已接通——没有仍需 mock 的路径', () => {
    reset()

    // 食谱推荐平时由服务端在生成缓存时调用；前端若直连也应走后端
    expect(shouldUseMock('/api/baby/recipes/recommend')).toBe(false)
  })

  it('realPaths 为空时全部走 mock（未配置后端地址的默认态）', () => {
    reset({ realPaths: [] })

    expect(shouldUseMock('/api/auth/login')).toBe(true)
    expect(shouldUseMock('/api/baby/profile-detail')).toBe(true)
    expect(shouldUseMock('/api/baby/timeline')).toBe(true)
  })

  it('useMock 关闭后一律走真实请求', () => {
    reset({ useMock: false, realPaths: [] })

    expect(shouldUseMock('/api/auth/login')).toBe(false)
    expect(shouldUseMock('/api/baby/growth')).toBe(false)
  })

  it('按前缀匹配，不会误伤同前缀的其它路径', () => {
    reset({ realPaths: ['/api/wishes'] })

    expect(shouldUseMock('/api/wishes')).toBe(false)
    expect(shouldUseMock('/api/wishes/checklist')).toBe(false)
    // 前缀不同，仍走 mock
    expect(shouldUseMock('/api/wishlist')).toBe(true)
  })
})
