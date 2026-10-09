/**
 * 每周小记（Weekly Insights）的视图数据。
 * 按 Figma 节点 2:899 还原；后端接口未实现，先用本地 mock。
 */

export type InsightTone = 'tertiary' | 'secondary'

export interface MetricSummary {
  key: 'weight' | 'height'
  icon: string
  label: string
  value: string
  unit: string
  delta: string
  tone: InsightTone
}

export interface SleepConsistency {
  title: string
  subtitle: string
  status: string
  /** 每天睡眠小时数，用来画柱高 */
  dailyHours: number[]
}

export interface DevelopmentHighlight {
  id: string
  title: string
  date: string
  description: string
  icon: string
  tone: InsightTone
}

export interface WeeklyInsight {
  rangeLabel: string
  metrics: MetricSummary[]
  sleep: SleepConsistency
  highlights: DevelopmentHighlight[]
  advice: { title: string; content: string }
}

export const weekdayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

export const weeklyInsight: WeeklyInsight = {
  rangeLabel: 'Oct 12 - Oct 18',
  metrics: [
    {
      key: 'weight',
      icon: 'metric-weight',
      label: 'Weight',
      value: '8.4',
      unit: 'kg',
      delta: '+240g',
      tone: 'tertiary',
    },
    {
      key: 'height',
      icon: 'metric-height',
      label: 'Height',
      value: '68.2',
      unit: 'cm',
      delta: '+1.2cm',
      tone: 'secondary',
    },
  ],
  sleep: {
    title: 'Sleep Consistency',
    subtitle: 'Avg: 11.4 hrs / night',
    status: 'Stable',
    dailyHours: [11.2, 11.8, 10.9, 11.6, 12.1, 11.4, 10.8],
  },
  highlights: [
    {
      id: 'social-smile',
      title: 'The Social Smile',
      date: 'OCT 14',
      description:
        'Leo showed a sustained social smile when his grandma visited. This marks a key cognitive leap in recognition!',
      icon: 'happy-mood',
      tone: 'tertiary',
    },
    {
      id: 'rolling-over',
      title: 'Rolling Over',
      date: 'OCT 16',
      description:
        'Successfully rolled from tummy to back during the morning session. Increased core strength observed.',
      icon: 'baby-walk',
      tone: 'secondary',
    },
  ],
  advice: {
    title: 'Nurture Buddy Insight',
    content:
      '"Leo is showing great progress in physical coordination this week! To support his neck strength, try extending tummy time by 5 minutes each afternoon using a colorful toy to encourage tracking."',
  },
}
