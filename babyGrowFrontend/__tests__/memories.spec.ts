import { memoryCategoryLabel } from '../src/pages/family/memories/memoriesData'

describe('记忆分类角标', () => {
  it('规范码翻译成中文', () => {
    expect(memoryCategoryLabel('MOMENT')).toBe('瞬间')
    expect(memoryCategoryLabel('milestone')).toBe('里程碑')
    expect(memoryCategoryLabel('Smiles')).toBe('微笑')
  })

  it('未知分类保持原样', () => {
    expect(memoryCategoryLabel('Custom')).toBe('Custom')
  })
})
