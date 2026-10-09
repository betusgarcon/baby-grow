import { useMemo, useState } from 'react'
import { View, Text, Picker } from '@tarojs/components'
import PageContainer from '@/components/PageContainer'
import PageHeader from '@/components/PageHeader'
import EmptyState from '@/components/EmptyState'
import Icon from '@/components/Icon'
import { navigateToRoute } from '@/utils/routes'
import CalendarGrid from './components/CalendarGrid'
import HighlightCard from './components/HighlightCard'
import {
  buildMonthGrid,
  calendarEvents,
  eventsForDate,
  formatDayHeading,
  formatMonthLabel,
  monthLabels,
  toIsoDate,
  yearOptions,
} from './calendarData'

const INITIAL_YEAR = 2023
const INITIAL_MONTH = 10
const INITIAL_DATE = '2023-10-10'

export default function JourneyCalendarPage() {
  const [year, setYear] = useState(INITIAL_YEAR)
  const [month, setMonth] = useState(INITIAL_MONTH)
  const [selectedDate, setSelectedDate] = useState(INITIAL_DATE)

  const cells = useMemo(
    () => buildMonthGrid(year, month, selectedDate, calendarEvents),
    [year, month, selectedDate],
  )

  const dayEvents = useMemo(() => eventsForDate(calendarEvents, selectedDate), [selectedDate])

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
      header={
        <PageHeader
          showBack
          title="Journey"
          right={<Icon name="calendar" className="w-5 h-5" style={{ opacity: 0.3 }} />}
        />
      }
    >
      <View className="flex flex-col gap-6">
        {/* 月份控件：左右箭头各换一个月，中间文字点开年月选择器。
            箭头不能放进 Picker 内部，否则点箭头会连带把选择器一起弹出来。 */}
        <View className="w-full box-border h-14 px-4 rounded-full bg-surface-container-low border border-outline-variant flex items-center justify-between">
          <View className="w-9 h-9 flex items-center justify-center" onClick={() => shiftMonth(-1)}>
            <Icon name="chevron-right" className="w-2 h-3" style={{ transform: 'rotate(180deg)' }} />
          </View>

          <Picker
            mode="multiSelector"
            range={[monthLabels, yearOptions]}
            value={[month - 1, Math.max(yearOptions.indexOf(String(year)), 0)]}
            onChange={(event) => {
              const [monthIndex, yearIndex] = event.detail.value

              applyMonth(Number(yearOptions[yearIndex]), monthIndex + 1)
            }}
          >
            <View className="flex-1 h-full flex items-center justify-center">
              <Text className="text-lg font-semibold text-on-surface">
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
            className="text-sm font-semibold text-on-surface-variant px-1"
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
              title="Nothing on this day"
              description="No vaccines or milestones were recorded for the selected date."
            />
          )}
        </View>
      </View>
    </PageContainer>
  )
}
