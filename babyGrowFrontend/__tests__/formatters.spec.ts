import { setLanguage } from '../src/i18n'
import {
  monthDayLabel,
  monthYearLabel,
  relativeDayLabel,
  weekdayLabelsMondayFirst,
} from '../src/i18n/formatters'

describe('日期格式化', () => {
  afterAll(() => setLanguage('zh'))

  it('中文日期结构', () => {
    expect(monthDayLabel('2026-10-19')).toBe('10月19日')
    expect(monthYearLabel(new Date(2026, 9, 1))).toBe('2026年10月')
    expect(weekdayLabelsMondayFirst()[0]).toBe('一')
    expect(relativeDayLabel(0)).toBe('今天')
  })

  it('英文日期结构', () => {
    setLanguage('en')
    expect(monthDayLabel('2026-10-19')).toBe('October 19')
    expect(monthYearLabel(new Date(2026, 9, 1))).toBe('October 2026')
    expect(weekdayLabelsMondayFirst()[0]).toBe('Mon')
    expect(relativeDayLabel(0)).toBe('Today')
    expect(relativeDayLabel(1)).toBe('Yesterday')
  })
})
