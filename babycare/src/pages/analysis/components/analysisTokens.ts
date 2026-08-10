/**
 * analysisTokens
 *
 * 这个文件集中定义 analysis 模块里反复出现的视觉 token。
 * 对初学者来说，可以把它理解成“分析页的设计字典”：
 * - 颜色不再散落在每个组件里
 * - 圆角、阴影、边框样式统一收口
 * - 后续想整体换风格时，只改这里会轻松很多
 */

export const analysisColors = {
  titleAccent: '#835332',
  activeBg: '#D9E7CE',
  activeText: '#5B7358',
  inactiveBg: '#EFEEEB',
  inactiveText: '#7A766F',
  cardBorder: '#E4DFD9',
  cardMutedBorder: '#E0DAD2',
  cardMutedBg: '#F4F1EC',
  softGreenBg: 'rgba(217,231,206,0.5)',
  softGreenBorder: 'rgba(201,218,189,0.8)',
  pillGreenBg: '#E8F0E1',
  textPrimary: '#2E2822',
  textSecondary: '#6F6760',
  textTertiary: '#8C857D',
  textMuted: '#9B958E',
  highlightOrange: '#C97D55',
  highlightOlive: '#88A48A',
  sleepNight: '#97A8AF',
  sleepNap: '#D2C9BC',
  sleepAwake: '#E7E8E6',
  chartSurface: '#F7F4EF',
  chartBorder: '#E6DDD4',
  chartGrid: '#E5DDD4',
  iconBg: '#ECE8E2',
} as const

export const analysisRadii = {
  xl: 'rounded-[24px]',
  xxl: 'rounded-[28px]',
  card: 'rounded-[32px]',
  pill: 'rounded-full',
} as const

export const analysisShadows = {
  card: 'shadow-[0_4px_30px_rgba(0,0,0,0.04)]',
  elevated: 'shadow-[0_30px_60px_-15px_rgba(0,0,0,0.04)]',
} as const

export const analysisClasses = {
  card: `bg-white border border-[${analysisColors.cardBorder}] ${analysisShadows.card}`,
  softCard: `bg-[${analysisColors.cardMutedBg}] border border-[${analysisColors.cardMutedBorder}]`,
  interactivePill: `bg-[${analysisColors.activeBg}] text-[${analysisColors.activeText}]`,
} as const
