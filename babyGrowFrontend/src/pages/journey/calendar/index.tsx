import { useEffect, useMemo, useState } from 'react'
import { View, Text, Picker } from '@tarojs/components'
import PageContainer from '@/components/PageContainer'
import PageHeader from '@/components/PageHeader'
import AsyncSection from '@/components/AsyncSection'
import EmptyState from '@/components/EmptyState'
import Icon from '@/components/Icon'
import { navigateToRoute } from '@/utils/routes'
import { useAppState, loadCalendarEvents } from '@/store'
import { t } from '@/i18n'
import CalendarGrid from './components/CalendarGrid'
import HighlightCard from './components/HighlightCard'
import {
  buildMonthGrid,
  eventsForDate,
  formatDayHeading,
  formatMonthLabel,
  monthLabels,
  toIsoDate,
  yearOptions,
} from './calendarData'

/** 默认落在当月今天。记录事件的日期也是相对今天生成的，两边才对得上 */
const TODAY = new Date()
const INITIAL_YEAR = TODAY.getFullYear()
const INITIAL_MONTH = TODAY.getMonth() + 1
const INITIAL_DATE = toIsoDate(INITIAL_YEAR, INITIAL_MONTH, TODAY.getDate())

export default function JourneyCalendarPage() {
  const [year, setYear] = useState(INITIAL_YEAR)
  const [month, setMonth] = useState(INITIAL_MONTH)
  // 事件来自 store：与首页的成长记录同一数据源
  const { calendarEvents, status } = useAppState()
  const [selectedDate, setSelectedDate] = useState(INITIAL_DATE)

  useEffect(() => {
    loadCalendarEvents()
  }, [])

  // 依赖里必须有 calendarEvents。
  //
  // 这个页面是在 store 还处于 loading（calendarEvents 为 []）时就挂载并算出第一份
  // 结果的；漏掉这个依赖，等接口回来把数组填上时这两个 memo 都不会重算——
  // 表现是「冷启动进日历，格子上一个圆点都没有，选中的那天写着 Nothing on this day」，
  // 而随手点一下别的日期又突然正常了（因为 selectedDate 变了才触发重算）。
  const cells = useMemo(
    () => buildMonthGrid(year, month, selectedDate, calendarEvents),
    [year, month, selectedDate, calendarEvents],
  )

  const dayEvents = useMemo(
    () => eventsForDate(calendarEvents, selectedDate),
    [calendarEvents, selectedDate],
  )

  /** 切到指定年月，并把选中日期落到该月 1 号，避免停在当月不存在的日期上 */
  const applyMonth = (nextYear: number, nextMonth: number) => {
    setYear(nextYear)
    setMonth(nextMonth)
    setSelectedDate(toIsoDate(nextYear, nextMonth, 1))
  }

  const shiftMonth = (delta: number) => {
    const next = new Date(year, month - 1 + delta, 1)

    applyMonth(next.getFullYear(), next.getMonth() + 1)
  }

  return (
    <PageContainer
      background="bg-surface-container-lowest"
      header={<PageHeader showBack title={t('calendar.title')} />}
    >
      <AsyncSection status={status.calendar} onRetry={loadCalendarEvents} skeletonBlocks={2} skeletonHeight={200}>
      <View className="flex flex-col gap-6">
        {/* 月份控件：左右箭头各换一个月，中间文字点开年月选择器。
            箭头不能放进 Picker 内部，否则点箭头会连带把选择器一起弹出来。 */}
        <View className="w-full box-border h-14 px-4 rounded-full bg-surface-container-low border border-outline-variant flex items-center justify-between">
          <View className="w-9 h-9 flex items-center justify-center" onClick={() => shiftMonth(-1)}>
            <Icon name="chevron-right" className="w-2 h-3" style={{ transform: 'rotate(180deg)' }} />
          </View>

          <Picker
            mode="multiSelector"
            range={[monthLabels(), yearOptions]}
            value={[month - 1, Math.max(yearOptions.indexOf(String(year)), 0)]}
            onChange={(event) => {
              const [monthIndex, yearIndex] = event.detail.value

              applyMonth(Number(yearOptions[yearIndex]), monthIndex + 1)
            }}
          >
            <View className="flex-1 h-full flex items-center justify-center">
              <Text className="text-section-title text-on-surface">
                {formatMonthLabel(year, month)}
              </Text>
            </View>
          </Picker>

          <View className="w-9 h-9 flex items-center justify-center" onClick={() => shiftMonth(1)}>
            <Icon name="chevron-right" className="w-2 h-3" />
          </View>
        </View>

        <CalendarGrid cells={cells} onSelectDate={setSelectedDate} />

        <View className="flex flex-col gap-3">
          <Text
            className="text-label font-medium text-on-surface-variant px-1"
            style={{ letterSpacing: '0.06em' }}
          >
            {formatDayHeading(selectedDate)}
          </Text>

          {dayEvents.length > 0 ? (
            <View className="flex flex-col gap-3">
              {dayEvents.map((event) => (
                <HighlightCard
                  key={event.id}
                  event={event}
                  onClick={() => navigateToRoute(event.route)}
                />
              ))}
            </View>
          ) : (
            <EmptyState
              icon="calendar"
              title={t('calendar.empty')}
              description={t('calendar.emptyDesc')}
            />
          )}
        </View>
      </View>
      </AsyncSection>
    </PageContainer>
  )
}
