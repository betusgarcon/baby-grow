import { setLanguage, t } from '../src/i18n'

describe('i18n', () => {
  afterAll(() => setLanguage('zh'))

  it('默认中文', () => {
    expect(t('tab.journey')).toBe('旅程')
  })

  it('支持占位符插值', () => {
    const text = t('invite.codeExpiry', { hours: 72 })
    expect(text).toContain('72')
  })

  it('切换英文后整条文案变英文', () => {
    setLanguage('en')
    expect(t('tab.journey')).toBe('Journey')
    expect(t('common.cancel')).toBe('Cancel')
    expect(t('analysis.records.other', { count: 3 })).toBe('3 Records')
  })
})
