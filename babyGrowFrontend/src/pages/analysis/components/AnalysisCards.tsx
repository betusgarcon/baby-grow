import { PropsWithChildren, useMemo, useRef, useState } from 'react'
import { Input, Textarea, View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import AnalysisChart from '@/components/AnalysisChart'
import Icon from '@/components/Icon'
import { moodCheckin } from '@/api/modules/mood'
import { t } from '@/i18n'
import { weekdayLabelsMondayFirst } from '@/i18n/formatters'
import BaseAnalysisCard from './BaseAnalysisCard'
import {
  DailySleepLogItem,
  DonutLegendItem,
  GrowthComparisonChartPoint,
  GrowthChartPoint,
  InsightBlockData,
  MetricItem,
  MilestoneItem,
  MoodCalendarDay,
  MoodCheckinOption,
  MoodLegendItem,
  SleepCircadianSummary,
  SleepEvolutionRow,
  WeeklyDietBar,
} from '@/types/analysis'
import {
  createDietDonutOption,
  createDietWeekBarOption,
  createGrowthTrendOption,
  createSleepDailyRingOption,
} from './analysisChartOptions'
import { analysisColors } from './analysisTokens'

/**
 * AnalysisCards
 *
 * 这个文件放的是 analysis 模块里复用度较高的内容卡片。
 * 可以把它理解成“页面积木库”：
 * - 页面只负责拼装
 * - 数据通过 props 注入
 * - 样式尽量统一复用
 */
export function InsightCard({ data }: { data: InsightBlockData }) {
  // InsightCard 负责承载 AI 文本洞察。
  // 它本身不关心“内容从哪来”，只负责把标题和正文排成统一视觉。
  return (
    <BaseAnalysisCard
      className="flex flex-col gap-3"
      style={{
        backgroundColor: analysisColors.softGreenBg,
        border: `1px solid ${analysisColors.softGreenBorder}`,
      }}
    >
      <View className="flex items-center gap-2">
        <Icon name="ai-conclude" className="w-4 h-4" />
        <Text
          className="text-base font-bold leading-5 tracking-wide"
          style={{ color: analysisColors.titleAccent }}
        >
          {data.title}
        </Text>
      </View>
      <Text className="text-base leading-6" style={{ color: analysisColors.textPrimary }}>{data.content}</Text>
    </BaseAnalysisCard>
  )
}

/**
 * MetricOverviewCard
 *
 * growth 页最上面的三项概览卡：
 * 点击不同指标后，会切换下方折线图的数据集。
 */
export function MetricOverviewCard({
  metrics,
  activeIndicator = '#d39a72',
  onMetricChange,
}: {
  metrics: MetricItem[]
  activeIndicator?: string
  onMetricChange?: (key: string) => void
}) {
  return (
    <View
      className="w-full bg-card p-1 flex flex-col gap-1 rounded-[32px]"
      style={{
        border: `1px solid ${analysisColors.cardBorder}`,
        boxShadow: '0 4px 30px rgba(0,0,0,0.04)',
      }}
    >
      <View className="grid grid-cols-3 gap-2">
        {metrics.map((metric) => (
          <View
            key={metric.key}
            className="px-1 py-1 flex flex-col items-center justify-between gap-1"
            onClick={() => onMetricChange?.(metric.key)}
          >
            <Text className="text-[#92613A] text-sm font-bold tracking-wide text-center">{metric.label}</Text>
            <View className="flex items-baseline gap-1">
              <Text className="text-[#8B5A2B] text-sm leading-5 font-semibold text-center">{metric.value}</Text>
              <Text className="text-[#8B8A86] text-sm text-center">{metric.unit}</Text>
            </View>
            <View
              className="w-16 h-1 rounded-full mt-1"
              style={{ background: metric.active ? activeIndicator : 'transparent' }}
            />
          </View>
        ))}
      </View>
    </View>
  )
}

export function ChartCard({
  title,
  subtitle,
  extra,
  children,
}: PropsWithChildren<{
  title: string
  subtitle?: string
  extra?: string
}>) {
  // ChartCard 是最常见的“标题 + 图表内容”容器。
  // extra 通常用来放状态 badge，比如“Solids Exploring”。
  return (
    <BaseAnalysisCard className="flex flex-col gap-4">
      <View className="flex items-start justify-between gap-3">
        <View className="flex-1">
          <Text className="block text-lg leading-7 font-semibold" style={{ color: analysisColors.textPrimary }}>{title}</Text>
          {subtitle ? (
            <Text className="block text-sm leading-5 mt-1" style={{ color: analysisColors.textSecondary }}>{subtitle}</Text>
          ) : null}
        </View>
        {extra ? (
          <View
            className="px-3 py-1 rounded-full"
            style={{ backgroundColor: analysisColors.pillGreenBg }}
          >
            <Text
              className="text-sm font-bold whitespace-nowrap"
              style={{ color: analysisColors.activeText }}
            >
              {extra}
            </Text>
          </View>
        ) : null}
      </View>
      {children}
    </BaseAnalysisCard>
  )
}

export function GrowthTrendChart({
  points,
  chartLabel = 'Weight (kg)',
  comparisonLabel = 'WHO Boy Standard',
}: {
  points: Array<GrowthChartPoint | GrowthComparisonChartPoint>
  chartLabel?: string
  comparisonLabel?: string
}) {
  // 这张卡只负责把“文案标题 / 图表 / 图例”组合好。
  // 具体折线如何画，继续下沉给 AnalysisChart + option 工厂函数。
  return (
    <View className="flex flex-col gap-3">
      <View className="flex items-end justify-between text-sm font-semibold" style={{ color: analysisColors.textSecondary }}>
        <View className="flex items-baseline gap-3">
          <Text>{chartLabel}</Text>
          <Text className="text-xs font-medium text-[#8C857D]">{t('analysis.ageMonths')}</Text>
        </View>
        <Text>{comparisonLabel}</Text>
      </View>

      <View
        className="h-52 rounded-[28px] px-3 py-3 overflow-hidden"
        style={{
          backgroundColor: '#F2EEEA',
          border: `1px solid ${analysisColors.cardMutedBorder}`,
        }}
      >
        <AnalysisChart option={createGrowthTrendOption(points)} style={{ height: '100%', width: '100%' }} />
      </View>

      <View className="flex items-center gap-5 px-1">
        <View className="flex items-center gap-2">
          <View className="w-3 h-3 rounded-full" style={{ backgroundColor: analysisColors.highlightOrange }} />
          <Text className="text-sm font-semibold" style={{ color: analysisColors.textSecondary }}>{t('analysis.babyTrend')}</Text>
        </View>
        <View className="flex items-center gap-2">
          <View className="w-3 h-3 rounded-full" style={{ backgroundColor: analysisColors.highlightOlive }} />
          <Text className="text-sm font-semibold" style={{ color: analysisColors.textSecondary }}>{t('analysis.whoMedian')}</Text>
        </View>
      </View>
    </View>
  )
}

export function MetricFooter({
  age,
  value,
  badge,
}: {
  age: string
  value: string
  badge: string
}) {
  // 折线图底部的摘要栏，用来补充当前快照对应的年龄和值。
  return (
    <View className="w-full p-4 rounded-[24px] flex flex-row items-center justify-between" style={{ backgroundColor: '#F3F5EE' }}>
      <View className="flex-1 flex-col gap-1 pr-2">
          <View className="pr-2">
            <Text className="text-sm text-[#8C827A]">Age:</Text>
            <Text className="text-sm font-semibold text-[#2E2822]">{age}</Text>
          </View>
          <View className="pr-2">
            <Text className="text-sm text-[#8C827A]">Value: </Text>
            <Text className="text-sm font-semibold text-[#2E2822]">{value}</Text>   
          </View>
      </View>

      <View className="px-3 py-1.5 shrink-0 rounded-full" style={{ backgroundColor: analysisColors.activeBg }}>
        <Text className="text-sm font-bold" style={{ color: analysisColors.activeText }}>
          {badge}
        </Text>
      </View>
    </View>
  )
}

export function DietDonutSummary({
  ratio,
  title,
  legends,
}: {
  ratio: number
  title: string
  legends: DonutLegendItem[]
}) {
  // 调试：确认传入的 legends 数据和每个 colorClass 解析后的颜色
  const option = useMemo(() => {
    const opt = createDietDonutOption(legends)
    const colors = (opt.series?.[0]?.data as Array<{ itemStyle?: { color?: string } }> ?? [])
      .map((d) => d.itemStyle?.color)
    console.log('[DONUT] legends=', legends, 'series.colors=', colors)
    return opt
  }, [legends])

  return (
    <View className="flex items-center gap-4">
      <View className="w-28 h-28 shrink-0 relative">
        <AnalysisChart option={option} style={{ height: '112px', width: '112px' }} />
        <View className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <View className="text-center bg-white/85 rounded-full px-2 py-1">
          <Text className="block text-xs text-[#6F6760] font-bold">{title}</Text>
          <Text className="block text-base leading-7 font-bold text-[#2E2822]">{ratio}%</Text>
          </View>
        </View>
      </View>

      <View className="flex-1 flex flex-col gap-3">
        {legends.map((item) => (
          <View key={item.label} className="flex items-center justify-between gap-3">
            <View className="flex items-center gap-2">
              <View className={`w-3 h-3 rounded-full ${item.colorClass}`} />
              <Text className="text-sm text-[#2E2822]">{item.label}</Text>
            </View>
            <Text className="text-sm font-bold text-[#2E2822]">{item.value}%</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

export function IngredientToleranceCard({
  title,
  badge,
  ingredients,
}: {
  title: string
  badge: string
  ingredients: string[]
}) {
  // 已尝试食材列表是一个“小型可编辑集合”：
  // - 点击 +More 进入录入态
  // - 长按单项显示删除入口
  // 这类交互用本地 state 管理就足够了，不需要全局状态。
  const [items, setItems] = useState(ingredients)
  const [draftIngredient, setDraftIngredient] = useState('')
  const [showComposer, setShowComposer] = useState(false)
  const [activeDeleteKey, setActiveDeleteKey] = useState<string | null>(null)

  const handleAddIngredient = () => {
    // 录入前先 trim，避免用户只输入空格也生成一条“空食材”。
    const value = draftIngredient.trim()

    if (!value) return

    setItems((current) => [...current, value])
    setDraftIngredient('')
    setShowComposer(false)
  }

  /** 收起录入框并清掉草稿，免得下次展开还留着上次没提交的内容 */
  const handleCancelIngredient = () => {
    setDraftIngredient('')
    setShowComposer(false)
  }

  return (
    <View className="w-full p-4 bg-[#F4F1EC] rounded-[32px] border border-[#E0DAD2] flex flex-col gap-3">
      <View className="flex items-center justify-between gap-3">
        <View className="flex items-center gap-2">
          <Icon name="sunny" className="w-5 h-5" />
          <Text className="text-sm font-bold text-[#2E2822]">{title}</Text>
        </View>
        <Text className="text-xs font-bold text-[#6D6A64]">{badge}</Text>
      </View>
      <View className="flex flex-wrap gap-2">
        {items.map((ingredient) => (
          <View
            key={ingredient}
            className="relative px-3 py-1 bg-white rounded-full border border-[#CFC8BF] shadow-sm transition-all duration-200"
            // 长按才显示删除入口，平时保持列表干净，不让每个 tag 都带着 X。
            onLongPress={() => setActiveDeleteKey(ingredient)}
          >
            <Text className="text-sm text-[#2E2822]">{ingredient}</Text>
            {activeDeleteKey === ingredient ? (
              <View
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#835332] flex items-center justify-center"
                onClick={() => {
                  setItems((current) => current.filter((item) => item !== ingredient))
                  setActiveDeleteKey(null)
                }}
              >
                <Text className="text-white text-xs leading-none">X</Text>
              </View>
            ) : null}
          </View>
        ))}
        <View
          className="px-3 py-1 bg-[#EBE7E2] rounded-full border border-dashed border-[#BFB7AE]"
          onClick={() => setShowComposer(true)}
        >
          <Text className="text-sm text-[#6D6761]">{t('analysis.addMore')}</Text>
        </View>
      </View>
      {showComposer ? (
        <View className="mt-1 p-3 rounded-[24px] bg-white border border-[#DDD7CF] flex flex-col gap-2 shadow-sm">
          <Input
            className="w-full text-sm text-[#2E2822]"
            placeholder={t('mood.newFoodPlaceholder')}
            value={draftIngredient}
            onInput={(event) => setDraftIngredient(event.detail.value)}
          />
          {/* 按钮另起一行右对齐：挤在输入框同一行时，窄屏上三者都会被压扁 */}
          <View className="flex items-center justify-end gap-2">
            <View
              className="px-3 py-1.5 rounded-full bg-[#EBE7E2]"
              onClick={handleCancelIngredient}
            >
              <Text className="text-sm font-semibold text-[#6D6761]">{t('common.cancel')}</Text>
            </View>
            <View className="px-3 py-1.5 rounded-full bg-[#D9E7CE]" onClick={handleAddIngredient}>
              <Text className="text-sm font-semibold text-[#5B7358]">{t('common.add')}</Text>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  )
}

export function MilestoneProgressCard({ items }: { items: MilestoneItem[] }) {
  // 这块更像“进度总览”，所以用最简单的映射渲染：
  // 状态差异主要靠颜色和文案，而不是复杂交互。
  return (
    <View className="w-full flex flex-col gap-4">
      <View className="flex items-center justify-between px-1">
        <Text className="text-sm tracking-wide font-bold text-[#585A55]">{t('analysis.milestoneProgress')}</Text>
        <Text className="text-sm font-bold text-[#6B775F]">
          {items.filter((item) => item.unlocked).length} Unlocked
        </Text>
      </View>
      <View className="flex items-start justify-between gap-3">
        {items.map((item) => (
          <View key={item.label} className="flex-1 flex flex-col items-center gap-2">
            <View
              className={`w-16 h-16 rounded-full flex items-center justify-center ${
                item.unlocked ? 'bg-[#D2DFC4]' : 'bg-[#8C8D88]'
              }`}
            >
              <Icon name={item.icon} className="w-6 h-6" style={{ opacity: item.unlocked ? 1 : 0.5 }} />
            </View>
            <Text
              className={`text-xs leading-4 text-center ${
                item.unlocked ? 'text-[#2E2822] font-bold' : 'text-[#7A7671]'
              }`}
            >
              {item.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  )
}

export function WeeklyMilkChart({
  bars,
  averageLabel,
  standardLabel,
}: {
  bars: WeeklyDietBar[]
  averageLabel: string
  standardLabel: string
}) {
  // 饮食周视图的核心是“奶量变化 + 标准区间说明”，
  // 所以上面的三行文案尽量保持固定结构，方便快速扫读。
  return (
    <View className="w-full flex flex-col gap-4">
      <View className="flex flex-col gap-1">
        <Text className="text-base text-[#2E2822]">{t('analysis.dietTrend')}</Text>
        <Text className="text-base text-[#6F6760]">{averageLabel}</Text>
        <Text className="text-base font-bold uppercase text-[#D57C69]">{standardLabel}</Text>
      </View>

      <View className="h-44 rounded-[24px] bg-[#F7F4EF] border border-[#ECE4DB] px-2 py-2 overflow-hidden">
        <AnalysisChart option={createDietWeekBarOption(bars)} style={{ height: '100%', width: '100%' }} />
      </View>
    </View>
  )
}

export function NarrativeNote({
  text,
}: {
  text: string
}) {
  // 用于承载图表下方的补充说明，样式上故意比 AI 卡更轻一点，
  // 这样主次关系会更清楚。
  return (
    <View className="w-full p-4 bg-[#F4F1EC] rounded-[24px] border border-[#E0DAD2] flex items-start gap-3">
      <Icon name="insight-summary" className="w-4 h-4 shrink-0" />
      <Text className="flex-1 text-base leading-6 text-[#2E2822]">{text}</Text>
    </View>
  )
}

export function CircadianRingCard({
  summary,
}: {
  summary: SleepCircadianSummary
}) {
  // 环图上方的中心文案和下方的 Night / Naps 摘要，都来自同一份 summary。
  // 这样改动 mock 数据时，不会出现“环图比例改了，底部文案没跟着改”的问题。
  //
  // segments 要兜底：后端没给分段时 `.reduce` 会抛 TypeError，而这发生在 render 期间，
  // 小程序没有错误边界——整页白屏。
  const segments = summary.segments ?? []
  const totalHours = segments.reduce((sum, segment) => sum + segment.value, 0)
  // 后端现在会给稳定的 type；label 只是展示文案，随语言变化。
  // 旧的 label 兜底保留，兼容尚未升级的接口。
  const nightSegment = segments.find(
    (segment) => segment.type === 'night' || segment.label === 'Night Sleep' || segment.label === 'Night',
  )
  const napSegment = segments.find(
    (segment) => segment.type === 'nap' || segment.label === 'Nap Sleep' || segment.label === 'Nap',
  )

  // 各段都是 0 时 totalHours 也是 0，0/0 得到 NaN，会原样渲染成 "NaN%"
  const percentOf = (value: number | undefined) =>
    totalHours > 0 ? Math.round(((value ?? 0) / totalHours) * 100) : 0

  return (
    <BaseAnalysisCard className="overflow-hidden" elevated padded={false}>
      <View className="px-5 pt-4 flex items-start justify-between gap-3">
        <View>
          <Text className="text-[#8C857D] text-sm font-bold uppercase tracking-[0.2em]">{t('analysis.circadianRing')}</Text>
          <Text className="block text-base text-[#2E2822] mt-1">{t('analysis.rhythm')}</Text>
        </View>
        <View className="px-4 py-2 rounded-full flex items-center gap-1.5" style={{ backgroundColor: analysisColors.pillGreenBg }}>
          <Icon name="polar-guide" className="w-4 h-4" />
          <Text className="text-base whitespace-nowrap" style={{ color: analysisColors.activeText }}>{t('analysis.sleepGuide')}</Text>
        </View>
      </View>

      <View className="px-5 py-8 flex justify-center relative">
        {/* 外层容器比圆环大，为时间标签留出空间 */}
        <View className="w-80 h-80 relative flex items-center justify-center">
          <AnalysisChart option={createSleepDailyRingOption(summary)} style={{ height: '224px', width: '224px' }} />

          {/* 四个方位的时间刻度 - 放置在圆环外侧，不与圆环重叠 */}
          {/* 顶部 00:00 */}
          <Text className="absolute -top-1 left-1/2 -translate-x-1/2 text-base font-medium text-[#9B958E]">
            00:00
          </Text>
          {/* 右侧 06:00：文字左边缘贴在圆环右外侧 */}
          <Text
            className="absolute top-1/2 -translate-y-1/2 text-base font-medium text-[#9B958E]"
            style={{ left: 'calc(50% + 120px)' }}
          >
            06:00
          </Text>
          {/* 底部 12:00 */}
          <Text className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-base font-medium text-[#9B958E]">
            12:00
          </Text>
          {/* 左侧 18:00：文字右边缘贴在圆环左外侧 */}
          <Text
            className="absolute top-1/2 -translate-y-1/2 text-base font-medium text-[#9B958E] text-right"
            style={{ right: 'calc(50% + 120px)' }}
          >
            18:00
          </Text>

          {/* 中心内容 */}
          <View className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <View className="text-center w-24 flex flex-col items-center">
              <Text className="block text-[#8C857D] text-base">{t('analysis.totalSleep')}</Text>
              <Text className="block text-[#2E2822] text-lg leading-7 font-semibold">
                {summary.totalSleepLabel}
              </Text>
              <View className="mt-2 px-3 py-1 rounded-full max-w-full" style={{ backgroundColor: analysisColors.activeBg }}>
                <Text className="text-xs font-medium text-center whitespace-nowrap" style={{ color: analysisColors.activeText }}>
                  {summary.goalLabel}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      <View className="px-10 py-6 border-t border-[#ECE6DF] flex items-center justify-between">
        <View className="flex items-center gap-2">
          <View className="w-3 h-3 rounded-full bg-[#97A8AF]" />
          <View>
            <Text className="block text-base text-[#2E2822]">{t('analysis.night')}</Text>
            <Text className="block text-base text-[#6F6760]">
              {summary.nightLabel} · {percentOf(nightSegment?.value)}%
            </Text>
          </View>
        </View>

        <View className="flex items-center gap-2">
          <View className="w-3 h-3 rounded-full bg-[#D2C9BC]" />
          <View>
            <Text className="block text-base text-[#2E2822]">{t('analysis.naps')}</Text>
            <Text className="block text-base text-[#6F6760]">
              {summary.napLabel} · {percentOf(napSegment?.value)}%
            </Text>
          </View>
        </View>
      </View>
    </BaseAnalysisCard>
  )
}

export function DailySleepLogCard({ logs }: { logs: DailySleepLogItem[] }) {
  // Daily Sleep Log 同时维护两份数据：
  // 1. syncedLogs: 当前已经展示在列表里的正式记录
  // 2. drafts: 还没同步的临时草稿
  // 这样就能模拟“先编辑，后同步”的真实产品交互。
  const [drafts, setDrafts] = useState<Array<{ id: string; title: string; start: string; end: string }>>([])
  const [syncedLogs, setSyncedLogs] = useState<DailySleepLogItem[]>(logs)

  // 草稿 id 用自增计数器，不能用 current.length + 1。
  //
  // 用长度的话删掉中间一行再新增就会重复：[draft-1, draft-2] 删掉 draft-1 之后
  // 长度回到 1，新增又生成 draft-2。两行共用一个 id，handleDraftChange 会同时改到
  // 两行，React 的 key 也会撞。
  const draftSequence = useRef(0)

  const handleAddDraft = () => {
    // 新增草稿时直接给一份默认值，
    // 这样页面能立刻看到一行可编辑表单，不需要先弹窗。
    setDrafts((current) => {
      draftSequence.current += 1

      return [
        ...current,
        {
          id: `draft-${draftSequence.current}`,
          title: current.length % 2 === 0 ? 'Late Nap' : 'Quick Snooze',
          start: current.length % 2 === 0 ? '18:10' : '10:20',
          end: current.length % 2 === 0 ? '18:45' : '10:50',
        },
      ]
    })
  }

  const handleDraftChange = (id: string, field: 'title' | 'start' | 'end', value: string) => {
    // 每次只更新被编辑的那一条草稿，保持其他输入不受影响。
    setDrafts((current) =>
      current.map((draft) => (draft.id === id ? { ...draft, [field]: value } : draft))
    )
  }

  const handleRemoveDraft = (id: string) => {
    setDrafts((current) => current.filter((draft) => draft.id !== id))
  }

  const handleRemoveSyncedLog = (id: string) => {
    setSyncedLogs((current) => current.filter((log) => log.id !== id))
  }

  const formatDuration = (start: string, end: string) => {
    // 这里没有直接依赖日期库，而是自己算分钟差。
    // 原因是当前 mock 只处理同一天内的睡眠片段，这样实现更轻。
    const [startHour, startMinute] = start.split(':').map(Number)
    const [endHour, endMinute] = end.split(':').map(Number)
    const totalMinutes = Math.max(0, endHour * 60 + endMinute - (startHour * 60 + startMinute))
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60

    if (hours && minutes) return `${hours}h ${minutes}m`
    if (hours) return `${hours}h`
    return `${minutes}m`
  }

  const handleSync = () => {
    if (!drafts.length) return

    // “同步”本质上就是把草稿转成正式日志项，再清空草稿区。
    const newLogs = drafts.map((draft) => ({
      id: `synced-${draft.id}`,
      title: draft.title || 'Custom Nap',
      range: `${draft.start} — ${draft.end}`,
      duration: formatDuration(draft.start, draft.end),
      icon: 'nap',
    }))

    setSyncedLogs((current) => [...current, ...newLogs])
    setDrafts([])
  }

  return (
    <View className="w-full flex flex-col gap-3">
      <View className="flex items-center justify-between">
        <View className="flex items-center gap-2">
          <Icon name="daily-sleep-log" className="w-5 h-5" />
          <Text className="text-lg leading-7 text-[#2E2822]">{t('analysis.sleepLog')}</Text>
        </View>
        <Text className="text-base text-[#8C857D]">{syncedLogs.length} Records</Text>
      </View>

      {syncedLogs.map((log) => (
        <View key={log.id} className="w-full p-2 bg-[#F4F1EC] rounded-[32px] flex items-center justify-between gap-3">
          <View className="flex items-center gap-2">
            <View className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center">
              <Icon name={log.icon || 'nap'} className="w-5 h-5" />
            </View>
            <View>
              <Text className="block text-base font-semibold text-[#2E2822]">{log.title}</Text>
              <Text className="block text-base text-[#6F6760]">{log.range}</Text>
            </View>
          </View>

          <View className="flex items-center gap-4">
            <Text className="text-lg text-[#2E2822]">{log.duration}</Text>
            {/* 叉号删除按钮 */}
            <View
              className="w-7 h-7 rounded-full flex items-center justify-center"
              onClick={() => handleRemoveSyncedLog(log.id)}
            >
              <Icon name="delete" className="w-5 h-5" />
            </View>
          </View>
        </View>
      ))}

      <View className="w-full p-6 bg-card rounded-[32px] border-2 border-dashed border-[#D8DDD8] flex flex-col gap-5">
        <View className="flex items-center gap-2" onClick={handleAddDraft}>
          <Icon name="add-circle" className="w-5 h-5" />
          <Text className="text-base text-[#2E2822]">{t('analysis.quickAdd')}</Text>
        </View>

        {drafts.length ? (
          <View className="flex flex-col gap-4">
            {drafts.map((draft) => (
              <View key={draft.id} className="p-4 rounded-[24px] bg-[#F7F4EF] flex flex-col gap-3">
                <View className="flex items-center justify-between gap-3">
                  <Input
                    className="flex-1 text-base text-[#2E2822]"
                    value={draft.title}
                    onInput={(event) => handleDraftChange(draft.id, 'title', event.detail.value)}
                  />
                  {/* 叉号删除按钮：与正式记录保持一致 */}
                  <View
                    className="w-7 h-7 rounded-full flex items-center justify-center"
                    onClick={() => handleRemoveDraft(draft.id)}
                  >
                    <Icon name="delete" className="w-5 h-5" />
                  </View>
                </View>

                <View className="flex items-start gap-3">
                  <View className="flex-1 flex flex-col gap-1">
                    <Text className="text-[#8C857D] text-base">{t('analysis.start')}</Text>
                    <View className="px-3 py-2 bg-white rounded-md flex items-center justify-between">
                      <Input
                        className="text-base text-[#2E2822]"
                        value={draft.start}
                        onInput={(event) => handleDraftChange(draft.id, 'start', event.detail.value)}
                      />
                      <Icon name="time-input" className="w-4 h-4" />
                    </View>
                  </View>

                  <View className="flex-1 flex flex-col gap-1">
                    <Text className="text-[#8C857D] text-base">{t('analysis.end')}</Text>
                    <View className="px-3 py-2 bg-white rounded-md flex items-center justify-between">
                      <Input
                        className="text-base text-[#2E2822]"
                        value={draft.end}
                        onInput={(event) => handleDraftChange(draft.id, 'end', event.detail.value)}
                      />
                      <Icon name="time-input" className="w-4 h-4" />
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        <View
          className={`w-full py-3 rounded-full shadow-sm flex items-center justify-center ${
            drafts.length ? 'bg-[#9AB5BE]' : 'bg-[#CAD6DA]'
          }`}
          onClick={handleSync}
        >
          <Text className="text-base text-white">{t('analysis.syncRhythm')}</Text>
        </View>
      </View>
    </View>
  )
}

// 类型颜色映射
const segmentColors: Record<string, string> = {
  night: '#485f65',    // 长夜觉：深蓝灰色
  nap: '#8ea584',      // 白日小睡：浅橄榄绿色
  awake: '#e5dfd8',    // 清醒：米白色（作为背景填充）
}

export function SleepEvolutionCard({ rows }: { rows: SleepEvolutionRow[] }) {
  // 24小时 = 100%
  const totalHours = 24

  return (
    <View className="w-full p-5 bg-card rounded-[32px] border border-[#E4DFD9] flex flex-col gap-4">
      {/* 标题区域 */}
      <View className="flex items-start justify-between gap-3">
        <View>
          <Text className="block text-lg leading-7 font-semibold text-[#2E2822]">{t('analysis.sleepEvolution')}</Text>
          <Text className="block text-base text-[#8C857D] mt-1">{t('analysis.sleepEvolutionHint')}</Text>
        </View>
        {/* 这里原本有一个写死的徽章，文案是「节律趋于合流」。它是一句关于自家宝宝
            睡眠状态的判断，却与任何接口数据无关——每个用户看到的都是同一句话。
            后端目前没有对应字段，所以先去掉，而不是继续展示一句编出来的结论。 */}
      </View>

      {/* 图表区域：X轴 + 条形图 */}
      <View className="mx-2">
        {/* 统一的X轴刻度：首尾标签使用边缘对齐，中间标签使用居中对齐 */}
        <View className="relative h-5">
          {[
            { hour: 0, label: '0h', sub: t('analysis.deepNight'), align: 'left' },
            { hour: 6, label: '6h', sub: '', align: 'center' },
            { hour: 12, label: '12h', sub: t('analysis.noon'), align: 'center' },
            { hour: 18, label: '18h', sub: '', align: 'center' },
            { hour: 24, label: '24h', sub: '', align: 'right' },
          ].map((item) => {
            const isFirst = item.align === 'left'
            const isLast = item.align === 'right'
            const positionStyle = isFirst
              ? { left: '0%' }
              : isLast
              ? { right: '0%' }
              : { left: `${(item.hour / totalHours) * 100}%`, transform: 'translateX(-50%)' }

            return (
              <View
                key={item.hour}
                className={`absolute flex items-baseline gap-0.5 ${isFirst ? 'text-left' : isLast ? 'text-right' : ''}`}
                style={positionStyle}
              >
                <Text className="text-xs font-semibold text-[#8C857D]">{item.label}</Text>
                {item.sub ? <Text className="text-xs text-[#A8A09A]">{item.sub}</Text> : null}
              </View>
            )
          })}
        </View>

        {/* 每行数据：标签+说明在上，条形图在下 */}
        <View className="flex flex-col gap-2">
          {rows.map((row) => (
            <View key={row.label} className="flex flex-col gap-1.5">
              {/* 第一行：标签和说明 */}
              <View className="flex items-center justify-between">
                <Text className="text-xs font-semibold text-[#2E2822]">{row.label}</Text>
                <Text className="text-xs font-medium text-[#86807A]">{row.summary}</Text>
              </View>

              {/* 第二行：条形图 */}
              <View className="w-full h-5 flex flex-row overflow-hidden rounded-md">
                {row.segments.map((segment, idx) => {
                  const widthPercent = (segment.duration / totalHours) * 100
                  const isFirst = idx === 0
                  const isLast = idx === row.segments.length - 1
                  const borderRadius = isFirst && row.segments.length === 1
                    ? 'rounded-md'
                    : isFirst
                    ? 'rounded-l-md'
                    : isLast
                    ? 'rounded-r-md'
                    : ''

                  return (
                    <View
                      key={`${segment.startHour}-${idx}`}
                      className={`${borderRadius}`}
                      style={{
                        width: `${widthPercent}%`,
                        backgroundColor: segmentColors[segment.type],
                      }}
                    />
                  )
                })}
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* 底部图例：缩小间距和图标 */}
      <View className="flex items-center justify-center gap-4 flex-wrap">
        <View className="flex items-center gap-1.5">
          <View className="w-3 h-3 rounded-full bg-[#485F65]" />
          <Text className="text-xs font-medium text-[#4A423B]">{t('analysis.nightSleep')}</Text>
        </View>
        <View className="flex items-center gap-1.5">
          <View className="w-3 h-3 rounded-full bg-[#8EA584]" />
          <Text className="text-xs font-medium text-[#4A423B]">{t('analysis.napSleep')}</Text>
        </View>
        <View className="flex items-center gap-1.5">
          <View className="w-3 h-3 rounded-full bg-[#E5DFD8] border border-[#D8D2CB]" />
          <Text className="text-xs font-medium text-[#4A423B]">{t('analysis.awake')}</Text>
        </View>
      </View>
    </View>
  )
}

export function MoodCalendarCard({
  days,
  legends,
}: {
  days: MoodCalendarDay[]
  legends: MoodLegendItem[]
}) {
  // 情绪日历需要同时处理：
  // - 当前筛选项
  // - 筛选下拉是否展开
  // - 不同情绪对应的色板
  // 所以这里把交互状态和视觉映射都集中放在组件内部。
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'happy' | 'clingy' | 'discomfort'>('all')
  const [filterOpen, setFilterOpen] = useState(false)
  const weekdayLabels = weekdayLabelsMondayFirst()

  // 标题按本地日期算，不写死。原先是「2026/6 情绪日历」——下个月就变成错的，
  // 而且与后端返回的数据没有任何关系（日历渲染的就是当前月）。
  const now = new Date()
  const calendarTitle = t('mood.calendarTitle', {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  })

  const filterOptions = [
    { key: 'all', label: t('mood.filter.all') },
    { key: 'happy', label: t('mood.filter.happy') },
    { key: 'clingy', label: t('mood.filter.clingy') },
    { key: 'discomfort', label: t('mood.filter.discomfort') },
  ] as const

  const dayStyleMap = {
    happy: {
      bg: 'bg-[#EDF3E3]',
      text: 'text-[#66755E]',
      dot: 'bg-[#D1DBC2]',
      border: 'border-[#D7DFCF]',
    },
    clingy: {
      bg: 'bg-[#F3DFD8]',
      text: 'text-[#8F5A36]',
      dot: 'bg-[#D8A08A]',
      border: 'border-[#E5C0B5]',
    },
    discomfort: {
      bg: 'bg-[#EDF0F1]',
      text: 'text-[#677780]',
      dot: 'bg-[#97A8AF]',
      border: 'border-[#D7DEE1]',
    },
    empty: {
      bg: 'bg-[#F0EEEB]',
      text: 'text-[#C4BDB4]',
      dot: 'bg-transparent',
      border: 'border-transparent',
    },
  } as const

  return (
    <View className="w-full p-6 bg-card rounded-[32px] border border-[#E4DFD9] flex flex-col gap-4">
      <View className="flex items-start justify-between gap-3">
        <View>
          <Text className="block text-lg leading-8 font-semibold text-[#2E2822]">{calendarTitle}</Text>
          <Text className="block text-sm text-[#8C857D] mt-1">
            Click to view daily notes and AI diagnostics
          </Text>
        </View>
        <View className="relative">
          <View
            className="px-4 py-3 rounded-full inline-flex items-center justify-center gap-2 self-start"
            style={{ backgroundColor: analysisColors.iconBg }}
            onClick={() => setFilterOpen((current) => !current)}
          >
            <Text className="text-sm font-medium whitespace-nowrap" style={{ color: analysisColors.inactiveText }}>
              {filterOptions.find((option) => option.key === selectedFilter)?.label}
            </Text>
            <Text className="text-xs" style={{ color: analysisColors.inactiveText }}>{filterOpen ? '▴' : '▾'}</Text>
          </View>
          {filterOpen ? (
            <View
              className="absolute right-0 top-[52px] z-10 rounded-[20px] border bg-white shadow-lg overflow-hidden"
              style={{ borderColor: analysisColors.cardMutedBorder }}
            >
              {filterOptions.map((option) => (
                <View
                  key={option.key}
                  className="px-5 py-3 flex items-center justify-center"
                  style={{
                    backgroundColor: selectedFilter === option.key ? analysisColors.activeBg : '#FFFFFF',
                  }}
                  onClick={() => {
                    setSelectedFilter(option.key)
                    setFilterOpen(false)
                  }}
                >
                  <Text
                    className="text-sm whitespace-nowrap"
                    style={{
                      color: selectedFilter === option.key ? analysisColors.activeText : analysisColors.inactiveText,
                      fontWeight: selectedFilter === option.key ? 600 : 400,
                    }}
                  >
                    {option.label}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      </View>

      <View className="grid grid-cols-7 gap-2">
        {weekdayLabels.map((label) => (
          <Text key={label} className="text-center text-xs font-semibold text-[#8C857D]">
            {label}
          </Text>
        ))}

        {days.map((day) => {
          const matchesFilter =
            selectedFilter === 'all' || (day.type !== 'empty' && day.type === selectedFilter)

          if (!matchesFilter && day.type !== 'empty') {
            // 不匹配当前筛选时不直接隐藏，而是降透明度。
            // 这样用户还能感知“这个日期存在，只是暂时被过滤掉了”。
            return (
              <View
                key={`${day.day}-${day.type}`}
                className="h-12 rounded-[20px] border border-transparent bg-[#F5F2EE] flex items-center justify-center opacity-45"
              >
                <Text className="text-base font-bold text-[#CBC3BA]">{day.day}</Text>
              </View>
            )
          }

          // day.type 在后端是一个字符串，类型里那几个字面量只是我们的期望值。
          // 收到没见过的取值时 dayStyleMap[...] 是 undefined，紧接着取 .bg 就抛
          // TypeError——render 期间、没有错误边界，整页白屏。兜到 empty 上。
          const style = dayStyleMap[day.type] ?? dayStyleMap.empty

          return (
            <View
              key={`${day.day}-${day.type}`}
              // 高亮逻辑和情绪颜色一起收在日历单元格里，
              // 这样筛选态、普通态、被强调态都能在同一个节点上完成。
              className={`h-12 rounded-[20px] border flex flex-col items-center justify-center ${style.bg} ${style.border} ${
                day.highlighted ? 'shadow-sm' : ''
              }`}
            >
              <Text className={`text-base font-bold ${style.text}`}>{day.day}</Text>
              {day.type !== 'empty' ? <View className={`w-1.5 h-1.5 rounded-full mt-1 ${style.dot}`} /> : null}
            </View>
          )
        })}
      </View>

      <View className="pt-4 border-t border-[#E5DFD8] flex items-center gap-4 flex-wrap">
        {legends.map((legend) => (
          <View key={legend.label} className="flex items-center gap-2">
            <View className={`w-3 h-3 rounded-full ${legend.colorClass}`} />
            <Text className="text-xs font-semibold text-[#6F6760]">{legend.label}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

export function MoodCheckinCard({
  options,
  onSaved,
}: {
  options: MoodCheckinOption[]
  /** 打卡成功后的回调，交给页面去刷新日历 */
  onSaved?: () => void
}) {
  // 情绪打卡是一个小表单：选择情绪、填写备注，提交一次写一条记录。
  //
  // 备注初值刻意留空。原先这里预填了一段「今天抓着东西就咬，午睡比较短，傍晚想被抱着安抚。」
  // ——那是编出来的内容，却会以「用户自己写的手账」的样子出现在每个账号上。
  //
  // 选中项**不预设**。原先默认选中「黏人烦躁」，那是设计稿的静态样子；真做成表单后，
  // 默认选中意味着随手点提交就会记下一条用户没选过的情绪，属于脏数据。
  const [selectedKey, setSelectedKey] = useState<MoodCheckinOption['key'] | null>(null)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    // 连点保护：请求飞行期间不再受理第二次，否则会连写两条记录
    if (saving) return

    if (!selectedKey) {
      Taro.showToast({ title: t('mood.pickFirst'), icon: 'none' })
      return
    }

    setSaving(true)
    try {
      const response = await moodCheckin({
        mood: selectedKey,
        note: note.trim() || undefined,
      })

      if (response.code !== 0) throw new Error(response.message)

      Taro.showToast({ title: t('mood.recorded'), icon: 'none' })
      setSelectedKey(null)
      setNote('')
      onSaved?.()
    } catch (error) {
      console.error('[mood] 情绪打卡失败', error)
      Taro.showToast({ title: t('common.recordFailed'), icon: 'none' })
    } finally {
      // 成败都要放开，否则一次失败会让按钮永久失效
      setSaving(false)
    }
  }

  return (
    <View className="w-full p-4 bg-card rounded-[32px] border border-[#D8E2DB] flex flex-col gap-4">
      <View className="flex items-center justify-between gap-3">
        <View className="flex items-center gap-2">
          <Icon name="more" className="w-5 h-5" />
          <Text className="text-lg leading-8 font-semibold text-[#2E2822]">{t('mood.checkin')}</Text>
        </View>
        <Text className="text-sm text-[#8C857D]">{t('mood.checkinHint')}</Text>
      </View>

      <View className="grid grid-cols-3 gap-3">
        {options.map((option) => {
          const isActive = option.key === selectedKey

          return (
            <View
              key={option.key}
              className="rounded-[28px] px-3 py-4 flex flex-col items-center gap-3 border"
              style={{
                backgroundColor: isActive ? option.activeBg : option.inactiveBg,
                borderColor: isActive ? option.activeColor : '#ebe7e1',
              }}
              onClick={() => setSelectedKey(option.key)}
            >
              <View
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ backgroundColor: isActive ? 'rgba(255,255,255,0.8)' : analysisColors.iconBg }}
              >
                <Icon
                  name={option.icon}
                  className="w-8 h-8"
                  style={{ opacity: isActive ? 1 : 0.6 }}
                />
              </View>
              <Text
                className="text-sm font-semibold"
                style={{ color: isActive ? option.activeColor : '#5f5a53' }}
              >
                {option.label}
              </Text>
            </View>
          )
        })}
      </View>

      <View className="flex flex-col gap-2">
        <Text className="text-base font-semibold text-[#5F5A53]">{t('mood.noteLabel')}</Text>
        <View className="rounded-[28px] bg-[#F4F1EC] p-4">
          <Textarea
            className="w-full min-h-[96px] text-sm leading-5 text-[#2E2822]"
            value={note}
            maxlength={160}
            placeholder={t('mood.notePlaceholder')}
            placeholderClass="text-[#A9A29B]"
            onInput={(event) => setNote(event.detail.value)}
          />
        </View>
      </View>

      {/* 提交按钮。此前这里有一个「同步到 AI 情绪日历」的按钮，只改本地一个标志、
          不发任何请求；后端当时也没有 /api/baby/mood/checkin。端点补齐后按真实契约接上：
          提交 → 写一条 mood_entries → 回调让页面刷新日历。 */}
      <View
        className={`w-full py-4 rounded-full flex items-center justify-center bg-tertiary ${
          saving ? 'opacity-60' : 'active:opacity-80'
        }`}
        onClick={submit}
      >
        <Text className="text-base text-[#ffffff] font-semibold">
          {saving ? t('common.saving') : t('mood.submit')}
        </Text>
      </View>
    </View>
  )
}
